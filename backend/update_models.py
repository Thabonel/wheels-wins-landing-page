#!/usr/bin/env python3
"""
Script to update all hardcoded OpenAI model references to use the centralized configuration
Run this script to automatically update model references across the codebase
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Model mapping - old hardcoded values to new function calls
MODEL_REPLACEMENTS = [
    # GPT-4 Omni variants
    (r'"gpt-4o"', 'get_latest_model(ModelPurpose.GENERAL)'),
    (r'"gpt-4o-mini"', 'get_latest_model(ModelPurpose.QUICK)'),
    (r"'gpt-4o'", 'get_latest_model(ModelPurpose.GENERAL)'),
    (r"'gpt-4o-mini'", 'get_latest_model(ModelPurpose.QUICK)'),
    
    # GPT-4 Turbo variants
    (r'"gpt-4-turbo"', 'get_latest_model(ModelPurpose.GENERAL)'),
    (r'"gpt-4-turbo-preview"', 'get_latest_model(ModelPurpose.GENERAL)'),
    (r"'gpt-4-turbo'", 'get_latest_model(ModelPurpose.GENERAL)'),
    (r"'gpt-4-turbo-preview'", 'get_latest_model(ModelPurpose.GENERAL)'),
    
    # GPT-4 standard
    (r'"gpt-4"', 'get_latest_model(ModelPurpose.COMPLEX)'),
    (r"'gpt-4'", 'get_latest_model(ModelPurpose.COMPLEX)'),
    
    # GPT-3.5
    (r'"gpt-3.5-turbo"', 'get_latest_model(ModelPurpose.QUICK)'),
    (r"'gpt-3.5-turbo'", 'get_latest_model(ModelPurpose.QUICK)'),
    (r'"gpt-3.5-turbo-16k"', 'get_latest_model(ModelPurpose.QUICK)'),
    (r"'gpt-3.5-turbo-16k'", 'get_latest_model(ModelPurpose.QUICK)'),
]

# Files to skip
SKIP_FILES = [
    'ai_models_config.py',  # Don't modify the config file itself
    'update_models.py',      # Don't modify this script
    '.md',                   # Skip markdown files
    '.txt',                  # Skip text files
    '.json',                 # Skip JSON files
    '.yaml',                 # Skip YAML files
    '.yml',                  # Skip YAML files
    '__pycache__',          # Skip cache directories
    '.git',                 # Skip git directory
    'node_modules',         # Skip node modules
]

IMPORT_STATEMENT = """from app.core.ai_models_config import (
    get_latest_model, ModelPurpose, get_model_with_fallbacks
)"""

def should_skip_file(filepath: Path) -> bool:
    """Check if file should be skipped"""
    filepath_str = str(filepath)
    for skip_pattern in SKIP_FILES:
        if skip_pattern in filepath_str:
            return True
    
    # Only process Python files
    if not filepath.suffix == '.py':
        return True
    
    return False

def add_import_if_needed(content: str, filepath: Path) -> str:
    """Add import statement if it's not already present and models are used"""
    # Check if any model references exist
    has_model_refs = any(re.search(pattern, content) for pattern, _ in MODEL_REPLACEMENTS)
    
    if not has_model_refs:
        return content
    
    # Check if import already exists
    if 'from app.core.ai_models_config import' in content:
        return content
    
    # Find the right place to add import
    lines = content.split('\n')
    
    # Look for existing imports from app.core
    import_index = -1
    for i, line in enumerate(lines):
        if 'from app.core' in line:
            import_index = i
            break
    
    if import_index != -1:
        # Add after the last app.core import
        while import_index < len(lines) - 1 and lines[import_index + 1].startswith('from app.core'):
            import_index += 1
        lines.insert(import_index + 1, IMPORT_STATEMENT)
    else:
        # Look for any import statements
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                import_index = i
                break
        
        if import_index != -1:
            # Add after the last import
            while import_index < len(lines) - 1 and (lines[import_index + 1].startswith('import ') or lines[import_index + 1].startswith('from ')):
                import_index += 1
            lines.insert(import_index + 1, '\n' + IMPORT_STATEMENT)
        else:
            # Add at the beginning of the file (after docstring if present)
            if lines[0].startswith('"""'):
                # Find end of docstring
                for i in range(1, len(lines)):
                    if '"""' in lines[i]:
                        lines.insert(i + 1, '\n' + IMPORT_STATEMENT)
                        break
            else:
                lines.insert(0, IMPORT_STATEMENT + '\n')
    
    return '\n'.join(lines)

def update_file(filepath: Path) -> Tuple[bool, int]:
    """Update a single file, returns (was_modified, replacements_count)"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False, 0
    
    original_content = content
    replacements_count = 0
    
    # Apply replacements but only in model parameter contexts
    for pattern, replacement in MODEL_REPLACEMENTS:
        # Match only when it's a model parameter
        model_param_pattern = r'(model\s*=\s*)' + pattern
        if re.search(model_param_pattern, content):
            content = re.sub(model_param_pattern, r'\1' + replacement, content)
            replacements_count += len(re.findall(model_param_pattern, original_content))
    
    # Add import if needed
    if replacements_count > 0:
        content = add_import_if_needed(content, filepath)
    
    # Write back if modified
    if content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements_count
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False, 0
    
    return False, 0

def main():
    """Main function to update all files"""
    backend_dir = Path(__file__).parent
    
    total_files = 0
    modified_files = 0
    total_replacements = 0
    
    print("Starting model reference updates...")
    print(f"Scanning directory: {backend_dir}")
    print("-" * 50)
    
    for filepath in backend_dir.rglob('*.py'):
        if should_skip_file(filepath):
            continue
        
        total_files += 1
        was_modified, replacements = update_file(filepath)
        
        if was_modified:
            modified_files += 1
            total_replacements += replacements
            relative_path = filepath.relative_to(backend_dir)
            print(f"✓ Updated {relative_path} ({replacements} replacements)")
    
    print("-" * 50)
    print(f"Scan complete!")
    print(f"Files scanned: {total_files}")
    print(f"Files modified: {modified_files}")
    print(f"Total replacements: {total_replacements}")
    
    if modified_files > 0:
        print("\n⚠️  Please review the changes and test your application")
        print("   The model references have been updated to use the centralized configuration")

if __name__ == "__main__":
    main()