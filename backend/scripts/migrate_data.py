
#!/usr/bin/env python3
"""
Migrate data from old structure to new PAM backend structure.
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from typing import Dict, List, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)

class DataMigrator:
    def __init__(self):
        self.client = get_supabase_client()
        self.migration_log = []
    
    async def migrate_user_profiles(self, old_data: List[Dict]):
        """Migrate user profiles to new structure"""
        logger.info("Migrating user profiles...")
        
        migrated = 0
        errors = 0
        
        for old_profile in old_data:
            try:
                # Map old structure to new
                new_profile = {
                    "user_id": old_profile.get("id") or old_profile.get("user_id"),
                    "email": old_profile.get("email"),
                    "full_name": old_profile.get("name") or old_profile.get("full_name"),
                    "region": old_profile.get("region", "Australia"),
                    "preferences": old_profile.get("preferences", {}),
                    "created_at": old_profile.get("created_at") or datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Insert new profile
                result = self.client.table("profiles").upsert(new_profile).execute()
                
                if result.data:
                    migrated += 1
                    logger.info(f"  ✅ Migrated profile: {new_profile['email']}")
                else:
                    errors += 1
                    logger.error(f"  ❌ Failed to migrate: {new_profile['email']}")
                
            except Exception as e:
                errors += 1
                logger.error(f"  ❌ Error migrating profile: {e}")
        
        self.migration_log.append({
            "table": "profiles",
            "migrated": migrated,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Profile migration complete: {migrated} migrated, {errors} errors")
    
    async def migrate_expenses(self, old_data: List[Dict]):
        """Migrate expenses to new structure"""
        logger.info("Migrating expenses...")
        
        migrated = 0
        errors = 0
        
        for old_expense in old_data:
            try:
                new_expense = {
                    "user_id": old_expense.get("user_id"),
                    "amount": float(old_expense.get("amount", 0)),
                    "category": old_expense.get("category", "other"),
                    "description": old_expense.get("description") or old_expense.get("note"),
                    "date": old_expense.get("date") or datetime.now().date().isoformat(),
                    "created_at": old_expense.get("created_at") or datetime.now().isoformat()
                }
                
                result = self.client.table("expenses").insert(new_expense).execute()
                
                if result.data:
                    migrated += 1
                else:
                    errors += 1
                
            except Exception as e:
                errors += 1
                logger.error(f"  ❌ Error migrating expense: {e}")
        
        self.migration_log.append({
            "table": "expenses",
            "migrated": migrated,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Expense migration complete: {migrated} migrated, {errors} errors")
    
    async def migrate_maintenance_records(self, old_data: List[Dict]):
        """Migrate maintenance records to new structure"""
        logger.info("Migrating maintenance records...")
        
        migrated = 0
        errors = 0
        
        for old_record in old_data:
            try:
                new_record = {
                    "user_id": old_record.get("user_id"),
                    "task": old_record.get("task") or old_record.get("description"),
                    "date": old_record.get("date") or datetime.now().date().isoformat(),
                    "mileage": int(old_record.get("mileage", 0)),
                    "cost": float(old_record.get("cost", 0)),
                    "status": old_record.get("status", "completed"),
                    "notes": old_record.get("notes"),
                    "next_due_date": old_record.get("next_due_date"),
                    "next_due_mileage": old_record.get("next_due_mileage"),
                    "created_at": old_record.get("created_at") or datetime.now().isoformat()
                }
                
                result = self.client.table("maintenance_records").insert(new_record).execute()
                
                if result.data:
                    migrated += 1
                else:
                    errors += 1
                
            except Exception as e:
                errors += 1
                logger.error(f"  ❌ Error migrating maintenance record: {e}")
        
        self.migration_log.append({
            "table": "maintenance_records",
            "migrated": migrated,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Maintenance migration complete: {migrated} migrated, {errors} errors")
    
    async def migrate_conversation_memory(self, old_data: List[Dict]):
        """Migrate PAM conversation memory"""
        logger.info("Migrating conversation memory...")
        
        migrated = 0
        errors = 0
        
        for old_memory in old_data:
            try:
                new_memory = {
                    "user_id": old_memory.get("user_id"),
                    "session_id": old_memory.get("session_id"),
                    "message_sequence": old_memory.get("sequence", 1),
                    "user_message": old_memory.get("user_input") or old_memory.get("message"),
                    "pam_response": old_memory.get("pam_response") or old_memory.get("response"),
                    "detected_intent": old_memory.get("intent"),
                    "intent_confidence": float(old_memory.get("confidence", 0.0)),
                    "context_used": old_memory.get("context", {}),
                    "node_used": old_memory.get("node"),
                    "created_at": old_memory.get("timestamp") or datetime.now().isoformat()
                }
                
                result = self.client.table("pam_conversation_memory").insert(new_memory).execute()
                
                if result.data:
                    migrated += 1
                else:
                    errors += 1
                
            except Exception as e:
                errors += 1
                logger.error(f"  ❌ Error migrating conversation memory: {e}")
        
        self.migration_log.append({
            "table": "pam_conversation_memory",
            "migrated": migrated,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Conversation memory migration complete: {migrated} migrated, {errors} errors")
    
    async def backup_existing_data(self):
        """Backup existing data before migration"""
        logger.info("Creating backup of existing data...")
        
        tables_to_backup = [
            "profiles", "expenses", "maintenance_records", 
            "pam_conversation_memory", "fuel_log"
        ]
        
        backup_data = {
            "timestamp": datetime.now().isoformat(),
            "tables": {}
        }
        
        for table in tables_to_backup:
            try:
                result = self.client.table(table).select("*").execute()
                backup_data["tables"][table] = result.data
                logger.info(f"  ✅ Backed up {len(result.data)} records from {table}")
            except Exception as e:
                logger.error(f"  ❌ Error backing up {table}: {e}")
                backup_data["tables"][table] = []
        
        # Save backup to file
        backup_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        logger.info(f"📁 Backup saved to: {backup_file}")
        return backup_file
    
    async def run_migration(self, data_file: str):
        """Run complete data migration"""
        logger.info(f"Starting data migration from: {data_file}")
        
        # Create backup first
        backup_file = await self.backup_existing_data()
        
        # Load migration data
        try:
            with open(data_file, 'r') as f:
                migration_data = json.load(f)
        except Exception as e:
            logger.error(f"Error loading migration data: {e}")
            return False
        
        # Run migrations
        if "profiles" in migration_data:
            await self.migrate_user_profiles(migration_data["profiles"])
        
        if "expenses" in migration_data:
            await self.migrate_expenses(migration_data["expenses"])
        
        if "maintenance_records" in migration_data:
            await self.migrate_maintenance_records(migration_data["maintenance_records"])
        
        if "conversation_memory" in migration_data:
            await self.migrate_conversation_memory(migration_data["conversation_memory"])
        
        # Generate migration report
        report = {
            "migration_timestamp": datetime.now().isoformat(),
            "source_file": data_file,
            "backup_file": backup_file,
            "migrations": self.migration_log,
            "summary": {
                "total_migrated": sum(m["migrated"] for m in self.migration_log),
                "total_errors": sum(m["errors"] for m in self.migration_log)
            }
        }
        
        report_file = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"\n📊 Migration Summary:")
        logger.info(f"Total Migrated: {report['summary']['total_migrated']}")
        logger.info(f"Total Errors: {report['summary']['total_errors']}")
        logger.info(f"📁 Report saved to: {report_file}")
        
        return True

async def main():
    """Main function for data migration"""
    if len(sys.argv) < 2:
        logger.error("Usage: python migrate_data.py <data_file.json>")
        sys.exit(1)
    
    data_file = sys.argv[1]
    
    if not os.path.exists(data_file):
        logger.error(f"Data file not found: {data_file}")
        sys.exit(1)
    
    migrator = DataMigrator()
    success = await migrator.run_migration(data_file)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
