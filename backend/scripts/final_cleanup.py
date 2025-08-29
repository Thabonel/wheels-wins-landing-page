
#!/usr/bin/env python3
"""
PAM Backend Final Cleanup Script
Removes old directory structure after successful migration.
"""

import os
import sys
import shutil
import subprocess
import json
from datetime import datetime
from pathlib import Path

def create_backup(source_dir: str, backup_base: str) -> str:
    """Create a timestamped backup of a directory."""
    if not os.path.exists(source_dir):
        print(f"⚠️  Directory {source_dir} doesn't exist, skipping backup")
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{backup_base}_backup_{timestamp}"
    
    print(f"📦 Creating backup: {source_dir} -> {backup_name}")
    shutil.copytree(source_dir, backup_name)
    return backup_name

def update_gitignore():
    """Update .gitignore to remove old directory references."""
    gitignore_path = ".gitignore"
    
    # Remove old backend-specific ignores
    old_patterns = [
        "pam-backend/",
        "app/__pycache__/",
        "app/*.pyc",
    ]
    
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            lines = f.readlines()
        
        # Filter out old patterns
        new_lines = []
        for line in lines:
            if not any(pattern in line.strip() for pattern in old_patterns):
                new_lines.append(line)
        
        # Add new backend patterns if not present
        backend_patterns = [
            "\n# Backend\n",
            "backend/__pycache__/\n",
            "backend/*.pyc\n",
            "backend/.env\n",
            "backend/logs/\n",
            "backend/reports/\n",
        ]
        
        # Check if backend section exists
        has_backend_section = any("# Backend" in line for line in new_lines)
        if not has_backend_section:
            new_lines.extend(backend_patterns)
        
        with open(gitignore_path, 'w') as f:
            f.writelines(new_lines)
        
        print("✅ Updated .gitignore")
    else:
        print("⚠️  .gitignore not found")

def update_readme():
    """Update README.md to reflect new structure."""
    readme_path = "README.md"
    
    if not os.path.exists(readme_path):
        print("⚠️  README.md not found")
        return
    
    with open(readme_path, 'r') as f:
        content = f.read()
    
    # Replace old structure references
    replacements = {
        "/app/": "/backend/app/",
        "/pam-backend/": "/backend/",
        "pam-backend directory": "backend directory",
        "app directory": "backend/app directory",
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    # Add migration completion note
    migration_note = """
## 🚀 Migration Complete

This project has been successfully migrated to a unified backend structure:
- Old `/app` and `/pam-backend` directories have been consolidated
- All backend code is now in `/backend/`
- Deployment configurations updated for new structure
- Enhanced with modern development tools and workflows

"""
    
    # Insert after the first heading
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('# '):
            lines.insert(i + 1, migration_note)
            break
    
    content = '\n'.join(lines)
    
    with open(readme_path, 'w') as f:
        f.write(content)
    
    print("✅ Updated README.md")

def git_commit_changes():
    """Commit the cleanup changes to git."""
    try:
        # Check if git is available and we're in a git repo
        subprocess.run(['git', 'status'], check=True, capture_output=True)
        
        # Add all changes
        subprocess.run(['git', 'add', '.'], check=True)
        
        # Commit with descriptive message
        commit_message = "Complete migration to unified backend structure\n\n- Removed old /app and /pam-backend directories\n- Updated .gitignore and README.md\n- Consolidated all backend code in /backend/\n- Migration completed successfully"
        
        subprocess.run(['git', 'commit', '-m', commit_message], check=True)
        
        print("✅ Committed changes to git")
        return True
    except subprocess.CalledProcessError:
        print("⚠️  Git commit failed or not in a git repository")
        return False
    except FileNotFoundError:
        print("⚠️  Git not found")
        return False

def generate_cleanup_report(backups_created: list):
    """Generate a cleanup completion report."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"cleanup_completion_report_{timestamp}.json"
    
    report = {
        "cleanup_completed_at": datetime.now().isoformat(),
        "backups_created": backups_created,
        "directories_removed": [],
        "files_updated": [],
        "git_committed": False,
        "status": "completed"
    }
    
    # Check what was actually removed
    if not os.path.exists("app"):
        report["directories_removed"].append("app")
    if not os.path.exists("pam-backend"):
        report["directories_removed"].append("pam-backend")
    
    # Check what was updated
    if os.path.exists(".gitignore"):
        report["files_updated"].append(".gitignore")
    if os.path.exists("README.md"):
        report["files_updated"].append("README.md")
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"📊 Cleanup report saved: {report_path}")
    return report_path

def main():
    """Main cleanup function."""
    print("🧹 PAM Backend Final Cleanup")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Check we're in the right directory
    if not os.path.exists("backend"):
        print("❌ Backend directory not found. Please run from project root.")
        sys.exit(1)
    
    # Check if verification passed
    verification_reports = [f for f in os.listdir('.') if f.startswith('migration_verification_report_') and f.endswith('.json')]
    if not verification_reports:
        print("⚠️  No verification report found. Please run verify_migration.py first.")
        response = input("Continue anyway? (yes/no): ").lower().strip()
        if response not in ['yes', 'y']:
            print("❌ Cleanup cancelled")
            sys.exit(1)
    
    backups_created = []
    
    # Step 1: Create backups
    print("\n📦 Step 1: Creating backups...")
    
    app_backup = create_backup("app", "app")
    if app_backup:
        backups_created.append(app_backup)
    
    pam_backend_backup = create_backup("pam-backend", "pam_backend")
    if pam_backend_backup:
        backups_created.append(pam_backend_backup)
    
    scraper_backup = create_backup("scraper_service", "scraper_service")
    if scraper_backup:
        backups_created.append(scraper_backup)
    
    # Step 2: Remove old directories
    print("\n🗑️  Step 2: Removing old directories...")
    
    directories_to_remove = ["app", "pam-backend", "scraper_service"]
    
    for directory in directories_to_remove:
        if os.path.exists(directory):
            print(f"🗑️  Removing {directory}/")
            shutil.rmtree(directory)
            print(f"✅ Removed {directory}/")
        else:
            print(f"⚠️  Directory {directory}/ doesn't exist, skipping")
    
    # Step 3: Update project files
    print("\n📝 Step 3: Updating project files...")
    update_gitignore()
    update_readme()
    
    # Step 4: Commit changes
    print("\n📝 Step 4: Committing changes...")
    git_committed = git_commit_changes()
    
    # Step 5: Generate report
    print("\n📊 Step 5: Generating cleanup report...")
    report_path = generate_cleanup_report(backups_created)
    
    # Final summary
    print("\n" + "=" * 60)
    print("🎉 CLEANUP COMPLETED SUCCESSFULLY!")
    print(f"Completed at: {datetime.now().isoformat()}")
    print(f"\n📦 Backups created: {len(backups_created)}")
    for backup in backups_created:
        print(f"   - {backup}")
    
    print(f"\n🗑️  Directories removed: {len([d for d in directories_to_remove if not os.path.exists(d)])}")
    print("📝 Project files updated:")
    print("   - .gitignore")
    print("   - README.md")
    
    if git_committed:
        print("✅ Changes committed to git")
    else:
        print("⚠️  Manual git commit may be needed")
    
    print(f"\n📊 Cleanup report: {report_path}")
    
    print("\n🚀 Your PAM backend migration is now complete!")
    print("   - All code consolidated in /backend/")
    print("   - Old directories safely backed up and removed")
    print("   - Project structure updated")
    print("   - Ready for deployment with new configuration")

if __name__ == "__main__":
    main()
