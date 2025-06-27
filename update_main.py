import re

# Read the main.py file
with open('backend/app/main.py', 'r') as f:
    content = f.read()

# Add imports after the existing API imports
import_pattern = r'(from app\.api\.v1 import.*)'
import_replacement = r'\1, actions, demo, you'
content = re.sub(import_pattern, import_replacement, content)

# Add router includes after the last router include
router_section = content.find('app.include_router(social.router')
if router_section != -1:
    # Find the end of this line
    end_of_line = content.find('\n', router_section)
    # Add new routers after this line
    new_routers = '''
app.include_router(actions.router, prefix="/api/v1", tags=["Actions"])
app.include_router(demo.router, prefix="/api/v1", tags=["Demo"])
app.include_router(you.router, prefix="/api/v1", tags=["You"])'''
    content = content[:end_of_line] + new_routers + content[end_of_line:]

# Write back
with open('backend/app/main.py', 'w') as f:
    f.write(content)

print("Updated main.py with new routers")
