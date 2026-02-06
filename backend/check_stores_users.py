import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def check_stores_and_users():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('TIENDAS Y USUARIOS EN EL SISTEMA')
    print('='*70)
    
    # Get all stores
    stores = await db.stores.find({}, {'_id': 0}).sort("store_id", 1).to_list(10)
    
    print('\n📋 TIENDAS REGISTRADAS:')
    print('-'*70)
    for store in stores:
        print(f"\n  🏪 Tienda {store['store_id']}: {store['name']}")
        print(f"     Estado: {store.get('status', 'active')}")
        print(f"     Plan: {store.get('plan', 'N/A')}")
        
        # Get users for this store
        users = await db.users.find(
            {"store_id": store['store_id']}, 
            {'_id': 0, 'username': 1, 'role': 1}
        ).to_list(20)
        
        if users:
            print(f"     👥 Usuarios ({len(users)}):")
            for user in users:
                print(f"        - {user['username']} ({user['role']})")
        else:
            print(f"     ⚠️  NO HAY USUARIOS PARA ESTA TIENDA")
    
    # Get super_admin users
    print('\n\n👑 SUPER ADMINS:')
    print('-'*70)
    super_admins = await db.users.find(
        {"role": "super_admin"}, 
        {'_id': 0, 'username': 1, 'store_id': 1}
    ).to_list(10)
    for sa in super_admins:
        print(f"  - {sa['username']} (store_id: {sa.get('store_id', 'None')})")
    
    print('\n' + '='*70)
    
    client.close()

asyncio.run(check_stores_and_users())
