
#!/usr/bin/env python3
"""
Migration script to migrate from old PAM structure to new backend architecture.
Handles environment variables, custom code migration, deprecation detection, and reporting.
"""

import os
import sys
import json
import shutil
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import re
import subprocess
import hashlib

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PAMMigrator:
    """Main migration class for PAM backend migration."""
    
    def __init__(self, old_root: str = ".", new_root: str = "backend"):
        self.old_root = Path(old_root)
        self.new_root = Path(new_root)
        self.migration_report = {
            "timestamp": datetime.now().isoformat(),
            "migration_summary": {},
            "files_migrated": [],
            "deprecated_code": [],
            "environment_variables": {},
            "custom_code_found": [],
            "git_references": [],
            "warnings": [],
            "errors": []
        }
        
        # Ensure new root exists
        self.new_root.mkdir(exist_ok=True)
        
        # Create backup directory
        self.backup_dir = Path(f"migration_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        self.backup_dir.mkdir(exist_ok=True)
        
    def run_migration(self):
        """Run the complete migration process."""
        logger.info("🚀 Starting PAM Backend Migration")
        
        try:
            # Step 1: Create backup
            self._create_backup()
            
            # Step 2: Migrate environment variables
            self._migrate_environment_variables()
            
            # Step 3: Scan and migrate custom code
            self._migrate_custom_code()
            
            # Step 4: Identify deprecated code
            self._identify_deprecated_code()
            
            # Step 5: Handle data transformations
            self._handle_data_transformations()
            
            # Step 6: Preserve git history
            self._preserve_git_history()
            
            # Step 7: Generate migration report
            self._generate_migration_report()
            
            logger.info("✅ Migration completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {str(e)}")
            self.migration_report["errors"].append({
                "type": "migration_failure",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
            raise
    
    def _create_backup(self):
        """Create backup of current state."""
        logger.info("📦 Creating backup...")
        
        backup_paths = [
            "app",
            ".env*",
            "requirements*.txt",
            "*.py",
            "*.md"
        ]
        
        for pattern in backup_paths:
            for path in self.old_root.glob(pattern):
                if path.is_file():
                    backup_path = self.backup_dir / path.name
                    shutil.copy2(path, backup_path)
                elif path.is_dir() and not path.name.startswith('.'):
                    backup_path = self.backup_dir / path.name
                    shutil.copytree(path, backup_path, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        
        logger.info(f"Backup created at: {self.backup_dir}")
    
    def _migrate_environment_variables(self):
        """Migrate environment variables from old structure."""
        logger.info("🔧 Migrating environment variables...")
        
        env_files = [
            ".env",
            ".env.local",
            ".env.development",
            ".env.production",
            "pam-backend/.env"
        ]
        
        collected_vars = {}
        
        for env_file in env_files:
            env_path = self.old_root / env_file
            if env_path.exists():
                logger.info(f"Processing {env_file}")
                
                with open(env_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip().strip('"\'')
                            
                            # Map old variable names to new ones
                            key = self._map_environment_variable(key)
                            collected_vars[key] = value
        
        # Create new .env file
        new_env_path = self.new_root / ".env.example"
        with open(new_env_path, 'w') as f:
            f.write("# PAM Backend Environment Configuration\n")
            f.write(f"# Migrated on {datetime.now().isoformat()}\n\n")
            
            # Group variables by category
            categories = {
                "Core Services": ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"],
                "Database": ["DATABASE_URL", "POSTGRES_*"],
                "Redis": ["REDIS_URL", "REDIS_PASSWORD"],
                "Security": ["SECRET_KEY", "JWT_SECRET"],
                "External APIs": ["TWILIO_*", "STRIPE_*", "MAPBOX_*"],
                "Development": ["ENVIRONMENT", "DEBUG", "LOG_LEVEL"]
            }
            
            for category, patterns in categories.items():
                f.write(f"# {category}\n")
                for key, value in collected_vars.items():
                    if any(key.startswith(pattern.replace('*', '')) for pattern in patterns):
                        # Mask sensitive values
                        display_value = self._mask_sensitive_value(key, value)
                        f.write(f"{key}={display_value}\n")
                f.write("\n")
        
        self.migration_report["environment_variables"] = {
            "total_migrated": len(collected_vars),
            "variables": list(collected_vars.keys())
        }
        
        logger.info(f"Migrated {len(collected_vars)} environment variables")
    
    def _map_environment_variable(self, key: str) -> str:
        """Map old environment variable names to new ones."""
        mappings = {
            "VITE_SUPABASE_URL": "SUPABASE_URL",
            "VITE_SUPABASE_ANON_KEY": "SUPABASE_KEY",
            "VITE_OPENAI_API_KEY": "OPENAI_API_KEY",
            "VITE_MAPBOX_TOKEN": "MAPBOX_ACCESS_TOKEN"
        }
        return mappings.get(key, key)
    
    def _mask_sensitive_value(self, key: str, value: str) -> str:
        """Mask sensitive values in environment variables."""
        sensitive_patterns = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD']
        
        if any(pattern in key.upper() for pattern in sensitive_patterns):
            if len(value) > 8:
                return f"{value[:4]}...{value[-4:]}"
            else:
                return "***MASKED***"
        return value
    
    def _migrate_custom_code(self):
        """Migrate custom code from old app structure."""
        logger.info("📋 Migrating custom code...")
        
        old_app_dir = self.old_root / "app"
        if not old_app_dir.exists():
            logger.info("No old app directory found")
            return
        
        custom_code_files = []
        
        # Scan for custom code files
        for py_file in old_app_dir.rglob("*.py"):
            if self._is_custom_code(py_file):
                custom_code_files.append(py_file)
        
        # Migrate each custom file
        for file_path in custom_code_files:
            self._migrate_file(file_path)
        
        self.migration_report["custom_code_found"] = [
            str(f.relative_to(self.old_root)) for f in custom_code_files
        ]
        
        logger.info(f"Migrated {len(custom_code_files)} custom code files")
    
    def _is_custom_code(self, file_path: Path) -> bool:
        """Determine if a file contains custom code that needs migration."""
        # Skip common framework files
        skip_patterns = [
            "__pycache__",
            ".pyc",
            "__init__.py"
        ]
        
        if any(pattern in str(file_path) for pattern in skip_patterns):
            return False
        
        # Check if file has significant custom content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Skip files that are mostly imports or boilerplate
            lines = [line.strip() for line in content.split('\n') if line.strip()]
            non_import_lines = [line for line in lines if not line.startswith(('import ', 'from '))]
            
            return len(non_import_lines) > 5  # Has substantial content
            
        except Exception as e:
            logger.warning(f"Could not analyze {file_path}: {e}")
            return False
    
    def _migrate_file(self, old_file: Path):
        """Migrate a single file to new structure."""
        relative_path = old_file.relative_to(self.old_root / "app")
        new_file = self.new_root / "app" / relative_path
        
        # Ensure target directory exists
        new_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file and update imports
        with open(old_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update import paths
        updated_content = self._update_imports(content)
        
        with open(new_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        self.migration_report["files_migrated"].append({
            "old_path": str(old_file),
            "new_path": str(new_file),
            "size": old_file.stat().st_size
        })
        
        logger.info(f"Migrated: {relative_path}")
    
    def _update_imports(self, content: str) -> str:
        """Update import statements for new structure."""
        # Common import path updates
        updates = [
            (r'from app\.([^.\s]+)', r'from backend.app.\1'),
            (r'import app\.([^.\s]+)', r'import backend.app.\1'),
            (r'from \.([^.\s]+)', r'from .\1'),  # Keep relative imports
        ]
        
        for pattern, replacement in updates:
            content = re.sub(pattern, replacement, content)
        
        return content
    
    def _identify_deprecated_code(self):
        """Identify deprecated code patterns."""
        logger.info("🔍 Identifying deprecated code...")
        
        deprecated_patterns = [
            {
                "pattern": r"from flask import",
                "message": "Flask imports found - consider migrating to FastAPI",
                "severity": "warning"
            },
            {
                "pattern": r"sqlite3",
                "message": "SQLite usage found - migrate to PostgreSQL",
                "severity": "error"
            },
            {
                "pattern": r"pickle\.",
                "message": "Pickle usage found - consider JSON serialization",
                "severity": "warning"
            },
            {
                "pattern": r"eval\(",
                "message": "eval() usage found - security risk",
                "severity": "error"
            },
            {
                "pattern": r"exec\(",
                "message": "exec() usage found - security risk",
                "severity": "error"
            }
        ]
        
        deprecated_code = []
        
        # Scan all Python files
        for py_file in self.old_root.rglob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for pattern_info in deprecated_patterns:
                    matches = re.finditer(pattern_info["pattern"], content, re.MULTILINE)
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        deprecated_code.append({
                            "file": str(py_file.relative_to(self.old_root)),
                            "line": line_num,
                            "pattern": pattern_info["pattern"],
                            "message": pattern_info["message"],
                            "severity": pattern_info["severity"],
                            "code_snippet": match.group(0)
                        })
                        
            except Exception as e:
                logger.warning(f"Could not scan {py_file}: {e}")
        
        self.migration_report["deprecated_code"] = deprecated_code
        logger.info(f"Found {len(deprecated_code)} deprecated code instances")
    
    def _handle_data_transformations(self):
        """Handle any necessary data transformations."""
        logger.info("🔄 Handling data transformations...")
        
        transformations = []
        
        # Example: Transform old config format to new format
        old_config_path = self.old_root / "config.json"
        if old_config_path.exists():
            with open(old_config_path, 'r') as f:
                old_config = json.load(f)
            
            # Transform to new format
            new_config = {
                "version": "2.0",
                "migrated_from": "1.0",
                "settings": old_config
            }
            
            new_config_path = self.new_root / "app" / "core" / "config.json"
            new_config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(new_config_path, 'w') as f:
                json.dump(new_config, f, indent=2)
            
            transformations.append({
                "type": "config_transformation",
                "old_path": str(old_config_path),
                "new_path": str(new_config_path)
            })
        
        self.migration_report["data_transformations"] = transformations
        logger.info(f"Completed {len(transformations)} data transformations")
    
    def _preserve_git_history(self):
        """Preserve git history references."""
        logger.info("📚 Preserving git history...")
        
        git_refs = []
        
        try:
            # Get current commit hash
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.old_root,
                capture_output=True,
                text=True,
                check=True
            )
            current_commit = result.stdout.strip()
            git_refs.append({
                "type": "migration_point",
                "commit": current_commit,
                "timestamp": datetime.now().isoformat()
            })
            
            # Get recent commits for migrated files
            for file_info in self.migration_report["files_migrated"]:
                old_path = file_info["old_path"]
                try:
                    result = subprocess.run(
                        ["git", "log", "--oneline", "-5", old_path],
                        cwd=self.old_root,
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    if result.stdout:
                        git_refs.append({
                            "type": "file_history",
                            "file": old_path,
                            "recent_commits": result.stdout.strip().split('\n')
                        })
                except subprocess.CalledProcessError:
                    pass  # File might not be in git
                    
        except subprocess.CalledProcessError as e:
            logger.warning(f"Could not access git history: {e}")
            self.migration_report["warnings"].append(
                f"Git history could not be preserved: {e}"
            )
        
        self.migration_report["git_references"] = git_refs
        logger.info(f"Preserved {len(git_refs)} git references")
    
    def _generate_migration_report(self):
        """Generate comprehensive migration report."""
        logger.info("📊 Generating migration report...")
        
        # Calculate summary statistics
        self.migration_report["migration_summary"] = {
            "total_files_migrated": len(self.migration_report["files_migrated"]),
            "environment_variables_migrated": len(self.migration_report["environment_variables"].get("variables", [])),
            "deprecated_code_instances": len(self.migration_report["deprecated_code"]),
            "custom_code_files": len(self.migration_report["custom_code_found"]),
            "git_references_preserved": len(self.migration_report["git_references"]),
            "backup_location": str(self.backup_dir),
            "migration_status": "completed" if not self.migration_report["errors"] else "completed_with_errors"
        }
        
        # Write detailed report
        report_path = Path("migration_report.json")
        with open(report_path, 'w') as f:
            json.dump(self.migration_report, f, indent=2, default=str)
        
        # Write human-readable report
        readable_report_path = Path("migration_report.md")
        with open(readable_report_path, 'w') as f:
            f.write(self._generate_readable_report())
        
        logger.info(f"Migration report saved to: {report_path}")
        logger.info(f"Readable report saved to: {readable_report_path}")
    
    def _generate_readable_report(self) -> str:
        """Generate human-readable migration report."""
        report = []
        report.append("# PAM Backend Migration Report")
        report.append(f"**Migration Date:** {self.migration_report['timestamp']}")
        report.append("")
        
        # Summary
        summary = self.migration_report["migration_summary"]
        report.append("## Migration Summary")
        report.append(f"- **Status:** {summary['migration_status']}")
        report.append(f"- **Files Migrated:** {summary['total_files_migrated']}")
        report.append(f"- **Environment Variables:** {summary['environment_variables_migrated']}")
        report.append(f"- **Deprecated Code Found:** {summary['deprecated_code_instances']}")
        report.append(f"- **Backup Location:** {summary['backup_location']}")
        report.append("")
        
        # Deprecated Code
        if self.migration_report["deprecated_code"]:
            report.append("## ⚠️ Deprecated Code Found")
            report.append("The following code patterns should be updated:")
            report.append("")
            
            for dep in self.migration_report["deprecated_code"]:
                severity_emoji = "❌" if dep["severity"] == "error" else "⚠️"
                report.append(f"- {severity_emoji} **{dep['file']}:{dep['line']}**")
                report.append(f"  - Issue: {dep['message']}")
                report.append(f"  - Code: `{dep['code_snippet']}`")
                report.append("")
        
        # Files Migrated
        if self.migration_report["files_migrated"]:
            report.append("## ✅ Successfully Migrated Files")
            for file_info in self.migration_report["files_migrated"]:
                report.append(f"- `{file_info['old_path']}` → `{file_info['new_path']}`")
            report.append("")
        
        # Warnings and Errors
        if self.migration_report["warnings"]:
            report.append("## ⚠️ Warnings")
            for warning in self.migration_report["warnings"]:
                report.append(f"- {warning}")
            report.append("")
        
        if self.migration_report["errors"]:
            report.append("## ❌ Errors")
            for error in self.migration_report["errors"]:
                report.append(f"- {error['message']} ({error['timestamp']})")
            report.append("")
        
        # Next Steps
        report.append("## Next Steps")
        report.append("1. Review deprecated code instances and plan updates")
        report.append("2. Test migrated functionality thoroughly")
        report.append("3. Update CI/CD pipelines for new structure")
        report.append("4. Update documentation and team processes")
        report.append("5. Consider removing old code after validation")
        
        return '\n'.join(report)

def main():
    """Main migration function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate PAM to new backend structure')
    parser.add_argument('--old-root', default='.', help='Path to old PAM root directory')
    parser.add_argument('--new-root', default='backend', help='Path to new backend directory')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without making changes')
    
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No files will be modified")
        # TODO: Implement dry-run logic
        return
    
    migrator = PAMMigrator(args.old_root, args.new_root)
    
    try:
        migrator.run_migration()
        print("\n✅ Migration completed successfully!")
        print(f"📊 Check migration_report.md for detailed results")
        print(f"📦 Backup created at: {migrator.backup_dir}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("📋 Check migration.log for detailed error information")
        sys.exit(1)

if __name__ == "__main__":
    main()
