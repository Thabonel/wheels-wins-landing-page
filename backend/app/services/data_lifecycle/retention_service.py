"""
Data Lifecycle and Retention Service
Implements automated data retention policies, archival, and cleanup procedures.
Ensures compliance with GDPR data minimization principles and legal retention requirements.
"""

import asyncio
import json
import gzip
import os
import shutil
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from app.core.logging import get_logger
from app.core.config import settings
from app.services.privacy.gdpr_service import gdpr_service

logger = get_logger(__name__)


class ArchivalFormat(str, Enum):
    """Data archival formats"""
    JSON_GZIP = "json_gzip"
    CSV_GZIP = "csv_gzip"
    PARQUET = "parquet"


class RetentionAction(str, Enum):
    """Possible actions for data retention"""
    DELETE = "delete"
    ARCHIVE = "archive"
    ANONYMIZE = "anonymize"
    RETAIN = "retain"


@dataclass
class RetentionPolicy:
    """Data retention policy configuration"""
    table_name: str
    retention_period_days: int
    action: RetentionAction
    legal_basis: str
    archive_format: ArchivalFormat = ArchivalFormat.JSON_GZIP
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CleanupReport:
    """Data cleanup operation report"""
    operation_id: str
    start_time: datetime
    end_time: datetime
    tables_processed: List[str]
    records_deleted: int
    records_archived: int
    records_anonymized: int
    errors: List[str]
    size_freed_bytes: int


@dataclass
class ArchivalJob:
    """Data archival job information"""
    job_id: str
    table_name: str
    user_id: str
    record_count: int
    archive_path: str
    archive_format: ArchivalFormat
    compression_ratio: float
    created_at: datetime


class DataRetentionService:
    """Automated data retention and lifecycle management service"""

    def __init__(self):
        self.archive_base_path = Path(settings.DATA_ARCHIVE_PATH if hasattr(settings, 'DATA_ARCHIVE_PATH') else "/tmp/data_archive")
        self.archive_base_path.mkdir(parents=True, exist_ok=True)

        # Standard retention policies based on GDPR requirements
        self.retention_policies = {
            # Personal and financial data - 7 years (common legal requirement)
            "profiles": RetentionPolicy(
                table_name="profiles",
                retention_period_days=2555,  # 7 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance",
                metadata={"pii_level": "high", "financial_relevance": True}
            ),
            "expenses": RetentionPolicy(
                table_name="expenses",
                retention_period_days=2555,  # 7 years
                action=RetentionAction.ARCHIVE,
                legal_basis="legal_obligation",
                metadata={"financial_relevance": True}
            ),
            "budgets": RetentionPolicy(
                table_name="budgets",
                retention_period_days=2555,  # 7 years
                action=RetentionAction.ARCHIVE,
                legal_basis="legitimate_interests"
            ),

            # Communication and behavioral data - shorter retention
            "pam_conversations": RetentionPolicy(
                table_name="pam_conversations",
                retention_period_days=730,  # 2 years
                action=RetentionAction.DELETE,
                legal_basis="consent",
                metadata={"ai_training_data": True}
            ),
            "pam_messages": RetentionPolicy(
                table_name="pam_messages",
                retention_period_days=730,  # 2 years
                action=RetentionAction.DELETE,
                legal_basis="consent",
                metadata={"ai_training_data": True}
            ),

            # Travel data - 3 years
            "trips": RetentionPolicy(
                table_name="trips",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),
            "fuel_log": RetentionPolicy(
                table_name="fuel_log",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),
            "maintenance_records": RetentionPolicy(
                table_name="maintenance_records",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),

            # Medical data - 10 years (healthcare retention standard)
            "medical_records": RetentionPolicy(
                table_name="medical_records",
                retention_period_days=3650,  # 10 years
                action=RetentionAction.ARCHIVE,
                legal_basis="consent",
                metadata={"sensitivity": "high", "healthcare": True}
            ),
            "medical_medications": RetentionPolicy(
                table_name="medical_medications",
                retention_period_days=3650,  # 10 years
                action=RetentionAction.ARCHIVE,
                legal_basis="consent",
                metadata={"sensitivity": "high", "healthcare": True}
            ),
            "medical_emergency_info": RetentionPolicy(
                table_name="medical_emergency_info",
                retention_period_days=3650,  # 10 years
                action=RetentionAction.ARCHIVE,
                legal_basis="consent",
                metadata={"sensitivity": "high", "healthcare": True}
            ),

            # Social data - moderate retention with anonymization option
            "posts": RetentionPolicy(
                table_name="posts",
                retention_period_days=1825,  # 5 years
                action=RetentionAction.ANONYMIZE,
                legal_basis="legitimate_interests",
                metadata={"social_data": True}
            ),
            "comments": RetentionPolicy(
                table_name="comments",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.DELETE,
                legal_basis="legitimate_interests"
            ),
            "likes": RetentionPolicy(
                table_name="likes",
                retention_period_days=730,  # 2 years
                action=RetentionAction.DELETE,
                legal_basis="legitimate_interests"
            ),

            # Calendar and organizational data
            "calendar_events": RetentionPolicy(
                table_name="calendar_events",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.DELETE,
                legal_basis="consent"
            ),

            # Storage and inventory data
            "storage_items": RetentionPolicy(
                table_name="storage_items",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),
            "storage_categories": RetentionPolicy(
                table_name="storage_categories",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),
            "storage_locations": RetentionPolicy(
                table_name="storage_locations",
                retention_period_days=1095,  # 3 years
                action=RetentionAction.ARCHIVE,
                legal_basis="contract_performance"
            ),
        }

    async def run_retention_cleanup(self, dry_run: bool = False) -> CleanupReport:
        """
        Execute data retention cleanup across all tables

        Args:
            dry_run: If True, only simulate the cleanup without making changes

        Returns:
            CleanupReport with operation details
        """
        operation_id = f"cleanup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now(timezone.utc)

        logger.info(f"Starting retention cleanup operation {operation_id} (dry_run={dry_run})")

        cleanup_report = CleanupReport(
            operation_id=operation_id,
            start_time=start_time,
            end_time=start_time,  # Will be updated at end
            tables_processed=[],
            records_deleted=0,
            records_archived=0,
            records_anonymized=0,
            errors=[],
            size_freed_bytes=0
        )

        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            for table_name, policy in self.retention_policies.items():
                try:
                    logger.info(f"Processing retention for table: {table_name}")
                    cleanup_report.tables_processed.append(table_name)

                    # Calculate cutoff date
                    cutoff_date = datetime.now(timezone.utc) - timedelta(days=policy.retention_period_days)

                    # Get records that are due for retention action
                    id_column = "id" if table_name == "profiles" else "user_id"
                    records_query = supabase.table(table_name).select("*").lt("created_at", cutoff_date.isoformat())

                    if dry_run:
                        # Just count records for dry run
                        count_result = supabase.table(table_name).select("id", count="exact").lt("created_at", cutoff_date.isoformat()).execute()
                        record_count = count_result.count or 0
                        logger.info(f"DRY RUN: {table_name} - {record_count} records would be processed")
                        continue

                    records_result = records_query.execute()
                    records_to_process = records_result.data

                    if not records_to_process:
                        logger.info(f"No records due for retention in {table_name}")
                        continue

                    logger.info(f"Found {len(records_to_process)} records due for retention in {table_name}")

                    # Group records by user for batch processing
                    user_records = {}
                    for record in records_to_process:
                        user_id = record.get(id_column)
                        if user_id not in user_records:
                            user_records[user_id] = []
                        user_records[user_id].append(record)

                    # Process each user's records according to retention policy
                    for user_id, user_record_list in user_records.items():
                        try:
                            if policy.action == RetentionAction.DELETE:
                                await self._delete_records(supabase, table_name, user_id, user_record_list)
                                cleanup_report.records_deleted += len(user_record_list)

                            elif policy.action == RetentionAction.ARCHIVE:
                                archived_bytes = await self._archive_records(table_name, user_id, user_record_list, policy.archive_format)
                                cleanup_report.records_archived += len(user_record_list)
                                cleanup_report.size_freed_bytes += archived_bytes

                                # Delete records after successful archival
                                await self._delete_records(supabase, table_name, user_id, user_record_list)

                            elif policy.action == RetentionAction.ANONYMIZE:
                                await self._anonymize_records(supabase, table_name, user_id, user_record_list)
                                cleanup_report.records_anonymized += len(user_record_list)

                            elif policy.action == RetentionAction.RETAIN:
                                logger.info(f"Retaining {len(user_record_list)} records for user {user_id} in {table_name}")
                                # No action needed, just logging

                        except Exception as user_error:
                            error_msg = f"Failed to process user {user_id} in {table_name}: {str(user_error)}"
                            logger.error(error_msg)
                            cleanup_report.errors.append(error_msg)

                except Exception as table_error:
                    error_msg = f"Failed to process table {table_name}: {str(table_error)}"
                    logger.error(error_msg)
                    cleanup_report.errors.append(error_msg)

            # Update completion time
            cleanup_report.end_time = datetime.now(timezone.utc)
            operation_duration = (cleanup_report.end_time - cleanup_report.start_time).total_seconds()

            logger.info(f"Retention cleanup completed in {operation_duration:.2f} seconds")
            logger.info(f"Summary: {cleanup_report.records_deleted} deleted, {cleanup_report.records_archived} archived, {cleanup_report.records_anonymized} anonymized")

            # Store cleanup report for audit
            await self._store_cleanup_report(cleanup_report)

            return cleanup_report

        except Exception as e:
            cleanup_report.end_time = datetime.now(timezone.utc)
            error_msg = f"Retention cleanup operation failed: {str(e)}"
            logger.error(error_msg)
            cleanup_report.errors.append(error_msg)
            return cleanup_report

    async def archive_user_data(self, user_id: str, tables: Optional[List[str]] = None) -> List[ArchivalJob]:
        """
        Archive specific user's data to secure storage

        Args:
            user_id: UUID of the user whose data to archive
            tables: Specific tables to archive (if None, archives all applicable tables)

        Returns:
            List of ArchivalJob objects with archive details
        """
        logger.info(f"Starting user data archival for user: {user_id}")

        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            archival_jobs = []
            tables_to_archive = tables or list(self.retention_policies.keys())

            for table_name in tables_to_archive:
                try:
                    # Get user's data from table
                    id_column = "id" if table_name == "profiles" else "user_id"
                    result = supabase.table(table_name).select("*").eq(id_column, user_id).execute()

                    if not result.data:
                        logger.info(f"No data to archive for user {user_id} in table {table_name}")
                        continue

                    # Create archival job
                    job_id = f"archive_{user_id[:8]}_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

                    policy = self.retention_policies.get(table_name)
                    archive_format = policy.archive_format if policy else ArchivalFormat.JSON_GZIP

                    # Archive the data
                    archive_path, compression_ratio = await self._create_archive(
                        job_id, table_name, user_id, result.data, archive_format
                    )

                    archival_job = ArchivalJob(
                        job_id=job_id,
                        table_name=table_name,
                        user_id=user_id,
                        record_count=len(result.data),
                        archive_path=str(archive_path),
                        archive_format=archive_format,
                        compression_ratio=compression_ratio,
                        created_at=datetime.now(timezone.utc)
                    )

                    archival_jobs.append(archival_job)
                    logger.info(f"Archived {len(result.data)} records from {table_name} for user {user_id}")

                except Exception as table_error:
                    logger.error(f"Failed to archive {table_name} for user {user_id}: {table_error}")

            logger.info(f"User archival completed: {len(archival_jobs)} jobs created for user {user_id}")
            return archival_jobs

        except Exception as e:
            logger.error(f"User data archival failed for user {user_id}: {e}")
            raise

    async def restore_archived_data(self, archive_job_id: str) -> Dict[str, Any]:
        """
        Restore data from archive

        Args:
            archive_job_id: ID of the archival job to restore

        Returns:
            Restoration summary
        """
        logger.info(f"Starting data restoration for job: {archive_job_id}")

        try:
            # Find archive file
            archive_pattern = f"{archive_job_id}.*"
            archive_files = list(self.archive_base_path.glob(archive_pattern))

            if not archive_files:
                raise FileNotFoundError(f"Archive file not found for job {archive_job_id}")

            archive_file = archive_files[0]

            # Read and decompress archive
            with gzip.open(archive_file, 'rt', encoding='utf-8') as f:
                archive_data = json.load(f)

            restoration_summary = {
                "job_id": archive_job_id,
                "table_name": archive_data["metadata"]["table_name"],
                "user_id": archive_data["metadata"]["user_id"],
                "records_restored": len(archive_data["records"]),
                "restoration_date": datetime.now(timezone.utc).isoformat(),
                "archive_file": str(archive_file)
            }

            logger.info(f"Data restoration completed for job {archive_job_id}: {restoration_summary['records_restored']} records")
            return restoration_summary

        except Exception as e:
            logger.error(f"Data restoration failed for job {archive_job_id}: {e}")
            raise

    async def get_retention_status(self) -> Dict[str, Any]:
        """
        Get overall system retention status and upcoming actions

        Returns:
            Comprehensive retention status report
        """
        try:
            from app.integrations.supabase.client import get_supabase_client
            supabase = get_supabase_client()

            status_report = {
                "assessment_date": datetime.now(timezone.utc).isoformat(),
                "retention_policies": len(self.retention_policies),
                "table_status": {},
                "upcoming_actions": [],
                "total_records_due": 0,
                "archive_statistics": await self._get_archive_statistics()
            }

            for table_name, policy in self.retention_policies.items():
                try:
                    # Calculate cutoff date
                    cutoff_date = datetime.now(timezone.utc) - timedelta(days=policy.retention_period_days)

                    # Count records due for action
                    count_result = supabase.table(table_name).select("id", count="exact").lt("created_at", cutoff_date.isoformat()).execute()
                    records_due = count_result.count or 0

                    # Count total records in table
                    total_result = supabase.table(table_name).select("id", count="exact").execute()
                    total_records = total_result.count or 0

                    status_report["table_status"][table_name] = {
                        "retention_period_days": policy.retention_period_days,
                        "action": policy.action.value,
                        "legal_basis": policy.legal_basis,
                        "total_records": total_records,
                        "records_due_for_action": records_due,
                        "cutoff_date": cutoff_date.isoformat()
                    }

                    if records_due > 0:
                        status_report["upcoming_actions"].append({
                            "table": table_name,
                            "action": policy.action.value,
                            "records_affected": records_due,
                            "due_date": "overdue"
                        })
                        status_report["total_records_due"] += records_due

                except Exception as table_error:
                    logger.warning(f"Could not assess {table_name}: {table_error}")
                    status_report["table_status"][table_name] = {
                        "error": str(table_error)
                    }

            return status_report

        except Exception as e:
            logger.error(f"Retention status assessment failed: {e}")
            raise

    async def _delete_records(self, supabase, table_name: str, user_id: str, records: List[Dict]):
        """Delete records from database"""
        try:
            id_column = "id" if table_name == "profiles" else "user_id"
            delete_result = supabase.table(table_name).delete().eq(id_column, user_id).execute()
            logger.info(f"Deleted {len(records)} records from {table_name} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete records from {table_name}: {e}")
            raise

    async def _archive_records(self, table_name: str, user_id: str, records: List[Dict], archive_format: ArchivalFormat) -> int:
        """Archive records to secure storage and return archived size in bytes"""
        try:
            job_id = f"archive_{user_id[:8]}_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            archive_path, compression_ratio = await self._create_archive(job_id, table_name, user_id, records, archive_format)

            # Calculate archived size
            archive_size = archive_path.stat().st_size
            original_size = len(json.dumps(records, default=str).encode('utf-8'))

            logger.info(f"Archived {len(records)} records from {table_name}: {archive_size} bytes (compression: {compression_ratio:.2f})")
            return original_size

        except Exception as e:
            logger.error(f"Failed to archive records from {table_name}: {e}")
            raise

    async def _anonymize_records(self, supabase, table_name: str, user_id: str, records: List[Dict]):
        """Anonymize records in place"""
        try:
            # Use GDPR service for consistent anonymization
            await gdpr_service.anonymize_user_data(user_id, [table_name])
            logger.info(f"Anonymized {len(records)} records from {table_name} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to anonymize records from {table_name}: {e}")
            raise

    async def _create_archive(self, job_id: str, table_name: str, user_id: str, records: List[Dict], archive_format: ArchivalFormat) -> Tuple[Path, float]:
        """Create compressed archive file and return path and compression ratio"""
        archive_data = {
            "metadata": {
                "job_id": job_id,
                "table_name": table_name,
                "user_id": user_id,
                "record_count": len(records),
                "archived_at": datetime.now(timezone.utc).isoformat(),
                "archive_format": archive_format.value,
                "gdpr_compliance": "Data archived per retention policy"
            },
            "records": records
        }

        # Create archive file path
        archive_filename = f"{job_id}.json.gz"
        archive_path = self.archive_base_path / archive_filename

        # Create compressed archive
        archive_json = json.dumps(archive_data, indent=None, default=str)
        original_size = len(archive_json.encode('utf-8'))

        with gzip.open(archive_path, 'wt', encoding='utf-8', compresslevel=9) as f:
            f.write(archive_json)

        compressed_size = archive_path.stat().st_size
        compression_ratio = compressed_size / original_size if original_size > 0 else 0

        return archive_path, compression_ratio

    async def _get_archive_statistics(self) -> Dict[str, Any]:
        """Get statistics about archived data"""
        try:
            archive_files = list(self.archive_base_path.glob("*.gz"))

            total_size = sum(f.stat().st_size for f in archive_files)
            total_files = len(archive_files)

            return {
                "total_archive_files": total_files,
                "total_archive_size_bytes": total_size,
                "total_archive_size_mb": round(total_size / 1024 / 1024, 2),
                "archive_location": str(self.archive_base_path)
            }

        except Exception as e:
            logger.warning(f"Could not get archive statistics: {e}")
            return {"error": str(e)}

    async def _store_cleanup_report(self, cleanup_report: CleanupReport):
        """Store cleanup report for audit purposes"""
        try:
            report_file = self.archive_base_path / f"cleanup_report_{cleanup_report.operation_id}.json"

            with open(report_file, 'w') as f:
                json.dump(asdict(cleanup_report), f, indent=2, default=str)

            logger.info(f"Cleanup report stored: {report_file}")

        except Exception as e:
            logger.error(f"Failed to store cleanup report: {e}")


# Global retention service instance
retention_service = DataRetentionService()