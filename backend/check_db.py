import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def check_users():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check users
    users = await db.users.find({}, {'_id': 0, 'id': 1, 'username': 1, 'role': 1, 'store_id': 1}).to_list(10)
    print('=== USERS ===')
    for u in users:
        print(f"  - {u.get('username')} | Role: {u.get('role')} | Store: {u.get('store_id')}")
    
    # Check stores
    stores = await db.stores.find({}, {'_id': 0}).to_list(10)
    print('\n=== STORES ===')
    for s in stores:
        print(f"  - ID: {s.get('store_id')} | Name: {s.get('name')} | Status: {s.get('status')}")
    
    # Check items count per store
    print('\n=== ITEMS COUNT PER STORE ===')
    pipeline = [
        {'$group': {'_id': '$store_id', 'count': {'$sum': 1}}}
    ]
    items = await db.items.aggregate(pipeline).to_list(10)
    for item in items:
        print(f"  - Store {item.get('_id')}: {item.get('count')} items")
    
    # Check customers count per store
    print('\n=== CUSTOMERS COUNT PER STORE ===')
    customers = await db.customers.aggregate(pipeline).to_list(10)
    for cust in customers:
        print(f"  - Store {cust.get('_id')}: {cust.get('count')} customers")
    
    # Check rentals count per store
    print('\n=== RENTALS COUNT PER STORE ===')
    rentals = await db.rentals.aggregate(pipeline).to_list(10)
    for rent in rentals:
        print(f"  - Store {rent.get('_id')}: {rent.get('count')} rentals")
    
    client.close()

asyncio.run(check_users())
