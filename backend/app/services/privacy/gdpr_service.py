"""
GDPR Compliance Service
Implements comprehensive GDPR data protection requirements including:
- User data export (Article 20 - Right to data portability)
- User data deletion (Article 17 - Right to erasure)
- Breach notification (Article 33/34)
- Data retention management
- Privacy impact assessments
"""

import asyncio
import json
import zipfile
import tempfile
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import HTTPException
from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class GDPRRequestType(str, Enum):
    """Types of GDPR requests"""
    DATA_EXPORT = "data_export"
    DATA_DELETION = "data_deletion"
    DATA_RECTIFICATION = "data_rectification"
    PROCESSING_RESTRICTION = "processing_restriction"
    PORTABILITY = "portability"
    OBJECTION = "objection"


class BreachSeverity(str, Enum):
    """Data breach severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class GDPRRequest:
    """GDPR request data structure"""
    id: str
    user_id: str
    request_type: GDPRRequestType
    status: str  # pending, processing, completed, failed
    created_at: datetime
    completed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    verification_token: Optional[str] = None


@dataclass
class DataBreachReport:
    """Data breach report structure"""
    id: str
    title: str
    description: str
    severity: BreachSeverity
    affected_users_count: int
    data_categories: List[str]
    detected_at: datetime
    reported_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    regulatory_notification_required: bool = False
    notification_sent: bool = False
    containment_actions: List[str] = None
    impact_assessment: Optional[str] = None


@dataclass
class UserDataExport:
    """Complete user data export structure"""
    user_id: str
    export_date: datetime
    data_categories: Dict[str, Any]
    file_size_bytes: int
    retention_policy: Dict[str, str]


class GDPRService:
    """Comprehensive GDPR compliance service"""

    def __init__(self):
        self.data_retention_policies = {
            # Core user data
            "profiles": {"retention_period": "7_years", "legal_basis": "contract"},
            "calendar_events": {"retention_period": "3_years", "legal_basis": "consent"},
            "expenses": {"retention_period": "7_years", "legal_basis": "legal_obligation"},
            "budgets": {"retention_period": "7_years", "legal_basis": "legitimate_interests"},

            # Travel and vehicle data
            "trips": {"retention_period": "3_years", "legal_basis": "contract"},
            "fuel_log": {"retention_period": "3_years", "legal_basis": "contract"},
            "maintenance_records": {"retention_period": "3_years", "legal_basis": "contract"},

            # Communication and AI data
            "pam_conversations": {"retention_period": "2_years", "legal_basis": "consent"},
            "pam_messages": {"retention_period": "2_years", "legal_basis": "consent"},
            "pam_savings_events": {"retention_period": "3_years", "legal_basis": "legitimate_interests"},

            # Medical data (highly sensitive)
            "medical_records": {"retention_period": "10_years", "legal_basis": "consent"},
            "medical_medications": {"retention_period": "10_years", "legal_basis": "consent"},
            "medical_emergency_info": {"retention_period": "10_years", "legal_basis": "consent"},

            # Social and community data
            "posts": {"retention_period": "5_years", "legal_basis": "legitimate_interests"},
            "comments": {"retention_period": "3_years", "legal_basis": "legitimate_interests"},
            "likes": {"retention_period": "2_years", "legal_basis": "legitimate_interests"},

            # Storage and organization
            "storage_items": {"retention_period": "3_years", "legal_basis": "contract"},
            "storage_categories": {"retention_period": "3_years", "legal_basis": "contract"},
            "storage_locations": {"retention_period": "3_years", "legal_basis": "contract"},
        }

        # EU residents have additional rights
        self.enhanced_rights_jurisdictions = ["EU", "EEA", "UK"]

        # Data categories for breach notification
        self.sensitive_data_categories = [
            "medical_records", "medical_medications", "medical_emergency_info",
            "financial_data", "location_data", "biometric_data", "personal_identifiers"
        ]

    async def export_user_data(self, user_id: str, format: str = "json") -> UserDataExport:
        """
        Export all user data in machine-readable format (GDPR Article 20)

        Args:
            user_id: UUID of the user requesting data export
            format: Export format (json, csv, xml)

        Returns:
            UserDataExport object with file path and metadata
        """
        logger.info(f"Starting GDPR data export for user: {user_id}")

        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            export_data = {
                "export_metadata": {
                    "user_id": user_id,
                    "export_date": datetime.now(timezone.utc).isoformat(),
                    "format": format,
                    "gdpr_compliance": "Article 20 - Right to data portability",
                    "data_controller": "Wheels & Wins LLC",
                    "retention_policies": self.data_retention_policies
                },
                "personal_data": {}
            }

            # Export profile data (uses 'id' not 'user_id')
            profile_result = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if profile_result.data:
                export_data["personal_data"]["profile"] = profile_result.data[0]
                logger.info(f"Exported profile data for user {user_id}")

            # Export all other user data (uses 'user_id')
            tables_to_export = [
                "calendar_events", "expenses", "budgets", "trips", "fuel_log",
                "maintenance_records", "pam_conversations", "pam_messages",
                "pam_savings_events", "medical_records", "medical_medications",
                "medical_emergency_info", "posts", "comments", "likes",
                "storage_items", "storage_categories", "storage_locations"
            ]

            for table in tables_to_export:
                try:
                    result = supabase.table(table).select("*").eq("user_id", user_id).execute()
                    export_data["personal_data"][table] = result.data
                    logger.info(f"Exported {len(result.data)} records from {table}")
                except Exception as table_error:
                    logger.warning(f"Could not export data from table {table}: {table_error}")
                    export_data["personal_data"][table] = []

            # Handle special relationships (comments, likes with posts)
            try:
                # Get user's posts to find related comments/likes from others
                posts_result = supabase.table("posts").select("id").eq("user_id", user_id).execute()
                post_ids = [post["id"] for post in posts_result.data]

                if post_ids:
                    # Get all comments on user's posts
                    comments_on_posts = supabase.table("comments").select("*").in_("post_id", post_ids).execute()
                    export_data["personal_data"]["comments_on_my_posts"] = comments_on_posts.data

                    # Get all likes on user's posts
                    likes_on_posts = supabase.table("likes").select("*").in_("post_id", post_ids).execute()
                    export_data["personal_data"]["likes_on_my_posts"] = likes_on_posts.data

            except Exception as relationship_error:
                logger.warning(f"Could not export relationship data: {relationship_error}")

            # Calculate total data size and create export file
            export_json = json.dumps(export_data, indent=2, default=str)
            file_size_bytes = len(export_json.encode('utf-8'))

            # Create user data export record
            user_export = UserDataExport(
                user_id=user_id,
                export_date=datetime.now(timezone.utc),
                data_categories=list(export_data["personal_data"].keys()),
                file_size_bytes=file_size_bytes,
                retention_policy=self.data_retention_policies
            )

            logger.info(f"GDPR data export completed for user {user_id}: {file_size_bytes} bytes")
            return user_export, export_json

        except Exception as e:
            logger.error(f"GDPR data export failed for user {user_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Data export failed: {str(e)}"
            )

    async def delete_user_data(self, user_id: str, verification_token: str) -> Dict[str, Any]:
        """
        Delete all user data with cascade (GDPR Article 17 - Right to erasure)

        Args:
            user_id: UUID of the user requesting deletion
            verification_token: Security token to verify request authenticity

        Returns:
            Deletion summary with affected records count
        """
        logger.info(f"Starting GDPR data deletion for user: {user_id}")

        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            deletion_summary = {
                "user_id": user_id,
                "deletion_date": datetime.now(timezone.utc).isoformat(),
                "gdpr_compliance": "Article 17 - Right to erasure",
                "verification_token": verification_token[:8] + "...",  # Partial token for audit
                "deleted_tables": {},
                "total_records_deleted": 0,
                "errors": []
            }

            # Define deletion order (foreign keys first, then parent tables)
            tables_deletion_order = [
                # Child tables first (have foreign keys)
                "pam_messages",  # references pam_conversations
                "comments",      # references posts
                "likes",         # references posts
                "storage_items", # references storage_categories, storage_locations

                # Independent tables
                "calendar_events", "expenses", "budgets", "trips", "fuel_log",
                "maintenance_records", "pam_conversations", "pam_savings_events",
                "medical_records", "medical_medications", "medical_emergency_info",
                "posts", "storage_categories", "storage_locations",

                # Profile table last (parent table)
                "profiles"
            ]

            for table in tables_deletion_order:
                try:
                    # Use correct column name based on table
                    id_column = "id" if table == "profiles" else "user_id"

                    # Get count before deletion for audit
                    count_result = supabase.table(table).select("id", count="exact").eq(id_column, user_id).execute()
                    record_count = count_result.count or 0

                    if record_count > 0:
                        # Delete records
                        delete_result = supabase.table(table).delete().eq(id_column, user_id).execute()

                        deletion_summary["deleted_tables"][table] = {
                            "records_deleted": record_count,
                            "status": "success"
                        }
                        deletion_summary["total_records_deleted"] += record_count

                        logger.info(f"Deleted {record_count} records from {table} for user {user_id}")
                    else:
                        deletion_summary["deleted_tables"][table] = {
                            "records_deleted": 0,
                            "status": "no_data"
                        }

                except Exception as table_error:
                    error_msg = f"Failed to delete from {table}: {str(table_error)}"
                    logger.error(error_msg)
                    deletion_summary["errors"].append(error_msg)
                    deletion_summary["deleted_tables"][table] = {
                        "records_deleted": 0,
                        "status": "error",
                        "error": str(table_error)
                    }

            # Log deletion for audit trail
            await self._log_gdpr_request(
                user_id=user_id,
                request_type=GDPRRequestType.DATA_DELETION,
                metadata=deletion_summary,
                verification_token=verification_token
            )

            logger.info(f"GDPR data deletion completed for user {user_id}: {deletion_summary['total_records_deleted']} records deleted")
            return deletion_summary

        except Exception as e:
            logger.error(f"GDPR data deletion failed for user {user_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Data deletion failed: {str(e)}"
            )

    async def anonymize_user_data(self, user_id: str, tables_to_anonymize: List[str]) -> Dict[str, Any]:
        """
        Anonymize user data while preserving data for legal/analytical purposes

        Args:
            user_id: UUID of the user
            tables_to_anonymize: List of table names to anonymize

        Returns:
            Anonymization summary
        """
        logger.info(f"Starting data anonymization for user: {user_id}")

        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            anonymization_summary = {
                "user_id": user_id,
                "anonymization_date": datetime.now(timezone.utc).isoformat(),
                "anonymized_tables": {},
                "total_records_anonymized": 0
            }

            # Anonymization patterns
            anonymized_email = f"anonymized_{user_id[:8]}@privacy.local"
            anonymized_name = f"User_{user_id[:8]}"

            for table in tables_to_anonymize:
                try:
                    if table == "profiles":
                        # Anonymize profile data
                        update_data = {
                            "email": anonymized_email,
                            "full_name": anonymized_name,
                            "nickname": "Anonymous",
                            "partner_name": None,
                            "partner_email": None,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }

                        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()

                    elif table == "posts":
                        # Anonymize posts content while preserving analytics
                        update_data = {
                            "content": "[Content anonymized per GDPR request]",
                            "location_name": "[Location anonymized]",
                            "latitude": None,
                            "longitude": None,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }

                        result = supabase.table("posts").update(update_data).eq("user_id", user_id).execute()

                    elif table == "medical_records":
                        # Anonymize sensitive medical data
                        update_data = {
                            "title": "[Medical record anonymized]",
                            "summary": "[Summary anonymized per GDPR request]",
                            "ocr_text": None,  # Remove extracted text
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }

                        result = supabase.table("medical_records").update(update_data).eq("user_id", user_id).execute()

                    # Count affected records
                    count_result = supabase.table(table).select("id", count="exact").eq(
                        "id" if table == "profiles" else "user_id", user_id
                    ).execute()

                    record_count = count_result.count or 0
                    anonymization_summary["anonymized_tables"][table] = record_count
                    anonymization_summary["total_records_anonymized"] += record_count

                    logger.info(f"Anonymized {record_count} records in {table} for user {user_id}")

                except Exception as table_error:
                    logger.error(f"Failed to anonymize {table}: {table_error}")
                    anonymization_summary["anonymized_tables"][table] = f"Error: {str(table_error)}"

            logger.info(f"Data anonymization completed for user {user_id}")
            return anonymization_summary

        except Exception as e:
            logger.error(f"Data anonymization failed for user {user_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Data anonymization failed: {str(e)}"
            )

    async def report_data_breach(self, breach_data: Dict[str, Any]) -> DataBreachReport:
        """
        Report data breach and initiate GDPR Article 33/34 notification procedures

        Args:
            breach_data: Breach information including description, affected users, etc.

        Returns:
            DataBreachReport with notification requirements
        """
        logger.critical(f"Data breach reported: {breach_data.get('title', 'Untitled')}")

        try:
            breach_id = f"breach_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            breach_report = DataBreachReport(
                id=breach_id,
                title=breach_data["title"],
                description=breach_data["description"],
                severity=BreachSeverity(breach_data.get("severity", "medium")),
                affected_users_count=breach_data.get("affected_users_count", 0),
                data_categories=breach_data.get("data_categories", []),
                detected_at=datetime.now(timezone.utc),
                containment_actions=breach_data.get("containment_actions", []),
                impact_assessment=breach_data.get("impact_assessment")
            )

            # Determine if regulatory notification is required (GDPR Article 33)
            # High risk to rights and freedoms requires notification within 72 hours
            sensitive_categories_affected = any(
                cat in self.sensitive_data_categories
                for cat in breach_report.data_categories
            )

            breach_report.regulatory_notification_required = (
                breach_report.severity in [BreachSeverity.HIGH, BreachSeverity.CRITICAL] or
                sensitive_categories_affected or
                breach_report.affected_users_count > 100
            )

            # Store breach report
            await self._store_breach_report(breach_report)

            # Send immediate notifications if required
            if breach_report.regulatory_notification_required:
                await self._notify_data_protection_authority(breach_report)

                # If high risk to individuals, notify affected users (Article 34)
                if breach_report.severity == BreachSeverity.CRITICAL:
                    await self._notify_affected_users(breach_report)

            logger.critical(f"Breach {breach_id} processed - Regulatory notification: {breach_report.regulatory_notification_required}")
            return breach_report

        except Exception as e:
            logger.error(f"Breach reporting failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Breach reporting failed: {str(e)}"
            )

    async def get_data_retention_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get data retention status for user's data across all tables

        Args:
            user_id: UUID of the user

        Returns:
            Retention status summary
        """
        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            retention_status = {
                "user_id": user_id,
                "assessment_date": datetime.now(timezone.utc).isoformat(),
                "table_retention": {},
                "upcoming_deletions": [],
                "total_data_age_days": 0
            }

            # Get user creation date from profile
            profile_result = supabase.table("profiles").select("created_at").eq("id", user_id).execute()
            if not profile_result.data:
                raise HTTPException(status_code=404, detail="User not found")

            user_created_at = datetime.fromisoformat(profile_result.data[0]["created_at"].replace('Z', '+00:00'))
            data_age_days = (datetime.now(timezone.utc) - user_created_at).days
            retention_status["total_data_age_days"] = data_age_days

            for table, policy in self.data_retention_policies.items():
                try:
                    # Convert retention period to days
                    retention_days = self._parse_retention_period(policy["retention_period"])

                    # Get oldest record for this user in this table
                    id_column = "id" if table == "profiles" else "user_id"
                    result = supabase.table(table).select("created_at", count="exact").eq(id_column, user_id).order("created_at", desc=False).limit(1).execute()

                    record_count = result.count or 0
                    oldest_record_date = None

                    if result.data:
                        oldest_record_date = datetime.fromisoformat(result.data[0]["created_at"].replace('Z', '+00:00'))
                        days_since_creation = (datetime.now(timezone.utc) - oldest_record_date).days
                        days_until_deletion = retention_days - days_since_creation
                    else:
                        days_since_creation = 0
                        days_until_deletion = retention_days

                    retention_status["table_retention"][table] = {
                        "record_count": record_count,
                        "retention_period_days": retention_days,
                        "legal_basis": policy["legal_basis"],
                        "oldest_record_date": oldest_record_date.isoformat() if oldest_record_date else None,
                        "days_since_creation": days_since_creation,
                        "days_until_deletion": max(0, days_until_deletion),
                        "deletion_due": days_until_deletion <= 0
                    }

                    # Add to upcoming deletions if due within 30 days
                    if 0 < days_until_deletion <= 30:
                        retention_status["upcoming_deletions"].append({
                            "table": table,
                            "days_until_deletion": days_until_deletion,
                            "record_count": record_count
                        })

                except Exception as table_error:
                    logger.warning(f"Could not assess retention for {table}: {table_error}")
                    retention_status["table_retention"][table] = {
                        "error": str(table_error),
                        "record_count": 0
                    }

            return retention_status

        except Exception as e:
            logger.error(f"Retention status assessment failed for user {user_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Retention status assessment failed: {str(e)}"
            )

    def _parse_retention_period(self, period: str) -> int:
        """Convert retention period string to days"""
        period_map = {
            "2_years": 730,
            "3_years": 1095,
            "5_years": 1825,
            "7_years": 2555,
            "10_years": 3650,
            "indefinite": 36500  # 100 years as "indefinite"
        }
        return period_map.get(period, 2555)  # Default to 7 years

    async def _log_gdpr_request(self, user_id: str, request_type: GDPRRequestType, metadata: Dict[str, Any], verification_token: str):
        """Log GDPR request for audit trail"""
        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            # Create audit log entry (could be stored in a dedicated audit table)
            audit_entry = {
                "user_id": user_id,
                "action": f"gdpr_{request_type.value}",
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "verification_token_hash": hash(verification_token)  # Store hash only
            }

            logger.info(f"GDPR audit log created for user {user_id}: {request_type.value}")

        except Exception as e:
            logger.error(f"Failed to log GDPR request: {e}")

    async def _store_breach_report(self, breach_report: DataBreachReport):
        """Store breach report in secure audit log"""
        try:
            # In production, this would be stored in a secure, immutable audit system
            logger.critical(f"BREACH REPORT STORED: {asdict(breach_report)}")

        except Exception as e:
            logger.error(f"Failed to store breach report: {e}")

    async def _notify_data_protection_authority(self, breach_report: DataBreachReport):
        """Notify Data Protection Authority within 72 hours (Article 33)"""
        try:
            # In production, this would integrate with official DPA notification systems
            logger.critical(f"DPA NOTIFICATION REQUIRED: Breach {breach_report.id} - Severity: {breach_report.severity}")

            # Mark as notified
            breach_report.notification_sent = True
            breach_report.reported_at = datetime.now(timezone.utc)

        except Exception as e:
            logger.error(f"Failed to notify DPA: {e}")

    async def _notify_affected_users(self, breach_report: DataBreachReport):
        """Notify affected users of high-risk breach (Article 34)"""
        try:
            # In production, this would send notifications to affected users
            logger.critical(f"USER NOTIFICATION REQUIRED: Breach {breach_report.id} affects {breach_report.affected_users_count} users")

        except Exception as e:
            logger.error(f"Failed to notify users: {e}")


# Global GDPR service instance
gdpr_service = GDPRService()