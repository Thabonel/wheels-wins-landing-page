import re

# Read the app version
with open('app/nodes/you_node.py', 'r') as f:
    app_content = f.read()

# List of functions to extract
functions_to_extract = [
    "create_calendar_event",
    "get_user_profile", 
    "update_user_profile",
    "set_user_preferences",
    "get_personalized_dashboard",
    "schedule_maintenance_reminder",
    "get_travel_timeline"
]

# Extract each function
extracted = []
for func_name in functions_to_extract:
    # Find the function definition
    pattern = rf'(\n    async def {func_name}\(.*?\n(?:(?!    async def).*\n)*)'
    match = re.search(pattern, app_content, re.DOTALL)
    if match:
        extracted.append(match.group(1))

# Read backend file
with open('backend/app/services/pam/nodes/you_node.py', 'r') as f:
    backend_content = f.read()

# Insert before the global instance
insert_point = backend_content.find('# Global YOU node instance')
if insert_point > 0:
    new_content = backend_content[:insert_point] + '\n' + ''.join(extracted) + '\n' + backend_content[insert_point:]
    
    with open('backend/app/services/pam/nodes/you_node.py', 'w') as f:
        f.write(new_content)
    
    print(f"Added {len(extracted)} functions")
else:
    print("Could not find insert point")
