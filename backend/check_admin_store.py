import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    user = await db.users.find_one({'username': 'admin_master'}, {'_id': 0})
    print(f'✅ admin_master store_id: {user.get("store_id")}')
    print(f'✅ admin_master role: {user.get("role")}')
    
    customers_store1 = await db.customers.count_documents({'store_id': 1})
    customers_store2 = await db.customers.count_documents({'store_id': 2})
    print(f'\n📊 Customers Store 1 (Admin Master): {customers_store1}')
    print(f'📊 Customers Store 2: {customers_store2}')
    
    rentals_store1 = await db.rentals.count_documents({'store_id': 1})
    rentals_store2 = await db.rentals.count_documents({'store_id': 2})
    print(f'\n📊 Rentals Store 1 (Admin Master): {rentals_store1}')
    print(f'📊 Rentals Store 2: {rentals_store2}')
    
asyncio.run(check())
