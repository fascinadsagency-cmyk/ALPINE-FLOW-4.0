"""
Smart Multi-Tenant Endpoint Updater
Uses regex with careful pattern matching to add store filters
"""
import re

print("🚀 Starting smart endpoint update...")

with open('/app/backend/server.py', 'r') as f:
    content = f.read()

# Store original for comparison
original = content

# Collections that need store_id filtering
STORE_COLLECTIONS = ['customers', 'items', 'rentals', 'cash_movements', 'cash_sessions', 'cash_closures', 'cash_closings']

changes = 0

# ========== PATTERN 1: Simple empty queries ==========
# db.customers.find({}) → db.customers.find(current_user.get_store_filter())
for collection in STORE_COLLECTIONS:
    pattern = f'db.{collection}.find\\(\\{{\\}}\\)'
    replacement = f'db.{collection}.find(current_user.get_store_filter())'
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        count = content.count(pattern.replace('\\', ''))
        changes += count
        print(f"  ✅ Updated {count} empty queries for {collection}")
        content = new_content
    
    # count_documents too
    pattern = f'db.{collection}.count_documents\\(\\{{\\}}\\)'
    replacement = f'db.{collection}.count_documents(current_user.get_store_filter())'
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        count = content.count(pattern.replace('\\', ''))
        changes += count
        print(f"  ✅ Updated {count} empty count queries for {collection}")
        content = new_content

# ========== PATTERN 2: Simple field queries ==========
# db.customers.find_one({"dni": ...}) → db.customers.find_one({**current_user.get_store_filter(), "dni": ...})
for collection in STORE_COLLECTIONS:
    # find_one with single field
    pattern = f'(db\\.{collection}\\.find_one\\()(\\{{"[^"]+": [^}}]+\\}})'
    replacement = r'\1{**current_user.get_store_filter(), **\2}'
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        changes += 1
        content = new_content

print(f"\n✅ Phase 1: {changes} simple patterns updated")

# ========== PATTERN 3: Add store_id to inserts ==========
changes_insert = 0
for collection in STORE_COLLECTIONS:
    # Look for patterns like: doc = { "id": ...,
    # After the opening {, inject store_id
    pattern = f'(await db\\.{collection}\\.insert_one\\(\\{{)'
    
    matches = list(re.finditer(pattern, content))
    for match in reversed(matches):
        start = match.end() - 1  # Before the closing }
        # Check if store_id already exists nearby
        check_region = content[match.start():match.start()+200]
        if 'store_id' not in check_region:
            # Insert store_id after the {
            content = content[:match.end()] + '"store_id": current_user.store_id, ' + content[match.end():]
            changes_insert += 1

print(f"✅ Phase 2: {changes_insert} insert operations updated")

# Save
with open('/app/backend/server.py', 'w') as f:
    f.write(content)

print(f"\n🎉 Total changes: {changes + changes_insert}")
print("Running syntax check...")

import subprocess
result = subprocess.run(['python', '-m', 'py_compile', 'server.py'], 
                       capture_output=True, text=True, cwd='/app/backend')

if result.returncode == 0:
    print("✅✅ SYNTAX CHECK PASSED!")
else:
    print("❌ Syntax errors:")
    print(result.stderr[:500])
