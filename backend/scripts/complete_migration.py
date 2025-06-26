
#!/usr/bin/env python3
"""
PAM Backend Complete Migration Script
Runs verification and optionally cleanup in sequence.
"""

import os
import sys
import subprocess
import asyncio
from datetime import datetime

def run_script(script_path: str, description: str) -> bool:
    """Run a Python script and return success status."""
    print(f"\n{'='*60}")
    print(f" {description}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run([sys.executable, script_path], check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print(f"❌ {description} failed: {e}")
        return False

async def main():
    """Main function to run complete migration process."""
    print("🚀 PAM Backend Complete Migration Process")
    print(f"Started at: {datetime.now().isoformat()}")
    
    # Check we're in the right directory
    if not os.path.exists("backend"):
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    scripts_dir = os.path.join("backend", "scripts")
    
    # Step 1: Run verification
    verify_script = os.path.join(scripts_dir, "verify_migration.py")
    if not os.path.exists(verify_script):
        print(f"❌ Verification script not found: {verify_script}")
        sys.exit(1)
    
    print("Step 1: Running migration verification...")
    if not run_script(verify_script, "Migration Verification"):
        print("\n❌ Migration verification failed!")
        print("Please fix the issues before proceeding.")
        sys.exit(1)
    
    print("\n✅ Migration verification passed!")
    
    # Step 2: Ask about cleanup
    print("\nStep 2: Old structure cleanup")
    response = input("Would you like to remove old directories now? (yes/no): ").lower().strip()
    
    if response in ['yes', 'y']:
        cleanup_script = os.path.join(scripts_dir, "cleanup_old_structure.py")
        if not os.path.exists(cleanup_script):
            print(f"❌ Cleanup script not found: {cleanup_script}")
            sys.exit(1)
        
        if run_script(cleanup_script, "Old Structure Cleanup"):
            print("\n🎉 Complete migration finished successfully!")
            print("Your PAM backend has been fully migrated to the new structure.")
        else:
            print("\n⚠️  Migration verification passed, but cleanup had issues.")
            print("You can run cleanup manually later if needed.")
    else:
        print("\n✅ Migration verification complete!")
        print("Run cleanup_old_structure.py when you're ready to remove old directories.")
    
    print(f"\nCompleted at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    asyncio.run(main())
