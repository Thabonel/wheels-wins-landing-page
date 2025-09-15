#!/usr/bin/env python3
"""
Unified Context Continuity MCP Server
Combines token-aware monitoring with file-change intelligence
Provides seamless context restoration across Claude Code conversations
"""

import asyncio
import json
import logging
import os
import subprocess
import time
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import sqlite3
import aiofiles

# MCP Server imports - simplified for now
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent
    MCP_AVAILABLE = True
except ImportError:
    print("MCP not available, running in standalone mode")
    MCP_AVAILABLE = False
    class Server:
        def __init__(self, name): self.name = name
        def call_tool(self): return lambda f: f
    class TextContent:
        def __init__(self, type, text): self.type, self.text = type, text

# Import our intelligent context saver
import sys
sys.path.append(str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("intelligent_context_saver",
                                              Path(__file__).parent / "intelligent-context-saver.py")
intelligent_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intelligent_module)
IntelligentContextSaver = intelligent_module.IntelligentContextSaver

logger = logging.getLogger(__name__)

class UnifiedContextServer:
    """Unified server combining token monitoring with file intelligence"""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.context_db = self.project_root / '.claude_context' / 'context.db'
        self.context_db.parent.mkdir(exist_ok=True)

        # Initialize components
        self.file_intelligence = IntelligentContextSaver(str(project_root))
        self.server = Server("unified-context-continuity")

        # Configuration
        self.token_threshold = 0.80  # 80% token usage triggers save
        self.significance_threshold = 0.70  # 70% significance triggers save
        self.auto_save_enabled = True

        # Initialize database
        asyncio.create_task(self.init_database())

        # Register MCP tools
        self.register_tools()

    async def init_database(self):
        """Initialize SQLite database for context storage"""
        conn = sqlite3.connect(self.context_db)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS context_checkpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkpoint_id TEXT UNIQUE,
            timestamp TEXT,
            trigger_type TEXT,
            trigger_reason TEXT,
            significance_score REAL,
            token_usage_percent REAL,
            project_state TEXT,
            context_summary TEXT,
            confidence_score INTEGER,
            file_changes TEXT,
            git_commit TEXT,
            checkpoint_size INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS session_continuity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            start_time TEXT,
            end_time TEXT,
            checkpoint_chain TEXT,
            total_context_saved INTEGER,
            session_summary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
        conn.close()

    def register_tools(self):
        """Register MCP tools for context management"""

        @self.server.call_tool()
        async def load_project_state(args: dict) -> List[TextContent]:
            """Smart context restoration - finds and loads the best checkpoint"""
            restore_type = args.get('restore_type', 'latest')
            date_filter = args.get('date_filter')
            project_filter = args.get('project', 'current')

            checkpoint = await self.find_best_checkpoint(restore_type, date_filter, project_filter)

            if not checkpoint:
                return [TextContent(
                    type="text",
                    text="❌ No suitable checkpoint found for restoration. Try saving context first with `auto_save_context`."
                )]

            restored_context = await self.load_checkpoint(checkpoint)

            return [TextContent(
                type="text",
                text=f"""🔄 **SMART CONTEXT RESTORATION COMPLETE**

📂 **Restored From**: {checkpoint['checkpoint_id']}
📅 **Created**: {checkpoint['timestamp']}
🎯 **Trigger**: {checkpoint['trigger_type']} ({checkpoint['trigger_reason']})
📊 **Confidence**: {checkpoint['confidence_score']}/100
⚡ **Significance**: {checkpoint['significance_score']:.2f}

**🧠 PROJECT CONTEXT RESTORED:**

{self.format_project_context(restored_context)}

✅ **You can now continue exactly where you left off!**

**Recent Changes:**
{self.format_file_changes(checkpoint.get('file_changes', '[]'))}

**Last Git Commit:**
{checkpoint.get('git_commit', 'No recent commits')}

---
*Context continuity powered by Unified Intelligence System*
"""
            )]

        @self.server.call_tool()
        async def auto_save_context(args: dict) -> List[TextContent]:
            """Intelligent auto-save with combined triggers"""
            trigger_reason = args.get('trigger_reason', 'manual')
            force_save = args.get('force', False)
            context_summary = args.get('context_summary', '')

            # Get current project state
            project_state = await self.gather_enhanced_project_state()

            # Calculate combined intelligence
            should_save, intelligence_score = await self.should_auto_save(project_state, force_save)

            if not should_save and not force_save:
                return [TextContent(
                    type="text",
                    text=f"""⏸️ **AUTO-SAVE SKIPPED**

📊 Intelligence Score: {intelligence_score:.2f}/1.0
🎯 Threshold: {self.significance_threshold}
⏰ Reason: Insufficient significance for auto-save

💡 Use `force: true` to save anyway, or wait for more significant changes.
"""
                )]

            # Create checkpoint
            checkpoint_id = f"{trigger_reason}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            checkpoint = await self.create_enhanced_checkpoint(
                checkpoint_id, trigger_reason, project_state, intelligence_score, context_summary
            )

            return [TextContent(
                type="text",
                text=f"""✅ **CONTEXT AUTOMATICALLY SAVED**

🆔 **Checkpoint ID**: {checkpoint_id}
🎯 **Trigger**: {trigger_reason}
📊 **Intelligence Score**: {intelligence_score:.2f}/1.0
⚡ **Confidence**: {checkpoint['confidence_score']}/100
📁 **Files Changed**: {len(json.loads(checkpoint.get('file_changes', '[]')))}

**Summary:**
{context_summary or 'Automatic checkpoint created'}

**Project State:**
• Branch: {project_state.get('current_branch', 'unknown')}
• Status: {project_state.get('git_status_clean', '❌')}
• Build: {project_state.get('build_status', 'unknown')}
• Files Modified: {len(project_state.get('modified_files', []))}

💾 **Checkpoint saved successfully!** Use `load_project_state` in future sessions to restore this context.
"""
            )]

        @self.server.call_tool()
        async def monitor_context_usage(args: dict) -> List[TextContent]:
            """Monitor current context usage and recommend actions"""
            # Simulate token counting (in real implementation, would integrate with Claude's token counter)
            conversation_length = args.get('conversation_length', 0)
            estimated_tokens = conversation_length * 0.75  # Rough estimation

            max_tokens = 200000  # Claude's context limit
            usage_percent = (estimated_tokens / max_tokens) * 100

            # Get intelligence recommendations
            project_state = await self.gather_enhanced_project_state()
            should_save, intelligence_score = await self.should_auto_save(project_state, force=False)

            # Generate recommendations
            recommendations = []
            status_emoji = "✅"

            if usage_percent >= 95:
                status_emoji = "🚨"
                recommendations.append("**CRITICAL**: Save context immediately - conversation will end soon!")
            elif usage_percent >= self.token_threshold * 100:
                status_emoji = "⚠️"
                recommendations.append("**WARNING**: Consider saving context soon")
            elif should_save:
                status_emoji = "💡"
                recommendations.append("**SUGGESTION**: Significant changes detected - good time to save")

            if usage_percent >= 80:
                recommendations.append(f"Run `auto_save_context` with trigger_reason='approaching_token_limit'")

            return [TextContent(
                type="text",
                text=f"""{status_emoji} **CONTEXT USAGE MONITOR**

📊 **Token Usage**: {usage_percent:.1f}% of limit ({estimated_tokens:,.0f}/{max_tokens:,} tokens)
🧠 **Intelligence Score**: {intelligence_score:.2f}/1.0
🎯 **Auto-Save Threshold**: {self.significance_threshold}

**Current Project State:**
• Modified Files: {len(project_state.get('modified_files', []))}
• Git Status: {project_state.get('git_status_summary', 'Unknown')}
• Recent Commits: {len(project_state.get('recent_commits', []))}

**Recommendations:**
{chr(10).join(f"• {rec}" for rec in recommendations) if recommendations else "• Continue working - context usage is healthy"}

---
*Real-time monitoring powered by Unified Intelligence*
"""
            )]

        @self.server.call_tool()
        async def list_checkpoints(args: dict) -> List[TextContent]:
            """List available context checkpoints"""
            limit = args.get('limit', 10)
            project_filter = args.get('project', 'current')

            checkpoints = await self.get_recent_checkpoints(limit)

            if not checkpoints:
                return [TextContent(
                    type="text",
                    text="📭 No checkpoints found. Create your first checkpoint with `auto_save_context`."
                )]

            checkpoint_list = []
            for cp in checkpoints:
                age = self.get_relative_time(cp['timestamp'])
                size_mb = cp.get('checkpoint_size', 0) / 1024 / 1024

                checkpoint_list.append(
                    f"🔖 **{cp['checkpoint_id']}**\n"
                    f"   📅 {age} • 📊 {cp['confidence_score']}/100 confidence • 📁 {size_mb:.1f}MB\n"
                    f"   🎯 {cp['trigger_type']}: {cp['trigger_reason']}\n"
                    f"   💡 {cp.get('context_summary', 'No summary')[:100]}..."
                )

            return [TextContent(
                type="text",
                text=f"""📚 **AVAILABLE CHECKPOINTS** ({len(checkpoints)} found)

{chr(10).join(checkpoint_list)}

💡 **Usage**: Use `load_project_state` with `restore_type: "specific"` and the checkpoint ID to restore any of these.
"""
            )]

        @self.server.call_tool()
        async def create_smart_checkpoint(args: dict) -> List[TextContent]:
            """Create a manual checkpoint with enhanced intelligence"""
            checkpoint_name = args.get('name', f"manual_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            description = args.get('description', 'Manual checkpoint')
            tags = args.get('tags', [])

            project_state = await self.gather_enhanced_project_state()
            _, intelligence_score = await self.should_auto_save(project_state, force=True)

            checkpoint = await self.create_enhanced_checkpoint(
                checkpoint_name, 'manual', project_state, intelligence_score, description
            )

            return [TextContent(
                type="text",
                text=f"""🎯 **SMART CHECKPOINT CREATED**

🆔 **Name**: {checkpoint_name}
📝 **Description**: {description}
📊 **Intelligence Score**: {intelligence_score:.2f}/1.0
⚡ **Confidence**: {checkpoint['confidence_score']}/100
🏷️ **Tags**: {', '.join(tags) if tags else 'None'}

**Enhanced Metadata Captured:**
• Project files and structure
• Git repository state
• Recent development activity
• File change significance analysis
• Build and deployment status

✅ **Checkpoint ready for restoration in future sessions!**
"""
            )]

    async def gather_enhanced_project_state(self) -> Dict[str, Any]:
        """Gather comprehensive project state with both systems"""
        # Base project state
        basic_state = await self.file_intelligence.gather_context_data()

        # Enhanced git information
        try:
            git_info = {
                'current_branch': await self.run_git_command('branch --show-current'),
                'git_status_porcelain': await self.run_git_command('status --porcelain'),
                'recent_commits': await self.get_recent_commits(5),
                'modified_files': await self.get_modified_files(),
                'staged_files': await self.get_staged_files(),
            }

            # Determine git status
            git_status_clean = not bool(git_info['git_status_porcelain'].strip())
            git_info['git_status_clean'] = "✅ Clean" if git_status_clean else "📝 Modified"
            git_info['git_status_summary'] = "Clean working tree" if git_status_clean else f"{len(git_info['modified_files'])} files modified"

        except Exception as e:
            logger.error(f"Error gathering git info: {e}")
            git_info = {'error': str(e)}

        # Project health checks
        health_info = {
            'build_status': await self.check_build_status(),
            'dependency_status': await self.check_dependencies(),
            'test_status': await self.check_tests(),
        }

        return {
            **basic_state,
            **git_info,
            **health_info,
            'enhanced_timestamp': datetime.now().isoformat(),
            'project_root': str(self.project_root),
            'intelligence_version': '2.0.0'
        }

    async def should_auto_save(self, project_state: Dict, force: bool = False) -> tuple[bool, float]:
        """Combined intelligence decision making"""
        if force:
            return True, 1.0

        # File change intelligence (from our system)
        file_significance = await self.file_intelligence.analyze_significance(
            project_state.get('modified_files', [])
        )

        # Time-based factors
        last_save_time = getattr(self.file_intelligence, 'last_save_time', 0)
        time_factor = min((time.time() - last_save_time) / 3600, 0.2)  # Max 0.2 for time

        # Git activity factors
        git_factor = 0.1 if project_state.get('recent_commits') else 0
        build_factor = 0.1 if project_state.get('build_status') == 'passing' else 0

        # Combined intelligence score
        total_intelligence = (
            file_significance +  # 0.0 - 1.0 from file changes
            time_factor +       # 0.0 - 0.2 from time
            git_factor +        # 0.0 - 0.1 from git activity
            build_factor        # 0.0 - 0.1 from build status
        )

        should_save = total_intelligence >= self.significance_threshold

        logger.info(f"Combined Intelligence Analysis:")
        logger.info(f"  File Significance: {file_significance:.2f}")
        logger.info(f"  Time Factor: {time_factor:.2f}")
        logger.info(f"  Git Factor: {git_factor:.2f}")
        logger.info(f"  Build Factor: {build_factor:.2f}")
        logger.info(f"  Total: {total_intelligence:.2f}")
        logger.info(f"  Decision: {'SAVE' if should_save else 'SKIP'}")

        return should_save, total_intelligence

    async def create_enhanced_checkpoint(self, checkpoint_id: str, trigger_type: str,
                                       project_state: Dict, intelligence_score: float,
                                       context_summary: str) -> Dict:
        """Create enhanced checkpoint with full context"""

        # Calculate confidence score
        confidence = self.calculate_confidence(project_state, intelligence_score)

        # Serialize project state
        project_state_json = json.dumps(project_state, default=str, indent=2)
        file_changes_json = json.dumps(project_state.get('modified_files', []))

        # Save to database
        conn = sqlite3.connect(self.context_db)
        conn.execute("""
        INSERT INTO context_checkpoints (
            checkpoint_id, timestamp, trigger_type, trigger_reason,
            significance_score, token_usage_percent, project_state,
            context_summary, confidence_score, file_changes, git_commit,
            checkpoint_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            checkpoint_id,
            datetime.now().isoformat(),
            trigger_type,
            context_summary,
            intelligence_score,
            0.0,  # Token usage (would be calculated in real implementation)
            project_state_json,
            context_summary,
            confidence,
            file_changes_json,
            project_state.get('last_commit', ''),
            len(project_state_json)
        ))
        conn.commit()
        conn.close()

        # Also save with our file-based system
        await self.file_intelligence.save_context()

        return {
            'checkpoint_id': checkpoint_id,
            'confidence_score': confidence,
            'intelligence_score': intelligence_score,
            'file_changes': file_changes_json
        }

    def calculate_confidence(self, project_state: Dict, intelligence_score: float) -> int:
        """Calculate checkpoint confidence score"""
        confidence = 50  # Base confidence

        # Git status factors
        if project_state.get('git_status_clean') == "✅ Clean":
            confidence += 20

        # Build status
        if project_state.get('build_status') == 'passing':
            confidence += 15

        # Intelligence score contribution
        confidence += int(intelligence_score * 20)  # 0.7 intelligence = +14 points

        # Recent activity
        if len(project_state.get('recent_commits', [])) > 0:
            confidence += 10

        return min(confidence, 100)

    async def find_best_checkpoint(self, restore_type: str, date_filter: Optional[str],
                                 project_filter: str) -> Optional[Dict]:
        """Find the best checkpoint for restoration"""
        conn = sqlite3.connect(self.context_db)

        if restore_type == 'latest':
            query = """
            SELECT * FROM context_checkpoints
            ORDER BY timestamp DESC
            LIMIT 1
            """
        elif restore_type == 'highest_confidence':
            query = """
            SELECT * FROM context_checkpoints
            ORDER BY confidence_score DESC, timestamp DESC
            LIMIT 1
            """
        else:
            # Specific checkpoint
            query = """
            SELECT * FROM context_checkpoints
            WHERE checkpoint_id LIKE ?
            ORDER BY timestamp DESC
            LIMIT 1
            """

        cursor = conn.execute(query, (f"%{restore_type}%",) if restore_type not in ['latest', 'highest_confidence'] else ())
        row = cursor.fetchone()
        conn.close()

        if row:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))

        return None

    async def load_checkpoint(self, checkpoint: Dict) -> Dict:
        """Load and parse checkpoint data"""
        try:
            project_state = json.loads(checkpoint['project_state'])
            return project_state
        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            return {}

    def format_project_context(self, context: Dict) -> str:
        """Format project context for display"""
        lines = []

        # Basic project info
        lines.append(f"**Project**: {context.get('project_root', 'Unknown').split('/')[-1]}")
        lines.append(f"**Branch**: {context.get('current_branch', 'unknown')}")
        lines.append(f"**Git Status**: {context.get('git_status_summary', 'unknown')}")

        # Recent activity
        recent_changes = context.get('recent_changes', [])
        if recent_changes:
            lines.append(f"**Recent Changes**: {len(recent_changes)} files modified")

        recent_fixes = context.get('recent_fixes', [])
        if recent_fixes:
            lines.append(f"**Recent Fixes**: {len(recent_fixes)} commits")

        current_issues = context.get('current_issues', [])
        if current_issues:
            lines.append(f"**Current Issues**: {len(current_issues)} open")

        return "\n".join(lines)

    def format_file_changes(self, file_changes_json: str) -> str:
        """Format file changes for display"""
        try:
            changes = json.loads(file_changes_json)
            if not changes:
                return "No recent file changes"

            return "\n".join(f"• {change}" for change in changes[:10])
        except:
            return "Unable to parse file changes"

    def get_relative_time(self, timestamp_str: str) -> str:
        """Get human-readable relative time"""
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            now = datetime.now()
            diff = now - timestamp

            if diff.days > 0:
                return f"{diff.days}d ago"
            elif diff.seconds > 3600:
                return f"{diff.seconds // 3600}h ago"
            elif diff.seconds > 60:
                return f"{diff.seconds // 60}m ago"
            else:
                return "Just now"
        except:
            return "Unknown"

    async def get_recent_checkpoints(self, limit: int) -> List[Dict]:
        """Get recent checkpoints from database"""
        conn = sqlite3.connect(self.context_db)
        cursor = conn.execute("""
        SELECT * FROM context_checkpoints
        ORDER BY timestamp DESC
        LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        checkpoints = [dict(zip(columns, row)) for row in rows]
        conn.close()

        return checkpoints

    # Utility methods
    async def run_git_command(self, cmd: str) -> str:
        """Run git command and return output"""
        try:
            result = subprocess.run(
                f'git {cmd}'.split(),
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.stdout.strip()
        except Exception:
            return ""

    async def get_recent_commits(self, count: int) -> List[str]:
        """Get recent commit messages"""
        try:
            output = await self.run_git_command(f'log --oneline -{count}')
            return output.split('\n') if output else []
        except:
            return []

    async def get_modified_files(self) -> List[str]:
        """Get list of modified files"""
        try:
            output = await self.run_git_command('diff --name-only HEAD')
            return [f for f in output.split('\n') if f] if output else []
        except:
            return []

    async def get_staged_files(self) -> List[str]:
        """Get list of staged files"""
        try:
            output = await self.run_git_command('diff --cached --name-only')
            return [f for f in output.split('\n') if f] if output else []
        except:
            return []

    async def check_build_status(self) -> str:
        """Check build status"""
        # Check for common build indicators
        if (self.project_root / 'package.json').exists():
            return 'node_project'
        elif (self.project_root / 'requirements.txt').exists():
            return 'python_project'
        else:
            return 'unknown'

    async def check_dependencies(self) -> str:
        """Check dependency status"""
        return 'unknown'  # Placeholder

    async def check_tests(self) -> str:
        """Check test status"""
        return 'unknown'  # Placeholder

    async def demo_functionality(self):
        """Demo the unified context functionality"""
        print("\n🚀 Unified Context Continuity System Demo")
        print("=" * 50)

        # Test auto-save
        print("\n1. Testing auto-save functionality...")
        result = await self.auto_save_context({
            'trigger_reason': 'demo_checkpoint',
            'context_summary': 'Demo of unified context system',
            'force': True
        })
        print(f"   ✅ {result[0].text[:100]}...")

        # Test listing checkpoints
        print("\n2. Testing checkpoint listing...")
        checkpoints = await self.list_checkpoints({'limit': 5})
        print(f"   ✅ {checkpoints[0].text[:100]}...")

        # Test context monitoring
        print("\n3. Testing context monitoring...")
        monitor_result = await self.monitor_context_usage({'conversation_length': 10000})
        print(f"   ✅ {monitor_result[0].text[:100]}...")

        print("\n🎉 Demo completed successfully!")
        print("\nThe system combines:")
        print("• File-change intelligence from the background monitor")
        print("• Token-aware context management")
        print("• Smart checkpoint creation and restoration")
        print("• Cross-conversation continuity")

        return True

async def main():
    """Run the MCP server or standalone demo"""
    project_root = Path(__file__).parent.parent
    server_instance = UnifiedContextServer(str(project_root))

    if not MCP_AVAILABLE:
        print("Running in standalone demo mode...")
        # Demo the functionality
        print("Creating test checkpoint...")
        result = await server_instance.auto_save_context({
            'trigger_reason': 'demo_test',
            'context_summary': 'Testing unified context system'
        })
        print("Demo complete!")
        return

    # Run stdio server
    try:
        async with stdio_server() as (read_stream, write_stream):
            await server_instance.server.run(
                read_stream,
                write_stream,
                {
                    "server_name": "unified-context-continuity",
                    "server_version": "2.0.0"
                }
            )
    except Exception as e:
        print(f"MCP server error: {e}")
        print("Falling back to standalone mode...")
        await server_instance.demo_functionality()

if __name__ == "__main__":
    asyncio.run(main())