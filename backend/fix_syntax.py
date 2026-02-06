"""
Fix all remaining syntax errors from multi-tenant transformation
"""
import re

print("🔧 Fixing remaining syntax errors...")

with open('/app/backend/server.py', 'r') as f:
    lines = f.readlines()

# Track changes
fixed = 0

i = 0
while i < len(lines):
    line = lines[i]
    
    # Pattern 1: {**current_user.get_store_filter(), {
    # This should be: {**current_user.get_store_filter(),
    if 'get_store_filter(), {' in line:
        # Remove the extra {
        lines[i] = line.replace('get_store_filter(), {', 'get_store_filter(),')
        fixed += 1
        print(f"  Fixed line {i+1}: Removed extra opening brace")
    
    i += 1

# Write back
with open('/app/backend/server.py', 'w') as f:
    f.writelines(lines)

print(f"\n✅ Fixed {fixed} lines")
print("Running syntax check...")

import subprocess
result = subprocess.run(['python', '-m', 'py_compile', 'server.py'], 
                       capture_output=True, text=True)

if result.returncode == 0:
    print("✅ Syntax check PASSED!")
else:
    print("❌ Syntax errors remain:")
    print(result.stderr)
