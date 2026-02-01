"""
GDPR-Compliant Backup Encryption Service
Enhanced backup encryption specifically designed for GDPR compliance requirements.
Integrates with existing disaster recovery system while adding encryption and key management.
"""

import asyncio
import json
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class EncryptionAlgorithm(str, Enum):
    """Supported encryption algorithms"""
    AES_256_GCM = "AES-256-GCM"
    AES_256_CBC = "AES-256-CBC"
    CHACHA20_POLY1305 = "ChaCha20-Poly1305"


class KeyRotationPolicy(str, Enum):
    """Key rotation policies"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ON_DEMAND = "on_demand"


@dataclass
class EncryptionKeyMetadata:
    """Encryption key metadata for GDPR compliance"""
    key_id: str
    algorithm: EncryptionAlgorithm
    created_at: datetime
    expires_at: datetime
    rotation_policy: KeyRotationPolicy
    gdpr_purpose: str  # Purpose for key usage under GDPR
    data_categories: List[str]  # Categories of data encrypted with this key
    is_active: bool = True
    previous_key_id: Optional[str] = None


@dataclass
class EncryptedBackup:
    """Encrypted backup file information"""
    backup_id: str
    original_path: str
    encrypted_path: str
    encryption_key_id: str
    algorithm: EncryptionAlgorithm
    checksum: str
    created_at: datetime
    size_original: int
    size_encrypted: int
    gdpr_retention_period: int  # Days to retain backup
    data_subjects_count: Optional[int] = None  # Number of users affected


class GDPRBackupEncryptionService:
    """GDPR-compliant backup encryption service with key management"""

    def __init__(self):
        self.encryption_base_path = Path(settings.BACKUP_ENCRYPTION_PATH if hasattr(settings, 'BACKUP_ENCRYPTION_PATH') else "/tmp/encrypted_backups")
        self.encryption_base_path.mkdir(parents=True, exist_ok=True)

        self.keys_path = self.encryption_base_path / "keys"
        self.keys_path.mkdir(exist_ok=True)

        self.backups_path = self.encryption_base_path / "backups"
        self.backups_path.mkdir(exist_ok=True)

        # GDPR data retention policies for different backup types
        self.gdpr_retention_policies = {
            "user_personal_data": 2555,  # 7 years
            "financial_records": 2555,   # 7 years
            "medical_records": 3650,     # 10 years
            "communication_logs": 730,   # 2 years
            "system_logs": 365,          # 1 year
            "audit_trails": 2555         # 7 years (legal requirement)
        }

        # Initialize master encryption key
        self._initialize_master_key()

        # Active encryption keys
        self.active_keys: Dict[str, EncryptionKeyMetadata] = {}

    def _initialize_master_key(self):
        """Initialize master key for key encryption"""
        master_key_file = self.keys_path / ".master.key"

        try:
            if master_key_file.exists():
                with open(master_key_file, 'rb') as f:
                    self.master_key = f.read()
                logger.info("Master encryption key loaded")
            else:
                # Generate new master key
                self.master_key = secrets.token_bytes(32)  # 256-bit key

                with open(master_key_file, 'wb') as f:
                    f.write(self.master_key)

                os.chmod(master_key_file, 0o600)  # Restrict access
                logger.info("New master encryption key generated")

        except Exception as e:
            logger.error(f"Failed to initialize master key: {e}")
            raise

    async def create_encryption_key(
        self,
        algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
        rotation_policy: KeyRotationPolicy = KeyRotationPolicy.QUARTERLY,
        gdpr_purpose: str = "backup_encryption",
        data_categories: List[str] = None
    ) -> EncryptionKeyMetadata:
        """
        Create new encryption key for GDPR-compliant backup encryption

        Args:
            algorithm: Encryption algorithm to use
            rotation_policy: Key rotation schedule
            gdpr_purpose: GDPR purpose for key usage
            data_categories: Categories of data to encrypt with this key

        Returns:
            EncryptionKeyMetadata object
        """
        try:
            key_id = f"key_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{secrets.token_hex(4)}"

            # Generate encryption key based on algorithm
            if algorithm == EncryptionAlgorithm.AES_256_GCM:
                encryption_key = secrets.token_bytes(32)  # 256-bit key
            elif algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
                encryption_key = secrets.token_bytes(32)  # 256-bit key
            else:
                raise ValueError(f"Unsupported encryption algorithm: {algorithm}")

            # Calculate expiration based on rotation policy
            rotation_days = {
                KeyRotationPolicy.MONTHLY: 30,
                KeyRotationPolicy.QUARTERLY: 90,
                KeyRotationPolicy.ANNUALLY: 365,
                KeyRotationPolicy.ON_DEMAND: 9999  # Very long expiration for manual rotation
            }

            expires_at = datetime.now(timezone.utc) + timedelta(days=rotation_days[rotation_policy])

            # Create key metadata
            key_metadata = EncryptionKeyMetadata(
                key_id=key_id,
                algorithm=algorithm,
                created_at=datetime.now(timezone.utc),
                expires_at=expires_at,
                rotation_policy=rotation_policy,
                gdpr_purpose=gdpr_purpose,
                data_categories=data_categories or []
            )

            # Encrypt and store the key
            encrypted_key = self._encrypt_key_with_master(encryption_key)
            key_file = self.keys_path / f"{key_id}.key"

            with open(key_file, 'wb') as f:
                f.write(encrypted_key)

            os.chmod(key_file, 0o600)

            # Store key metadata
            metadata_file = self.keys_path / f"{key_id}.meta"
            with open(metadata_file, 'w') as f:
                json.dump(asdict(key_metadata), f, default=str, indent=2)

            self.active_keys[key_id] = key_metadata

            logger.info(f"Encryption key created: {key_id} ({algorithm.value})")
            return key_metadata

        except Exception as e:
            logger.error(f"Failed to create encryption key: {e}")
            raise

    async def encrypt_backup(
        self,
        backup_file_path: str,
        data_category: str = "user_personal_data",
        data_subjects_count: Optional[int] = None,
        encryption_key_id: Optional[str] = None
    ) -> EncryptedBackup:
        """
        Encrypt backup file with GDPR-compliant encryption

        Args:
            backup_file_path: Path to backup file to encrypt
            data_category: GDPR data category for retention policy
            data_subjects_count: Number of data subjects in backup
            encryption_key_id: Specific key to use (optional)

        Returns:
            EncryptedBackup object with encryption details
        """
        backup_id = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{secrets.token_hex(4)}"
        logger.info(f"Starting backup encryption: {backup_id}")

        try:
            # Get or create appropriate encryption key
            if encryption_key_id:
                if encryption_key_id not in self.active_keys:
                    raise ValueError(f"Encryption key not found: {encryption_key_id}")
                key_metadata = self.active_keys[encryption_key_id]
            else:
                # Find appropriate key for data category or create new one
                suitable_key = self._find_suitable_key(data_category)
                if not suitable_key:
                    suitable_key = await self.create_encryption_key(
                        gdpr_purpose=f"encrypt_{data_category}",
                        data_categories=[data_category]
                    )
                key_metadata = suitable_key
                encryption_key_id = key_metadata.key_id

            # Load encryption key
            encryption_key = self._load_encryption_key(encryption_key_id)

            # Calculate original file size and checksum
            original_size = os.path.getsize(backup_file_path)
            original_checksum = await self._calculate_file_checksum(backup_file_path)

            # Encrypt the backup file
            encrypted_filename = f"{backup_id}.enc"
            encrypted_path = self.backups_path / encrypted_filename

            await self._encrypt_file(
                backup_file_path,
                str(encrypted_path),
                encryption_key,
                key_metadata.algorithm
            )

            encrypted_size = os.path.getsize(encrypted_path)

            # Create encrypted backup metadata
            encrypted_backup = EncryptedBackup(
                backup_id=backup_id,
                original_path=backup_file_path,
                encrypted_path=str(encrypted_path),
                encryption_key_id=encryption_key_id,
                algorithm=key_metadata.algorithm,
                checksum=original_checksum,
                created_at=datetime.now(timezone.utc),
                size_original=original_size,
                size_encrypted=encrypted_size,
                gdpr_retention_period=self.gdpr_retention_policies.get(data_category, 2555),
                data_subjects_count=data_subjects_count
            )

            # Store backup metadata
            await self._store_backup_metadata(encrypted_backup)

            compression_ratio = encrypted_size / original_size if original_size > 0 else 1
            logger.info(f"Backup encryption completed: {backup_id} (compression: {compression_ratio:.2f})")

            return encrypted_backup

        except Exception as e:
            logger.error(f"Backup encryption failed: {backup_id} - {e}")
            raise

    async def decrypt_backup(self, backup_id: str, output_path: Optional[str] = None) -> str:
        """
        Decrypt backup file for restoration

        Args:
            backup_id: ID of the encrypted backup
            output_path: Optional output path for decrypted file

        Returns:
            Path to decrypted file
        """
        logger.info(f"Starting backup decryption: {backup_id}")

        try:
            # Load backup metadata
            backup_metadata = await self._load_backup_metadata(backup_id)
            if not backup_metadata:
                raise ValueError(f"Backup not found: {backup_id}")

            # Verify backup integrity
            if not os.path.exists(backup_metadata.encrypted_path):
                raise ValueError(f"Encrypted backup file not found: {backup_metadata.encrypted_path}")

            # Load encryption key
            encryption_key = self._load_encryption_key(backup_metadata.encryption_key_id)

            # Determine output path
            if not output_path:
                output_path = str(self.backups_path / f"{backup_id}_decrypted.json")

            # Decrypt the file
            await self._decrypt_file(
                backup_metadata.encrypted_path,
                output_path,
                encryption_key,
                backup_metadata.algorithm
            )

            # Verify decrypted file checksum
            decrypted_checksum = await self._calculate_file_checksum(output_path)
            if decrypted_checksum != backup_metadata.checksum:
                raise ValueError("Backup integrity check failed after decryption")

            logger.info(f"Backup decryption completed: {backup_id} -> {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Backup decryption failed: {backup_id} - {e}")
            raise

    async def rotate_keys(self) -> List[EncryptionKeyMetadata]:
        """
        Rotate encryption keys based on their rotation policies

        Returns:
            List of newly created keys
        """
        logger.info("Starting encryption key rotation")

        try:
            new_keys = []
            current_time = datetime.now(timezone.utc)

            for key_id, key_metadata in self.active_keys.items():
                if current_time >= key_metadata.expires_at and key_metadata.is_active:
                    logger.info(f"Rotating expired key: {key_id}")

                    # Create new key with same configuration
                    new_key = await self.create_encryption_key(
                        algorithm=key_metadata.algorithm,
                        rotation_policy=key_metadata.rotation_policy,
                        gdpr_purpose=key_metadata.gdpr_purpose,
                        data_categories=key_metadata.data_categories
                    )

                    # Link to previous key
                    new_key.previous_key_id = key_id

                    # Mark old key as inactive
                    key_metadata.is_active = False

                    # Update metadata file
                    metadata_file = self.keys_path / f"{key_id}.meta"
                    with open(metadata_file, 'w') as f:
                        json.dump(asdict(key_metadata), f, default=str, indent=2)

                    new_keys.append(new_key)

            if new_keys:
                logger.info(f"Key rotation completed: {len(new_keys)} keys rotated")
            else:
                logger.info("Key rotation completed: No keys required rotation")

            return new_keys

        except Exception as e:
            logger.error(f"Key rotation failed: {e}")
            raise

    async def cleanup_expired_backups(self) -> Dict[str, Any]:
        """
        Clean up backups that have exceeded their GDPR retention period

        Returns:
            Cleanup summary
        """
        logger.info("Starting expired backup cleanup")

        try:
            cleanup_summary = {
                "cleanup_date": datetime.now(timezone.utc).isoformat(),
                "backups_deleted": 0,
                "space_freed_bytes": 0,
                "retention_violations": [],
                "errors": []
            }

            # Get all backup metadata files
            metadata_files = list(self.backups_path.glob("*.meta"))

            for meta_file in metadata_files:
                try:
                    with open(meta_file, 'r') as f:
                        backup_data = json.load(f)

                    backup_metadata = EncryptedBackup(**{
                        k: datetime.fromisoformat(v) if k == 'created_at' else v
                        for k, v in backup_data.items()
                    })

                    # Check if backup has exceeded retention period
                    retention_end = backup_metadata.created_at + timedelta(days=backup_metadata.gdpr_retention_period)
                    current_time = datetime.now(timezone.utc)

                    if current_time > retention_end:
                        # Backup has exceeded GDPR retention period - must be deleted
                        logger.info(f"Deleting expired backup: {backup_metadata.backup_id}")

                        # Delete encrypted backup file
                        if os.path.exists(backup_metadata.encrypted_path):
                            file_size = os.path.getsize(backup_metadata.encrypted_path)
                            os.remove(backup_metadata.encrypted_path)
                            cleanup_summary["space_freed_bytes"] += file_size

                        # Delete metadata file
                        os.remove(meta_file)

                        cleanup_summary["backups_deleted"] += 1

                    elif current_time > (retention_end - timedelta(days=30)):
                        # Backup will expire within 30 days - log warning
                        days_until_expiry = (retention_end - current_time).days
                        cleanup_summary["retention_violations"].append({
                            "backup_id": backup_metadata.backup_id,
                            "days_until_expiry": days_until_expiry,
                            "retention_category": backup_data.get("data_category", "unknown")
                        })

                except Exception as file_error:
                    error_msg = f"Failed to process backup metadata {meta_file}: {str(file_error)}"
                    logger.error(error_msg)
                    cleanup_summary["errors"].append(error_msg)

            logger.info(f"Backup cleanup completed: {cleanup_summary['backups_deleted']} backups deleted")
            return cleanup_summary

        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            raise

    async def get_encryption_status(self) -> Dict[str, Any]:
        """
        Get comprehensive encryption and backup status

        Returns:
            Status report including key information, backup counts, etc.
        """
        try:
            status_report = {
                "status_date": datetime.now(timezone.utc).isoformat(),
                "encryption_keys": {
                    "total_keys": len(self.active_keys),
                    "active_keys": len([k for k in self.active_keys.values() if k.is_active]),
                    "expired_keys": len([k for k in self.active_keys.values() if not k.is_active]),
                    "keys_needing_rotation": []
                },
                "encrypted_backups": {
                    "total_backups": 0,
                    "total_size_bytes": 0,
                    "by_category": {},
                    "upcoming_expirations": []
                },
                "gdpr_compliance": {
                    "retention_policies": self.gdpr_retention_policies,
                    "key_rotation_status": "compliant"
                }
            }

            # Analyze encryption keys
            current_time = datetime.now(timezone.utc)
            for key_id, key_metadata in self.active_keys.items():
                if key_metadata.is_active and current_time >= (key_metadata.expires_at - timedelta(days=7)):
                    status_report["encryption_keys"]["keys_needing_rotation"].append({
                        "key_id": key_id,
                        "expires_at": key_metadata.expires_at.isoformat(),
                        "days_until_expiry": (key_metadata.expires_at - current_time).days
                    })

            # Analyze encrypted backups
            metadata_files = list(self.backups_path.glob("*.meta"))
            for meta_file in metadata_files:
                try:
                    with open(meta_file, 'r') as f:
                        backup_data = json.load(f)

                    status_report["encrypted_backups"]["total_backups"] += 1
                    status_report["encrypted_backups"]["total_size_bytes"] += backup_data.get("size_encrypted", 0)

                    # Count by category
                    category = backup_data.get("data_category", "unknown")
                    if category not in status_report["encrypted_backups"]["by_category"]:
                        status_report["encrypted_backups"]["by_category"][category] = 0
                    status_report["encrypted_backups"]["by_category"][category] += 1

                    # Check for upcoming expirations
                    created_at = datetime.fromisoformat(backup_data["created_at"])
                    retention_days = backup_data.get("gdpr_retention_period", 2555)
                    expiry_date = created_at + timedelta(days=retention_days)

                    if current_time <= expiry_date <= (current_time + timedelta(days=30)):
                        status_report["encrypted_backups"]["upcoming_expirations"].append({
                            "backup_id": backup_data["backup_id"],
                            "expires_at": expiry_date.isoformat(),
                            "days_until_expiry": (expiry_date - current_time).days
                        })

                except Exception as file_error:
                    logger.warning(f"Could not analyze backup metadata {meta_file}: {file_error}")

            return status_report

        except Exception as e:
            logger.error(f"Failed to get encryption status: {e}")
            raise

    # Private helper methods

    def _encrypt_key_with_master(self, key_data: bytes) -> bytes:
        """Encrypt encryption key with master key using AES-GCM"""
        iv = secrets.token_bytes(12)  # 96-bit IV for GCM
        cipher = Cipher(algorithms.AES(self.master_key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(key_data) + encryptor.finalize()
        return iv + encryptor.tag + ciphertext

    def _decrypt_key_with_master(self, encrypted_data: bytes) -> bytes:
        """Decrypt encryption key with master key using AES-GCM"""
        iv = encrypted_data[:12]
        tag = encrypted_data[12:28]
        ciphertext = encrypted_data[28:]
        cipher = Cipher(algorithms.AES(self.master_key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        return decryptor.update(ciphertext) + decryptor.finalize()

    def _find_suitable_key(self, data_category: str) -> Optional[EncryptionKeyMetadata]:
        """Find suitable active encryption key for data category"""
        for key_metadata in self.active_keys.values():
            if (key_metadata.is_active and
                data_category in key_metadata.data_categories and
                datetime.now(timezone.utc) < key_metadata.expires_at):
                return key_metadata
        return None

    def _load_encryption_key(self, key_id: str) -> bytes:
        """Load and decrypt encryption key"""
        key_file = self.keys_path / f"{key_id}.key"
        if not key_file.exists():
            raise ValueError(f"Encryption key file not found: {key_id}")

        with open(key_file, 'rb') as f:
            encrypted_key = f.read()

        return self._decrypt_key_with_master(encrypted_key)

    async def _encrypt_file(self, input_path: str, output_path: str, key: bytes, algorithm: EncryptionAlgorithm):
        """Encrypt file using specified algorithm"""
        if algorithm == EncryptionAlgorithm.AES_256_GCM:
            await self._encrypt_file_aes_gcm(input_path, output_path, key)
        elif algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
            await self._encrypt_file_chacha20(input_path, output_path, key)
        else:
            raise ValueError(f"Unsupported encryption algorithm: {algorithm}")

    async def _decrypt_file(self, input_path: str, output_path: str, key: bytes, algorithm: EncryptionAlgorithm):
        """Decrypt file using specified algorithm"""
        if algorithm == EncryptionAlgorithm.AES_256_GCM:
            await self._decrypt_file_aes_gcm(input_path, output_path, key)
        elif algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
            await self._decrypt_file_chacha20(input_path, output_path, key)
        else:
            raise ValueError(f"Unsupported decryption algorithm: {algorithm}")

    async def _encrypt_file_aes_gcm(self, input_path: str, output_path: str, key: bytes):
        """Encrypt file using AES-256-GCM"""
        iv = secrets.token_bytes(12)  # 96-bit IV for GCM
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()

        with open(input_path, 'rb') as infile, open(output_path, 'wb') as outfile:
            # Write IV first
            outfile.write(iv)

            # Encrypt in chunks
            while chunk := infile.read(8192):
                encrypted_chunk = encryptor.update(chunk)
                outfile.write(encrypted_chunk)

            # Finalize and write tag
            encryptor.finalize()
            outfile.write(encryptor.tag)

    async def _decrypt_file_aes_gcm(self, input_path: str, output_path: str, key: bytes):
        """Decrypt file using AES-256-GCM"""
        with open(input_path, 'rb') as infile:
            iv = infile.read(12)  # Read IV
            file_content = infile.read()
            tag = file_content[-16:]  # Last 16 bytes are the tag
            ciphertext = file_content[:-16]

        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()

        with open(output_path, 'wb') as outfile:
            # Decrypt in chunks
            chunk_size = 8192
            for i in range(0, len(ciphertext), chunk_size):
                chunk = ciphertext[i:i+chunk_size]
                decrypted_chunk = decryptor.update(chunk)
                outfile.write(decrypted_chunk)

            decryptor.finalize()

    async def _encrypt_file_chacha20(self, input_path: str, output_path: str, key: bytes):
        """Encrypt file using ChaCha20-Poly1305"""
        from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

        chacha = ChaCha20Poly1305(key)
        nonce = secrets.token_bytes(12)

        with open(input_path, 'rb') as infile:
            data = infile.read()

        ciphertext = chacha.encrypt(nonce, data, None)

        with open(output_path, 'wb') as outfile:
            outfile.write(nonce)
            outfile.write(ciphertext)

    async def _decrypt_file_chacha20(self, input_path: str, output_path: str, key: bytes):
        """Decrypt file using ChaCha20-Poly1305"""
        from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

        chacha = ChaCha20Poly1305(key)

        with open(input_path, 'rb') as infile:
            nonce = infile.read(12)
            ciphertext = infile.read()

        plaintext = chacha.decrypt(nonce, ciphertext, None)

        with open(output_path, 'wb') as outfile:
            outfile.write(plaintext)

    async def _calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA-256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    async def _store_backup_metadata(self, backup: EncryptedBackup):
        """Store encrypted backup metadata"""
        metadata_file = self.backups_path / f"{backup.backup_id}.meta"
        with open(metadata_file, 'w') as f:
            json.dump(asdict(backup), f, default=str, indent=2)

    async def _load_backup_metadata(self, backup_id: str) -> Optional[EncryptedBackup]:
        """Load encrypted backup metadata"""
        metadata_file = self.backups_path / f"{backup_id}.meta"
        if not metadata_file.exists():
            return None

        with open(metadata_file, 'r') as f:
            backup_data = json.load(f)

        return EncryptedBackup(**{
            k: datetime.fromisoformat(v) if k == 'created_at' else v
            for k, v in backup_data.items()
        })


# Global backup encryption service instance
backup_encryption_service = GDPRBackupEncryptionService()