"""
Multi-Factor Authentication Service
Implements TOTP support with backup codes and QR generation
"""

import os
import pyotp
import qrcode
import io
import base64
import secrets
import hashlib
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass
from app.core.logging import get_logger
from app.services.database import DatabaseService

logger = get_logger(__name__)

@dataclass
class MFASetup:
    """MFA setup information"""
    user_id: str
    secret: str
    qr_code: str
    backup_codes: List[str]
    setup_token: str

@dataclass
class MFAStatus:
    """User's MFA status"""
    enabled: bool
    backup_codes_remaining: int
    last_used: Optional[datetime] = None
    setup_date: Optional[datetime] = None

class MFAService:
    """Multi-Factor Authentication service with TOTP and backup codes"""

    def __init__(self):
        self.app_name = os.getenv('MFA_APP_NAME', 'Wheels & Wins')
        self.issuer = os.getenv('MFA_ISSUER', 'wheelsandwins.com')
        self.backup_code_count = int(os.getenv('MFA_BACKUP_CODE_COUNT', '8'))
        self.backup_code_length = int(os.getenv('MFA_BACKUP_CODE_LENGTH', '8'))
        self.setup_token_validity_hours = 1

    async def setup_mfa_for_user(self, user_id: str, user_email: str) -> MFASetup:
        """Setup MFA for a user - generates secret, QR code, and backup codes"""
        try:
            # Generate TOTP secret
            secret = pyotp.random_base32()

            # Create TOTP URI
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user_email,
                issuer_name=self.issuer
            )

            # Generate QR code
            qr_code = self._generate_qr_code(totp_uri)

            # Generate backup codes
            backup_codes = self._generate_backup_codes()

            # Generate setup token (for verification before enabling)
            setup_token = self._generate_setup_token(user_id, secret)

            # Store MFA setup data temporarily (not enabled yet)
            await self._store_mfa_setup(user_id, secret, backup_codes, setup_token)

            logger.info(f"✅ MFA setup prepared for user {user_id}")

            return MFASetup(
                user_id=user_id,
                secret=secret,
                qr_code=qr_code,
                backup_codes=backup_codes,
                setup_token=setup_token
            )

        except Exception as e:
            logger.error(f"❌ MFA setup failed for user {user_id}: {e}")
            raise

    async def verify_and_enable_mfa(self, user_id: str, setup_token: str, totp_code: str) -> bool:
        """Verify TOTP code and enable MFA for user"""
        try:
            supabase = DatabaseService().client

            # Get pending MFA setup
            setup_result = supabase.table('user_mfa_setup').select('*').eq('user_id', user_id).eq('setup_token', setup_token).execute()

            if not setup_result.data:
                logger.warning(f"Invalid or expired MFA setup token for user {user_id}")
                return False

            setup_data = setup_result.data[0]

            # Check token expiry
            setup_time = datetime.fromisoformat(setup_data['created_at'].replace('Z', '+00:00'))
            if (datetime.now(timezone.utc) - setup_time).total_seconds() > self.setup_token_validity_hours * 3600:
                logger.warning(f"Expired MFA setup token for user {user_id}")
                return False

            # Verify TOTP code
            secret = setup_data['secret']
            if not self._verify_totp_code(secret, totp_code):
                logger.warning(f"Invalid TOTP code during MFA setup for user {user_id}")
                return False

            # Enable MFA
            mfa_data = {
                'user_id': user_id,
                'secret': secret,
                'backup_codes': setup_data['backup_codes'],
                'enabled': True,
                'setup_date': datetime.now(timezone.utc).isoformat()
            }

            # Store MFA configuration
            supabase.table('user_mfa').upsert(mfa_data).execute()

            # Clean up setup data
            supabase.table('user_mfa_setup').delete().eq('user_id', user_id).execute()

            logger.info(f"✅ MFA enabled for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"❌ MFA verification failed for user {user_id}: {e}")
            return False

    async def verify_mfa(self, user_id: str, code: str) -> Dict[str, Any]:
        """Verify MFA code (TOTP or backup code)"""
        try:
            supabase = DatabaseService().client

            # Get user's MFA data
            mfa_result = supabase.table('user_mfa').select('*').eq('user_id', user_id).eq('enabled', True).execute()

            if not mfa_result.data:
                return {'success': False, 'error': 'MFA not enabled'}

            mfa_data = mfa_result.data[0]

            # Try TOTP verification first
            if self._verify_totp_code(mfa_data['secret'], code):
                # Update last used timestamp
                supabase.table('user_mfa').update({
                    'last_used': datetime.now(timezone.utc).isoformat()
                }).eq('user_id', user_id).execute()

                return {
                    'success': True,
                    'method': 'totp',
                    'backup_codes_remaining': len(mfa_data.get('backup_codes', []))
                }

            # Try backup code verification
            backup_codes = mfa_data.get('backup_codes', [])
            code_hash = self._hash_backup_code(code)

            if code_hash in backup_codes:
                # Remove used backup code
                backup_codes.remove(code_hash)

                supabase.table('user_mfa').update({
                    'backup_codes': backup_codes,
                    'last_used': datetime.now(timezone.utc).isoformat()
                }).eq('user_id', user_id).execute()

                logger.info(f"🔑 Backup code used for user {user_id}, {len(backup_codes)} remaining")

                return {
                    'success': True,
                    'method': 'backup_code',
                    'backup_codes_remaining': len(backup_codes)
                }

            return {'success': False, 'error': 'Invalid code'}

        except Exception as e:
            logger.error(f"❌ MFA verification error for user {user_id}: {e}")
            return {'success': False, 'error': 'Verification failed'}

    async def disable_mfa(self, user_id: str) -> bool:
        """Disable MFA for user"""
        try:
            supabase = DatabaseService().client

            # Disable MFA
            result = supabase.table('user_mfa').update({
                'enabled': False,
                'disabled_date': datetime.now(timezone.utc).isoformat()
            }).eq('user_id', user_id).execute()

            if result.data:
                logger.info(f"🔒 MFA disabled for user {user_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"❌ MFA disable failed for user {user_id}: {e}")
            return False

    async def get_mfa_status(self, user_id: str) -> MFAStatus:
        """Get user's MFA status"""
        try:
            supabase = DatabaseService().client

            # Get MFA data
            mfa_result = supabase.table('user_mfa').select('*').eq('user_id', user_id).execute()

            if not mfa_result.data:
                return MFAStatus(enabled=False, backup_codes_remaining=0)

            mfa_data = mfa_result.data[0]

            last_used = None
            if mfa_data.get('last_used'):
                last_used = datetime.fromisoformat(mfa_data['last_used'].replace('Z', '+00:00'))

            setup_date = None
            if mfa_data.get('setup_date'):
                setup_date = datetime.fromisoformat(mfa_data['setup_date'].replace('Z', '+00:00'))

            return MFAStatus(
                enabled=mfa_data.get('enabled', False),
                backup_codes_remaining=len(mfa_data.get('backup_codes', [])),
                last_used=last_used,
                setup_date=setup_date
            )

        except Exception as e:
            logger.error(f"❌ MFA status check failed for user {user_id}: {e}")
            return MFAStatus(enabled=False, backup_codes_remaining=0)

    async def regenerate_backup_codes(self, user_id: str) -> List[str]:
        """Regenerate backup codes for user"""
        try:
            supabase = DatabaseService().client

            # Generate new backup codes
            backup_codes = self._generate_backup_codes()

            # Update in database
            result = supabase.table('user_mfa').update({
                'backup_codes': backup_codes
            }).eq('user_id', user_id).eq('enabled', True).execute()

            if result.data:
                logger.info(f"🔄 Backup codes regenerated for user {user_id}")
                # Return unhashed codes for display
                return [self._format_backup_code(code) for code in backup_codes]

            return []

        except Exception as e:
            logger.error(f"❌ Backup code regeneration failed for user {user_id}: {e}")
            return []

    async def is_mfa_required_for_user(self, user_id: str) -> bool:
        """Check if MFA is required for this user (admin accounts)"""
        try:
            supabase = DatabaseService().client

            # Check if user is admin
            admin_result = supabase.table('admin_users').select('user_role').eq('user_id', user_id).execute()

            if admin_result.data:
                # MFA is required for all admin accounts
                return True

            # Check if MFA is enabled
            mfa_status = await self.get_mfa_status(user_id)
            return mfa_status.enabled

        except Exception as e:
            logger.error(f"❌ MFA requirement check failed for user {user_id}: {e}")
            return False

    def _verify_totp_code(self, secret: str, code: str) -> bool:
        """Verify TOTP code with window tolerance"""
        try:
            totp = pyotp.TOTP(secret)
            # Allow 1 window before and after for clock skew
            return totp.verify(code, valid_window=1)
        except Exception as e:
            logger.warning(f"TOTP verification error: {e}")
            return False

    def _generate_qr_code(self, totp_uri: str) -> str:
        """Generate QR code as base64 encoded image"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(totp_uri)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_base64}"

    def _generate_backup_codes(self) -> List[str]:
        """Generate backup codes (hashed for storage)"""
        codes = []
        for _ in range(self.backup_code_count):
            # Generate random code
            code = ''.join(secrets.choice('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                          for _ in range(self.backup_code_length))
            # Store hashed version
            codes.append(self._hash_backup_code(code))

        return codes

    def _hash_backup_code(self, code: str) -> str:
        """Hash backup code for secure storage"""
        return hashlib.sha256(code.encode()).hexdigest()

    def _format_backup_code(self, hashed_code: str) -> str:
        """Format backup code for display (this is for unhashed codes only)"""
        # This should only be called with unhashed codes during generation
        # Format as XXXX-XXXX for 8-character codes
        if len(hashed_code) == 8:
            return f"{hashed_code[:4]}-{hashed_code[4:]}"
        return hashed_code

    def _generate_setup_token(self, user_id: str, secret: str) -> str:
        """Generate setup verification token"""
        token_data = f"{user_id}:{secret}:{datetime.now(timezone.utc).isoformat()}"
        return hashlib.sha256(token_data.encode()).hexdigest()[:32]

    async def _store_mfa_setup(self, user_id: str, secret: str, backup_codes: List[str], setup_token: str):
        """Store temporary MFA setup data"""
        supabase = DatabaseService().client

        setup_data = {
            'user_id': user_id,
            'secret': secret,
            'backup_codes': backup_codes,
            'setup_token': setup_token,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        # Clean up any existing setup data first
        supabase.table('user_mfa_setup').delete().eq('user_id', user_id).execute()

        # Insert new setup data
        supabase.table('user_mfa_setup').insert(setup_data).execute()

# Global MFA service instance
_mfa_service: Optional[MFAService] = None

def get_mfa_service() -> MFAService:
    """Get or create MFA service instance"""
    global _mfa_service

    if _mfa_service is None:
        _mfa_service = MFAService()

    return _mfa_service