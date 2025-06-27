
#!/usr/bin/env python3
"""
PAM Backend Cleanup Script
Safely removes old directory structure after successful migration verification.
"""

import os
import sys
import json
import shutil
import subprocess
from datetime import datetime
from typing import List, Dict, Any

class SafeCleanup:
    """Safe cleanup of old directory structure."""
    
    def __init__(self):
        self.backup_dir = f"migration_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.cleanup_report = {
            "timestamp": datetime.now().isoformat(),
            "backup_location": self.backup_dir,
            "directories_removed": [],
            "files_removed": [],
            "preserved_files": [],
            "errors": []
        }
        
        # Directories to remove after migration
        self.old_directories = [
            "app",
            "pam-backend",
            "scraper_service"
        ]
        
        # Files to preserve (move to backup)
        self.preserve_patterns = [
            "*.log",
            "*.db",
            "*.sqlite",
            "*.env*",
            "*.json",
            "*.yaml",
            "*.yml"
        ]

    def check_verification_status(self) -> bool:
        """Check if migration verification passed."""
        print("🔍 Checking migration verification status...")
        
        # Look for recent verification reports
        report_files = [f for f in os.listdir('.') if f.startswith('migration_verification_report_') and f.endswith('.json')]
        
        if not report_files:
            print("❌ No verification report found. Please run verify_migration.py first.")
            return False
        
        # Get the most recent report
        latest_report = sorted(report_files)[-1]
        
        try:
            with open(latest_report, 'r') as f:
                report_data = json.load(f)
            
            if report_data.get('overall_status') == 'PASS':
                print(f"✅ Verification passed in {latest_report}")
                return True
            else:
                print(f"❌ Verification failed in {latest_report}")
                print("Please address issues before cleanup.")
                return False
                
        except Exception as e:
            print(f"❌ Error reading verification report: {e}")
            return False

    def create_backup(self) -> bool:
        """Create backup of old structure before removal."""
        print(f"📦 Creating backup in {self.backup_dir}...")
        
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            
            for directory in self.old_directories:
                if os.path.exists(directory):
                    backup_path = os.path.join(self.backup_dir, directory)
                    shutil.copytree(directory, backup_path)
                    print(f"  Backed up: {directory} -> {backup_path}")
            
            # Backup any loose files that match preserve patterns
            for pattern in self.preserve_patterns:
                import glob
                matching_files = glob.glob(pattern)
                for file_path in matching_files:
                    if not os.path.isfile(file_path):
                        continue
                    
                    backup_file_path = os.path.join(self.backup_dir, os.path.basename(file_path))
                    shutil.copy2(file_path, backup_file_path)
                    self.cleanup_report["preserved_files"].append(file_path)
                    print(f"  Preserved: {file_path} -> {backup_file_path}")
            
            print(f"✅ Backup created successfully")
            return True
            
        except Exception as e:
            print(f"❌ Backup creation failed: {e}")
            self.cleanup_report["errors"].append(f"Backup failed: {e}")
            return False

    def remove_old_directories(self) -> bool:
        """Remove old directory structure."""
        print("🗑️  Removing old directories...")
        
        success = True
        
        for directory in self.old_directories:
            if os.path.exists(directory):
                try:
                    shutil.rmtree(directory)
                    self.cleanup_report["directories_removed"].append(directory)
                    print(f"  Removed: {directory}")
                except Exception as e:
                    print(f"  ❌ Failed to remove {directory}: {e}")
                    self.cleanup_report["errors"].append(f"Failed to remove {directory}: {e}")
                    success = False
            else:
                print(f"  Directory not found: {directory}")
        
        return success

    def update_gitignore(self) -> bool:
        """Update .gitignore to reflect new structure."""
        print("📝 Updating .gitignore...")
        
        try:
            gitignore_additions = [
                "",
                "# Migration cleanup",
                "migration_backup_*/",
                "migration_verification_report_*.json",
                "",
                "# Backend specific ignores",
                "backend/.env*",
                "backend/*.log",
                "backend/migrations/",
                "backend/tmp/"
            ]
            
            if os.path.exists('.gitignore'):
                with open('.gitignore', 'r') as f:
                    existing_content = f.read()
                
                # Check if our additions are already there
                if "# Migration cleanup" not in existing_content:
                    with open('.gitignore', 'a') as f:
                        f.write('\n'.join(gitignore_additions))
                    print("  Updated .gitignore with migration-specific entries")
                else:
                    print("  .gitignore already up to date")
            else:
                with open('.gitignore', 'w') as f:
                    f.write('\n'.join(gitignore_additions))
                print("  Created .gitignore with migration entries")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to update .gitignore: {e}")
            self.cleanup_report["errors"].append(f"Gitignore update failed: {e}")
            return False

    def commit_changes(self) -> bool:
        """Commit the cleanup changes to git."""
        print("📝 Committing cleanup changes...")
        
        try:
            # Check if git is available and we're in a git repo
            subprocess.run(['git', 'status'], check=True, capture_output=True)
            
            # Add all changes
            subprocess.run(['git', 'add', '.'], check=True)
            
            # Commit changes
            commit_message = f"Complete migration cleanup - removed old structure\n\nBackup created in {self.backup_dir}"
            subprocess.run(['git', 'commit', '-m', commit_message], check=True)
            
            print("  ✅ Changes committed to git")
            return True
            
        except subprocess.CalledProcessError:
            print("  ⚠️  Git commit failed or not in git repository")
            return False
        except Exception as e:
            print(f"  ❌ Git commit error: {e}")
            return False

    def generate_cleanup_report(self) -> str:
        """Generate cleanup completion report."""
        report_file = f"cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(self.cleanup_report, f, indent=2, default=str)
        
        print(f"\n📄 Cleanup report saved to: {report_file}")
        return report_file

    def run_cleanup(self) -> bool:
        """Run the complete cleanup process."""
        print("🧹 Starting PAM Backend Cleanup Process")
        print(f"Timestamp: {self.cleanup_report['timestamp']}")
        
        # Step 1: Check verification status
        if not self.check_verification_status():
            return False
        
        # Step 2: Create backup
        if not self.create_backup():
            return False
        
        # Step 3: Remove old directories
        if not self.remove_old_directories():
            print("⚠️  Some directories could not be removed, but continuing...")
        
        # Step 4: Update .gitignore
        self.update_gitignore()
        
        # Step 5: Commit changes (optional)
        self.commit_changes()
        
        # Step 6: Generate report
        self.generate_cleanup_report()
        
        return True

def main():
    """Main cleanup function."""
    cleanup = SafeCleanup()
    
    print("⚠️  WARNING: This will permanently remove old directory structure!")
    print(f"A backup will be created in: {cleanup.backup_dir}")
    
    # Get user confirmation
    response = input("\nProceed with cleanup? (yes/no): ").lower().strip()
    
    if response not in ['yes', 'y']:
        print("❌ Cleanup cancelled by user.")
        sys.exit(0)
    
    try:
        success = cleanup.run_cleanup()
        
        if success:
            print("\n🎉 Cleanup completed successfully!")
            print(f"Old structure backed up to: {cleanup.backup_dir}")
            print("Migration is now complete.")
        else:
            print("\n⚠️  Cleanup completed with some issues.")
            print("Please review the cleanup report for details.")
        
    except Exception as e:
        print(f"\n❌ Cleanup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Check if we're in the right directory
    if not os.path.exists("backend"):
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    main()
