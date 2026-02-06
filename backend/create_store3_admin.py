import os
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from uuid import uuid4

load_dotenv('.env')

async def create_store3_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    username = "tienda3_admin"
    password = "test789"
    
    # Check if user exists
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"✅ Usuario '{username}' ya existe")
        print(f"   Credenciales: {username} / {password}")
        client.close()
        return
    
    # Create user
    user_id = str(uuid4())
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_doc = {
        "id": user_id,
        "username": username,
        "password": hashed_pw,
        "role": "admin",
        "store_id": 3,
        "created_at": "2026-02-06T16:20:00.000Z"
    }
    
    await db.users.insert_one(user_doc)
    print(f"✅ Usuario creado exitosamente")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Role: admin")
    print(f"   Store ID: 3")
    
    client.close()

asyncio.run(create_store3_admin())
