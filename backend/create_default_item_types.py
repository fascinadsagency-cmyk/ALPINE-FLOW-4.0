"""
Script para crear tipos de artículos predeterminados para todas las tiendas
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone
from uuid import uuid4

load_dotenv('.env')

# Tipos predeterminados para cada tienda nueva
DEFAULT_ITEM_TYPES = [
    {"value": "ski", "label": "Esquí"},
    {"value": "boot", "label": "Bota"},
    {"value": "snowboard", "label": "Tabla Snowboard"},
    {"value": "helmet", "label": "Casco"},
    {"value": "poles", "label": "Bastones"},
    {"value": "goggles", "label": "Máscaras"},
]

async def create_default_types_for_all_stores():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('CREACIÓN DE TIPOS PREDETERMINADOS PARA TODAS LAS TIENDAS')
    print('='*70)
    
    # Get all stores
    stores = await db.stores.find({}, {'_id': 0, 'store_id': 1, 'name': 1}).to_list(20)
    print(f'\nTiendas encontradas: {len(stores)}')
    
    total_created = 0
    
    for store in stores:
        store_id = store['store_id']
        store_name = store['name']
        
        print(f'\n--- Tienda {store_id}: {store_name} ---')
        
        # Check existing types for this store
        existing_types = await db.item_types.find(
            {"store_id": store_id},
            {"_id": 0, "value": 1}
        ).to_list(100)
        existing_values = {t['value'] for t in existing_types}
        
        print(f'   Tipos existentes: {len(existing_types)}')
        
        created_for_store = 0
        
        for item_type in DEFAULT_ITEM_TYPES:
            if item_type['value'] not in existing_values:
                # Create new type
                type_id = str(uuid4())
                doc = {
                    "id": type_id,
                    "store_id": store_id,
                    "value": item_type['value'],
                    "label": item_type['label'],
                    "is_default": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.item_types.insert_one(doc)
                created_for_store += 1
                print(f'   ✅ Creado: {item_type["label"]} ({item_type["value"]})')
        
        if created_for_store == 0:
            print(f'   ℹ️  Ya tiene todos los tipos predeterminados')
        
        total_created += created_for_store
    
    print('\n' + '='*70)
    print(f'✅ TOTAL DE TIPOS CREADOS: {total_created}')
    print('='*70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_default_types_for_all_stores())
