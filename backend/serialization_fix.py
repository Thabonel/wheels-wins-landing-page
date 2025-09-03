#!/usr/bin/env python3
"""
Fix datetime JSON serialization errors across the codebase
"""

import os
import re
import glob

# Create a DateTimeEncoder utility that can be imported
datetime_encoder_import = '''from datetime import datetime, date
import json

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects"""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)
'''

# Write the utility
with open('app/utils/datetime_encoder.py', 'w') as f:
    f.write(datetime_encoder_import)

print("✅ Created datetime encoder utility")

# Find and fix problematic json.dumps calls
patterns_to_fix = [
    (r'json\.dumps\(([^,]+),\s*default=str([^)]*)\)', r'json.dumps(\1, cls=DateTimeEncoder\2)'),
]

files_to_check = []
for root, dirs, files in os.walk('app'):
    for file in files:
        if file.endswith('.py'):
            files_to_check.append(os.path.join(root, file))

fixed_files = []

for file_path in files_to_check:
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        needs_import = False
        
        for pattern, replacement in patterns_to_fix:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                needs_import = True
        
        # Add import if needed and not already present
        if needs_import and 'from app.utils.datetime_encoder import DateTimeEncoder' not in content:
            # Add import after other imports
            lines = content.split('\n')
            import_line = 'from app.utils.datetime_encoder import DateTimeEncoder'
            
            # Find last import line
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith(('import ', 'from ')) and 'import' in line:
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, import_line)
                content = '\n'.join(lines)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            fixed_files.append(file_path)
            print(f"✅ Fixed datetime serialization in {file_path}")
    
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")

if fixed_files:
    print(f"\n🎉 Fixed datetime serialization in {len(fixed_files)} files:")
    for file in fixed_files:
        print(f"   - {file}")
else:
    print("ℹ️ No files needed fixing")