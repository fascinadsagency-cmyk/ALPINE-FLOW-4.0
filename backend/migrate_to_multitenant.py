"""
Migration Script: Single-Tenant → Multi-Tenant Architecture
Adds store_id to all collections and creates store management structure
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import bcrypt

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

async def migrate_to_multitenant():
    print("🚀 Starting Multi-Tenant Migration...")
    print(f"📊 Database: {DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # ========== STEP 1: Create Stores Collection ==========
    print("\n📦 STEP 1: Creating Stores Collection...")
    
    store_1 = {
        "store_id": 1,
        "name": "EL ENEBRO",
        "status": "active",
        "plan": "enterprise",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "max_users": 50,
            "max_items": 100000,
            "max_customers": 100000
        },
        "contact": {
            "email": "",
            "phone": "",
            "address": ""
        }
    }
    
    existing_store = await db.stores.find_one({"store_id": 1})
    if not existing_store:
        await db.stores.insert_one(store_1)
        print("✅ Store 'EL ENEBRO' created with ID: 1")
    else:
        print("⚠️  Store ID 1 already exists, skipping creation")
    
    # ========== STEP 2: Migrate Collections ==========
    collections_to_migrate = [
        "customers",
        "items", 
        "rentals",
        "cash_movements",
        "cash_sessions",
        "cash_closures"
    ]
    
    print("\n🔄 STEP 2: Migrating Collections (adding store_id = 1)...")
    
    for collection_name in collections_to_migrate:
        print(f"\n  Migrating: {collection_name}")
        
        # Count documents without store_id
        count = await db[collection_name].count_documents({"store_id": {"$exists": False}})
        
        if count > 0:
            result = await db[collection_name].update_many(
                {"store_id": {"$exists": False}},
                {"$set": {"store_id": 1}}
            )
            print(f"    ✅ Updated {result.modified_count} documents")
        else:
            print(f"    ⏭️  All documents already have store_id")
    
    # ========== STEP 3: Update Users Collection ==========
    print("\n👥 STEP 3: Updating Users Collection...")
    
    # Update existing users (add store_id and ensure role)
    users_updated = await db.users.update_many(
        {"store_id": {"$exists": False}},
        {"$set": {"store_id": 1}}
    )
    print(f"  ✅ Added store_id to {users_updated.modified_count} existing users")
    
    # Ensure testcaja is ADMIN (not SUPER_ADMIN)
    await db.users.update_one(
        {"username": "testcaja"},
        {"$set": {"role": "admin", "store_id": 1}}
    )
    print("  ✅ User 'testcaja' set as ADMIN of Store 1")
    
    # Create SUPER_ADMIN user
    existing_super = await db.users.find_one({"username": "admin_master"})
    if not existing_super:
        hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
        super_admin = {
            "id": "super-admin-001",
            "username": "admin_master",
            "password": hashed.decode('utf-8'),
            "role": "super_admin",
            "store_id": None,  # SUPER_ADMIN has no store_id (access to all)
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin)
        print("  ✅ SUPER_ADMIN user 'admin_master' created (password: admin123)")
    else:
        # Update existing to super_admin role
        await db.users.update_one(
            {"username": "admin_master"},
            {"$set": {"role": "super_admin", "store_id": None}}
        )
        print("  ✅ User 'admin_master' updated to SUPER_ADMIN")
    
    # ========== STEP 4: Create Compound Indexes ==========
    print("\n🔍 STEP 4: Creating Compound Indexes (for performance)...")
    
    indexes = [
        ("customers", [("store_id", 1), ("dni", 1)]),
        ("customers", [("store_id", 1), ("name", 1)]),
        ("customers", [("store_id", 1), ("created_at", -1)]),
        ("items", [("store_id", 1), ("barcode", 1)]),
        ("items", [("store_id", 1), ("internal_code", 1)]),
        ("items", [("store_id", 1), ("status", 1)]),
        ("items", [("store_id", 1), ("item_type", 1)]),
        ("rentals", [("store_id", 1), ("status", 1)]),
        ("rentals", [("store_id", 1), ("customer_dni", 1)]),
        ("rentals", [("store_id", 1), ("start_date", -1)]),
        ("cash_movements", [("store_id", 1), ("date", -1)]),
        ("cash_sessions", [("store_id", 1), ("status", 1)]),
        ("cash_closures", [("store_id", 1), ("date", -1)])
    ]
    
    for collection_name, index_keys in indexes:
        try:
            await db[collection_name].create_index(index_keys)
            print(f"  ✅ Index on {collection_name}: {index_keys}")
        except Exception as e:
            print(f"  ⚠️  Index on {collection_name} may already exist: {e}")
    
    # ========== STEP 5: Verify Migration ==========
    print("\n✅ STEP 5: Verification...")
    
    for collection_name in collections_to_migrate:
        total = await db[collection_name].count_documents({})
        with_store = await db[collection_name].count_documents({"store_id": 1})
        print(f"  {collection_name}: {with_store}/{total} documents with store_id=1")
    
    print("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!")
    print("\n📋 Summary:")
    print("  - Store 'EL ENEBRO' created (ID: 1)")
    print("  - All existing data migrated to store_id = 1")
    print("  - User 'testcaja' → ADMIN of Store 1")
    print("  - User 'admin_master' → SUPER_ADMIN (password: admin123)")
    print("  - Compound indexes created for performance")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_to_multitenant())
