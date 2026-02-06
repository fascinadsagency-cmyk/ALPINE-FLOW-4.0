import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def check_superadmin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check for super_admin users
    super_admins = await db.users.find(
        {"role": "super_admin"}, 
        {'_id': 0, 'id': 1, 'username': 1, 'role': 1, 'store_id': 1}
    ).to_list(10)
    
    print('=== SUPER ADMIN USERS ===')
    if super_admins:
        for u in super_admins:
            print(f"  - {u.get('username')} | Role: {u.get('role')} | Store: {u.get('store_id')}")
    else:
        print("  ❌ NO SUPER_ADMIN USERS FOUND")
    
    # Check admin role users
    print('\n=== ADMIN ROLE USERS ===')
    admins = await db.users.find(
        {"role": "admin"}, 
        {'_id': 0, 'id': 1, 'username': 1, 'role': 1, 'store_id': 1}
    ).to_list(10)
    if admins:
        for u in admins:
            print(f"  - {u.get('username')} | Role: {u.get('role')} | Store: {u.get('store_id')}")
    else:
        print("  ❌ NO ADMIN ROLE USERS FOUND")
    
    # Check all roles
    print('\n=== ALL ROLES IN DATABASE ===')
    roles = await db.users.distinct("role")
    for role in roles:
        count = await db.users.count_documents({"role": role})
        print(f"  - {role}: {count} users")
    
    client.close()

asyncio.run(check_superadmin())
