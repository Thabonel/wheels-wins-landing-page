#!/usr/bin/env python3
"""
Intelligent Context Saver for Claude Code Sessions
Automatically saves project context at meaningful development milestones
"""

import os
import json
import time
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set
import asyncio
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/context_saver.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class IntelligentContextSaver:
    """Intelligent context saving system that triggers on meaningful events"""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.context_dir = self.project_root / '.claude_context'
        self.context_dir.mkdir(exist_ok=True)

        # State tracking
        self.last_save_time = time.time()
        self.file_hashes = {}
        self.recent_changes = []
        self.save_triggers = []

        # Intelligence thresholds
        self.min_save_interval = 300  # 5 minutes minimum between saves
        self.significance_threshold = 0.7  # 0-1 scale

        # File patterns that indicate significant work
        self.significant_patterns = {
            'code_files': ['*.py', '*.js', '*.ts', '*.tsx', '*.jsx'],
            'config_files': ['*.json', '*.yaml', '*.yml', '*.toml', '*.env'],
            'docs': ['*.md', '*.rst', '*.txt'],
            'tests': ['*test*.py', '*spec*.js', '*test*.ts'],
            'database': ['*.sql', 'migrations/*']
        }

        # Keywords that indicate significant changes
        self.significant_keywords = {
            'fixes': ['fix', 'bug', 'error', 'issue', 'resolve', 'correct'],
            'features': ['add', 'implement', 'create', 'new', 'feature'],
            'refactor': ['refactor', 'restructure', 'optimize', 'improve'],
            'integration': ['api', 'service', 'endpoint', 'integration'],
            'database': ['schema', 'migration', 'table', 'query', 'database'],
            'critical': ['critical', 'important', 'urgent', 'breaking']
        }

    async def analyze_significance(self, changed_files: List[str], git_diff: str = None) -> float:
        """Analyze the significance of recent changes (0-1 scale)"""
        significance = 0.0

        try:
            # File type significance
            for file_path in changed_files:
                file_path_lower = file_path.lower()

                # Code files are highly significant
                if any(file_path_lower.endswith(ext.replace('*', '')) for ext in self.significant_patterns['code_files']):
                    significance += 0.3

                # Config changes are significant
                if any(file_path_lower.endswith(ext.replace('*', '')) for ext in self.significant_patterns['config_files']):
                    significance += 0.2

                # Test files indicate feature work
                if 'test' in file_path_lower or 'spec' in file_path_lower:
                    significance += 0.15

                # Database files are critical
                if any(pattern in file_path_lower for pattern in ['migration', 'schema', '.sql']):
                    significance += 0.4

            # Git commit message analysis
            if git_diff:
                commit_message = self.get_last_commit_message()
                if commit_message:
                    message_lower = commit_message.lower()

                    for category, keywords in self.significant_keywords.items():
                        for keyword in keywords:
                            if keyword in message_lower:
                                if category == 'critical':
                                    significance += 0.3
                                elif category == 'fixes':
                                    significance += 0.25
                                elif category == 'features':
                                    significance += 0.2
                                else:
                                    significance += 0.1

            # Scale significance (prevent over 1.0)
            significance = min(significance, 1.0)

            logger.info(f"Change significance analysis: {significance:.2f}")
            return significance

        except Exception as e:
            logger.error(f"Error analyzing significance: {e}")
            return 0.5  # Default moderate significance

    def get_last_commit_message(self) -> str:
        """Get the last git commit message"""
        try:
            result = subprocess.run(
                ['git', 'log', '-1', '--pretty=%B'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            return result.stdout.strip() if result.returncode == 0 else ""
        except Exception as e:
            logger.error(f"Error getting commit message: {e}")
            return ""

    def get_changed_files(self) -> List[str]:
        """Get list of files changed since last save"""
        try:
            # Get git diff since last save timestamp
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'HEAD~1..HEAD'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                return [f for f in result.stdout.strip().split('\n') if f]

            return []
        except Exception as e:
            logger.error(f"Error getting changed files: {e}")
            return []

    async def should_save_context(self) -> bool:
        """Determine if context should be saved based on intelligent criteria"""
        current_time = time.time()

        # Minimum time check
        if current_time - self.last_save_time < self.min_save_interval:
            return False

        # Get recent changes
        changed_files = self.get_changed_files()
        if not changed_files:
            return False

        # Analyze significance
        significance = await self.analyze_significance(changed_files)

        # Additional intelligent checks
        intelligence_factors = {
            'file_count': min(len(changed_files) / 10, 0.3),  # More files = more significant
            'time_factor': min((current_time - self.last_save_time) / 3600, 0.2),  # Time weight
            'git_activity': 0.1 if self.has_recent_commits() else 0
        }

        total_significance = significance + sum(intelligence_factors.values())

        should_save = total_significance >= self.significance_threshold

        logger.info(f"""
Context Save Decision:
- Changed files: {len(changed_files)}
- Base significance: {significance:.2f}
- Intelligence factors: {intelligence_factors}
- Total significance: {total_significance:.2f}
- Threshold: {self.significance_threshold}
- Decision: {'SAVE' if should_save else 'SKIP'}
        """.strip())

        return should_save

    def has_recent_commits(self) -> bool:
        """Check if there are recent git commits"""
        try:
            result = subprocess.run(
                ['git', 'log', '--oneline', '--since=1 hour ago'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            return bool(result.stdout.strip()) if result.returncode == 0 else False
        except:
            return False

    async def save_context(self):
        """Save current project context using multiple methods"""
        timestamp = datetime.now().isoformat()

        try:
            # 1. Update PROJECT_CONTEXT.md with latest state
            await self.update_project_context_file()

            # 2. Create a versioned context snapshot
            context_data = await self.gather_context_data()
            snapshot_file = self.context_dir / f"context_{timestamp.replace(':', '-')}.json"

            with open(snapshot_file, 'w') as f:
                json.dump(context_data, f, indent=2)

            # 3. Try to use MCP Memory Keeper if available
            await self.save_to_memory_keeper(context_data)

            # 4. Update git with context changes
            await self.commit_context_updates()

            self.last_save_time = time.time()
            logger.info(f"✅ Context saved successfully at {timestamp}")

        except Exception as e:
            logger.error(f"❌ Error saving context: {e}")

    async def gather_context_data(self) -> Dict:
        """Gather comprehensive context data"""
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.project_root),
            'recent_changes': self.get_changed_files(),
            'last_commit': self.get_last_commit_message(),
            'git_status': self.get_git_status(),
            'key_files': await self.get_key_file_summaries(),
            'current_issues': await self.extract_current_issues(),
            'recent_fixes': await self.extract_recent_fixes(),
            'next_steps': await self.extract_next_steps()
        }

    def get_git_status(self) -> str:
        """Get current git status"""
        try:
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            return result.stdout.strip() if result.returncode == 0 else ""
        except:
            return ""

    async def get_key_file_summaries(self) -> Dict[str, str]:
        """Get summaries of key project files"""
        key_files = {}

        # Find important files
        important_patterns = ['README.md', 'PROJECT_CONTEXT.md', '*.py', 'package.json']

        for pattern in important_patterns:
            for file_path in self.project_root.glob(f"**/{pattern}"):
                if file_path.is_file() and file_path.stat().st_size < 50000:  # Skip large files
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # Store first few lines as summary
                            lines = content.split('\n')[:10]
                            key_files[str(file_path.relative_to(self.project_root))] = '\n'.join(lines)
                    except:
                        continue

        return key_files

    async def extract_current_issues(self) -> List[str]:
        """Extract current issues from project context"""
        issues = []

        # Check PROJECT_CONTEXT.md for current issues
        context_file = self.project_root / 'PROJECT_CONTEXT.md'
        if context_file.exists():
            try:
                with open(context_file, 'r') as f:
                    content = f.read()

                # Extract issues section
                if 'Current Issues' in content:
                    lines = content.split('\n')
                    in_issues = False
                    for line in lines:
                        if 'Current Issues' in line:
                            in_issues = True
                            continue
                        if in_issues and line.startswith('#'):
                            break
                        if in_issues and line.strip().startswith('-'):
                            issues.append(line.strip())
            except:
                pass

        return issues

    async def extract_recent_fixes(self) -> List[str]:
        """Extract recent fixes from git commits"""
        fixes = []
        try:
            result = subprocess.run(
                ['git', 'log', '--oneline', '--since=1 week ago', '--grep=fix', '--grep=bug', '--grep=resolve'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                fixes = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        except:
            pass

        return fixes[:5]  # Last 5 fixes

    async def extract_next_steps(self) -> List[str]:
        """Extract next steps from project context"""
        next_steps = []

        # Look for TODO comments in code
        for py_file in self.project_root.glob('**/*.py'):
            try:
                with open(py_file, 'r') as f:
                    for line_num, line in enumerate(f, 1):
                        if 'TODO' in line or 'FIXME' in line:
                            next_steps.append(f"{py_file.name}:{line_num} - {line.strip()}")
            except:
                continue

        return next_steps[:10]  # Top 10 next steps

    async def update_project_context_file(self):
        """Update the PROJECT_CONTEXT.md file with latest information"""
        context_file = self.project_root / 'PROJECT_CONTEXT.md'
        if context_file.exists():
            # Update the timestamp in the file
            try:
                with open(context_file, 'r') as f:
                    content = f.read()

                # Update timestamp
                updated_content = content.replace(
                    '*Last Updated: 2025-09-15*',
                    f'*Last Updated: {datetime.now().strftime("%Y-%m-%d")}*'
                )

                with open(context_file, 'w') as f:
                    f.write(updated_content)

            except Exception as e:
                logger.error(f"Error updating PROJECT_CONTEXT.md: {e}")

    async def save_to_memory_keeper(self, context_data: Dict):
        """Attempt to save to MCP Memory Keeper if available"""
        try:
            # This would use the MCP Memory Keeper API
            # For now, we'll save a summary to a memory file
            memory_file = self.context_dir / 'memory_keeper_summary.json'

            summary = {
                'timestamp': context_data['timestamp'],
                'summary': f"Project state captured with {len(context_data.get('recent_changes', []))} recent changes",
                'key_points': [
                    f"Recent fixes: {len(context_data.get('recent_fixes', []))}",
                    f"Current issues: {len(context_data.get('current_issues', []))}",
                    f"Next steps: {len(context_data.get('next_steps', []))}"
                ]
            }

            with open(memory_file, 'w') as f:
                json.dump(summary, f, indent=2)

        except Exception as e:
            logger.error(f"Error saving to memory keeper: {e}")

    async def commit_context_updates(self):
        """Commit context updates to git"""
        try:
            subprocess.run(['git', 'add', '.claude_context/', 'PROJECT_CONTEXT.md'],
                         cwd=self.project_root, check=False)
            subprocess.run(['git', 'commit', '-m', 'chore: automated context update'],
                         cwd=self.project_root, check=False)
        except:
            pass  # Don't fail if git operations fail

class SmartFileWatcher(FileSystemEventHandler):
    """File watcher that triggers intelligent context saving"""

    def __init__(self, context_saver: IntelligentContextSaver):
        self.context_saver = context_saver
        self.change_buffer = []
        self.last_check = time.time()

    def on_modified(self, event):
        if event.is_directory:
            return

        # Buffer changes to avoid too frequent checks
        self.change_buffer.append(event.src_path)

        # Check every 30 seconds if we should save
        current_time = time.time()
        if current_time - self.last_check > 30:
            asyncio.create_task(self.check_and_save())
            self.last_check = current_time

    async def check_and_save(self):
        """Check if context should be saved based on recent changes"""
        if await self.context_saver.should_save_context():
            await self.context_saver.save_context()

        # Clear buffer
        self.change_buffer = []

async def main():
    """Main function to start intelligent context monitoring"""
    project_root = Path(__file__).parent.parent
    context_saver = IntelligentContextSaver(str(project_root))

    logger.info("🧠 Starting Intelligent Context Saver")
    logger.info(f"📁 Monitoring project: {project_root}")

    # Set up file watcher
    event_handler = SmartFileWatcher(context_saver)
    observer = Observer()
    observer.schedule(event_handler, str(project_root), recursive=True)
    observer.start()

    try:
        # Run indefinitely
        while True:
            await asyncio.sleep(60)  # Check every minute

            # Periodic intelligent check
            if await context_saver.should_save_context():
                await context_saver.save_context()

    except KeyboardInterrupt:
        logger.info("🛑 Stopping context saver")
        observer.stop()

    observer.join()

if __name__ == "__main__":
    asyncio.run(main())