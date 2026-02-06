"""
Phase 2: Automated Multi-Tenant Endpoint Transformation
Updates all remaining endpoints to include store_id filtering
"""
import re

print("🚀 Starting Phase 2: Endpoint Transformation...")

with open('/app/backend/server.py', 'r') as f:
    content = f.read()

original_content = content

# ========== STEP 1: Update MongoDB queries to include store filter ==========
print("\n📝 STEP 1: Adding store_id filters to MongoDB queries...")

# Pattern: db.customers.find_one({"dni": ...})
# Replace with: db.customers.find_one({**current_user.get_store_filter(), "dni": ...})

patterns_to_update = [
    # find_one patterns
    (r'(await db\.(\w+)\.find_one\()(\{[^}]+\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # find patterns (not find_one)
    (r'(await db\.(\w+)\.find\()(\{[^}]*\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # count_documents
    (r'(await db\.(\w+)\.count_documents\()(\{[^}]*\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # update_one
    (r'(await db\.(\w+)\.update_one\()(\{[^}]+\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # update_many
    (r'(await db\.(\w+)\.update_many\()(\{[^}]+\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # delete_one
    (r'(await db\.(\w+)\.delete_one\()(\{[^}]+\})', r'\1{**current_user.get_store_filter(), **\3}'),
    
    # delete_many
    (r'(await db\.(\w+)\.delete_many\()(\{[^}]+\})', r'\1{**current_user.get_store_filter(), **\3}'),
]

# Collections that should have store_id filter
store_collections = ['customers', 'items', 'rentals', 'cash_movements', 'cash_sessions', 'cash_closures']

# Apply patterns with collection filtering
for pattern, replacement in patterns_to_update:
    # Find all matches
    matches = list(re.finditer(pattern, content))
    
    for match in reversed(matches):  # Reverse to maintain positions
        full_match = match.group(0)
        collection_name = match.group(2) if match.lastindex >= 2 else None
        
        # Only apply to store-aware collections
        if collection_name in store_collections:
            # Check if already has store filter
            if 'get_store_filter()' not in full_match and 'store_id' not in full_match:
                new_text = re.sub(pattern, replacement, full_match)
                content = content[:match.start()] + new_text + content[match.end():]
                print(f"  ✅ Updated {collection_name} query at position {match.start()}")

print(f"\n✅ STEP 1 Complete: MongoDB queries updated")

# ========== STEP 2: Add store_id to insert operations ==========
print("\n📝 STEP 2: Adding store_id to document inserts...")

# Pattern: doc = { "id": ..., ...
# Should become: doc = { "id": ..., "store_id": current_user.store_id, ...

insert_patterns = [
    (r'(await db\.customers\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
    (r'(await db\.items\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
    (r'(await db\.rentals\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
    (r'(await db\.cash_movements\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
    (r'(await db\.cash_sessions\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
    (r'(await db\.cash_closures\.insert_one\(\{)', r'\1"store_id": current_user.store_id, '),
]

for pattern, replacement in insert_patterns:
    content = re.sub(pattern, replacement, content)

print("✅ STEP 2 Complete: store_id added to inserts")

# ========== STEP 3: Handle special cases ==========
print("\n📝 STEP 3: Handling special cases...")

# Empty query patterns: db.items.find({})
# Should preserve empty but add store filter
content = re.sub(
    r'(await db\.(customers|items|rentals|cash_movements|cash_sessions|cash_closures)\.find)\(\{\}\)',
    r'\1(current_user.get_store_filter())',
    content
)

print("✅ STEP 3 Complete: Special cases handled")

# ========== Save file ==========
with open('/app/backend/server.py', 'w') as f:
    f.write(content)

# Calculate changes
changes = len([i for i in range(len(original_content)) if i < len(content) and original_content[i:i+1] != content[i:i+1]])

print(f"\n🎉 Phase 2 Complete!")
print(f"   Total character changes: ~{changes}")
print(f"   File saved: /app/backend/server.py")
