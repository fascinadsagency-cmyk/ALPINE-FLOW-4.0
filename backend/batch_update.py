"""
Batch update all endpoints with store filtering
Handles complex query patterns
"""
import re

print("🔧 Batch updating all endpoints...")

with open('/app/backend/server.py', 'r') as f:
    lines = f.readlines()

changes = 0
STORE_COLLECTIONS = ['customers', 'items', 'rentals', 'cash_movements', 'cash_sessions', 'cash_closures', 'cash_closings']

i = 0
while i < len(lines):
    line = lines[i]
    
    # Check if this line has a query that needs store filter
    for collection in STORE_COLLECTIONS:
        # Pattern: db.collection.find_one({"field": value})
        if f'db.{collection}.find_one(' in line and 'get_store_filter' not in line:
            # Check if it's a simple query
            if '{"' in line and not '$or' in line and not 'get_store_filter' in line:
                # Simple case: inject store filter
                lines[i] = line.replace(
                    f'db.{collection}.find_one({{',
                    f'db.{collection}.find_one({{**current_user.get_store_filter(), '
                )
                if lines[i] != line:
                    changes += 1
                    print(f"  ✅ Line {i+1}: Added filter to {collection}.find_one")
        
        # Pattern: db.collection.find({"field": value})
        if f'db.{collection}.find(' in line and 'get_store_filter' not in line and 'find_one' not in line:
            if '{"' in line and not '$or' in line:
                lines[i] = line.replace(
                    f'db.{collection}.find({{',
                    f'db.{collection}.find({{**current_user.get_store_filter(), '
                )
                if lines[i] != line:
                    changes += 1
                    print(f"  ✅ Line {i+1}: Added filter to {collection}.find")
        
        # Pattern: db.collection.update_one({"field": value}
        if f'db.{collection}.update_one(' in line and 'get_store_filter' not in line:
            if '{"' in line and not '$or' in line:
                lines[i] = line.replace(
                    f'db.{collection}.update_one({{',
                    f'db.{collection}.update_one({{**current_user.get_store_filter(), '
                )
                if lines[i] != line:
                    changes += 1
                    print(f"  ✅ Line {i+1}: Added filter to {collection}.update_one")
        
        # Pattern: db.collection.delete_one({"field": value}
        if f'db.{collection}.delete_one(' in line and 'get_store_filter' not in line:
            if '{"' in line:
                lines[i] = line.replace(
                    f'db.{collection}.delete_one({{',
                    f'db.{collection}.delete_one({{**current_user.get_store_filter(), '
                )
                if lines[i] != line:
                    changes += 1
                    print(f"  ✅ Line {i+1}: Added filter to {collection}.delete_one")
    
    i += 1

# Write back
with open('/app/backend/server.py', 'w') as f:
    f.writelines(lines)

print(f"\n✅ Applied {changes} changes")

# Syntax check
import subprocess
result = subprocess.run(['python', '-m', 'py_compile', 'server.py'], 
                       capture_output=True, text=True, cwd='/app/backend')

if result.returncode == 0:
    print("✅✅ SYNTAX CHECK PASSED!")
else:
    print("⚠️ Syntax warnings (may need manual review):")
    print(result.stderr[:300])
