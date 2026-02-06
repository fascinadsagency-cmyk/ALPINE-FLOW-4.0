import os
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from uuid import uuid4

load_dotenv('.env')

async def create_store5_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    username = "tienda5_admin"
    password = "admin123"
    store_id = 5
    
    # Verificar si ya existe
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"✅ Usuario '{username}' ya existe")
        client.close()
        return
    
    # Crear el usuario
    user_id = str(uuid4())
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_doc = {
        "id": user_id,
        "username": username,
        "password": hashed_pw,
        "role": "admin",
        "store_id": store_id,
        "created_at": "2026-02-06T20:40:00.000Z"
    }
    
    await db.users.insert_one(user_doc)
    print(f"✅ Usuario creado: {username} / {password} (Store ID: {store_id})")
    
    client.close()

asyncio.run(create_store5_admin())
