import os
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from uuid import uuid4

load_dotenv('.env')

async def create_store4_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Configuración del nuevo usuario
    username = "tienda4_admin"
    password = "admin123"  # Contraseña temporal - cambiar después
    store_id = 4
    
    print('='*70)
    print('CREANDO USUARIO ADMIN PARA TIENDA 4')
    print('='*70)
    
    # Verificar si ya existe
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"\n⚠️  El usuario '{username}' ya existe")
        print(f"   Store ID: {existing.get('store_id')}")
        print(f"   Role: {existing.get('role')}")
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
        "created_at": "2026-02-06T20:30:00.000Z"
    }
    
    await db.users.insert_one(user_doc)
    
    print(f"\n✅ Usuario creado exitosamente!")
    print(f"\n📋 CREDENCIALES DE ACCESO:")
    print(f"   Tienda: PRUEBAS 3 (ID: 4)")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Role: admin")
    print(f"\n🔐 IMPORTANTE: Cambia la contraseña después del primer login")
    print('='*70)
    
    client.close()

asyncio.run(create_store4_admin())
