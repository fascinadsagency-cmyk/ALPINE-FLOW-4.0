"""
Automated Multi-Tenant Transformation Script
Updates all endpoints to include store_id filtering
"""
import re

# Read the file
with open('/app/backend/server.py', 'r') as f:
    content = f.read()

# Pattern 1: Replace all `current_user: dict = Depends(get_current_user)` with CurrentUser
content = re.sub(
    r'current_user:\s*dict\s*=\s*Depends\(get_current_user\)',
    'current_user: CurrentUser = Depends(get_current_user)',
    content
)

# Pattern 2: Replace current_user["sub"] with current_user.user_id
content = content.replace('current_user["sub"]', 'current_user.user_id')
content = content.replace("current_user['sub']", 'current_user.user_id')

# Pattern 3: Replace current_user["username"] with current_user.username
content = content.replace('current_user["username"]', 'current_user.username')
content = content.replace("current_user['username']", 'current_user.username')

# Pattern 4: Replace current_user["role"] with current_user.role
content = content.replace('current_user["role"]', 'current_user.role')
content = content.replace("current_user['role']", 'current_user.role')

# Save the file
with open('/app/backend/server.py', 'w') as f:
    f.write(content)

print("✅ Step 1: Replaced all current_user dict access with CurrentUser attributes")
print(f"   Total replacements made")
