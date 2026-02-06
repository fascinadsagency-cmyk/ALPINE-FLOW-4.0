"""
Update queries that use 'query' variable
"""
import re

print("🔧 Updating query variable patterns...")

with open('/app/backend/server.py', 'r') as f:
    content = f.read()

changes = 0

# Pattern: query = {}  (empty initialization)
# Should become: query = {**current_user.get_store_filter()}
pattern = r'(\n    query = \{\})'
replacement = r'\n    query = {**current_user.get_store_filter()}'
new_content = re.sub(pattern, replacement, content)
if new_content != content:
    count = len(re.findall(pattern, content))
    changes += count
    print(f"  ✅ Updated {count} empty query initializations")
    content = new_content

# Pattern: query = {"field": value}
# Should become: query = {**current_user.get_store_filter(), "field": value}
pattern = r'(\n    query = \{"[^"]+": )'
replacement = r'\n    query = {**current_user.get_store_filter(), "'
matches = re.findall(pattern, content)
for match in set(matches):
    old_pattern = match
    new_pattern = match[:12] + '{**current_user.get_store_filter(), ' + match[12:]
    content = content.replace(old_pattern, new_pattern)
    changes += 1

print(f"  ✅ Updated query variable assignments")

# Save
with open('/app/backend/server.py', 'w') as f:
    f.write(content)

print(f"\n✅ Total changes: {changes}")

import subprocess
result = subprocess.run(['python', '-m', 'py_compile', 'server.py'], 
                       capture_output=True, text=True, cwd='/app/backend')

if result.returncode == 0:
    print("✅✅ SYNTAX CHECK PASSED!")
else:
    print("⚠️ Syntax check:")
    print(result.stderr[:400])
