"""
Script de Migración para Multi-Tenant Completo
Añade store_id a las colecciones: tariffs, packs, sources, item_types
Asigna todos los datos existentes a store_id = 1 (tienda principal)
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('.env')

async def migrate_to_complete_multitenant():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('MIGRACIÓN A MULTI-TENANT COMPLETO')
    print('Añadiendo store_id a colecciones de configuración')
    print('='*70)
    
    # 1. Migrar TARIFFS
    print('\n1. Migrando TARIFFS (Tarifas Individuales)...')
    print('-'*70)
    tariffs_without_store = await db.tariffs.count_documents({"store_id": {"$exists": False}})
    if tariffs_without_store > 0:
        result = await db.tariffs.update_many(
            {"store_id": {"$exists": False}},
            {"$set": {"store_id": 1}}
        )
        print(f"✅ Actualizado: {result.modified_count} tarifas → store_id: 1")
    else:
        print("✅ Todas las tarifas ya tienen store_id")
    
    # Crear índice
    await db.tariffs.create_index([("store_id", 1), ("item_type", 1)])
    print("✅ Índice creado: (store_id, item_type)")
    
    # 2. Migrar PACKS
    print('\n2. Migrando PACKS (Packs/Combos)...')
    print('-'*70)
    packs_without_store = await db.packs.count_documents({"store_id": {"$exists": False}})
    if packs_without_store > 0:
        result = await db.packs.update_many(
            {"store_id": {"$exists": False}},
            {"$set": {"store_id": 1}}
        )
        print(f"✅ Actualizado: {result.modified_count} packs → store_id: 1")
    else:
        print("✅ Todos los packs ya tienen store_id")
    
    # Crear índice
    await db.packs.create_index([("store_id", 1)])
    print("✅ Índice creado: (store_id)")
    
    # 3. Migrar SOURCES (Proveedores)
    print('\n3. Migrando SOURCES (Proveedores)...')
    print('-'*70)
    sources_without_store = await db.sources.count_documents({"store_id": {"$exists": False}})
    if sources_without_store > 0:
        result = await db.sources.update_many(
            {"store_id": {"$exists": False}},
            {"$set": {"store_id": 1}}
        )
        print(f"✅ Actualizado: {result.modified_count} proveedores → store_id: 1")
    else:
        print("✅ Todos los proveedores ya tienen store_id")
    
    # Crear índice
    await db.sources.create_index([("store_id", 1), ("name", 1)])
    print("✅ Índice creado: (store_id, name)")
    
    # 4. Migrar ITEM_TYPES (Tipos Personalizados)
    print('\n4. Migrando ITEM_TYPES (Tipos Personalizados)...')
    print('-'*70)
    item_types_without_store = await db.item_types.count_documents({"store_id": {"$exists": False}})
    if item_types_without_store > 0:
        result = await db.item_types.update_many(
            {"store_id": {"$exists": False}},
            {"$set": {"store_id": 1}}
        )
        print(f"✅ Actualizado: {result.modified_count} tipos personalizados → store_id: 1")
    else:
        print("✅ Todos los tipos personalizados ya tienen store_id")
    
    # Crear índice
    await db.item_types.create_index([("store_id", 1), ("value", 1)])
    print("✅ Índice creado: (store_id, value)")
    
    # 5. Verificar migración
    print('\n' + '='*70)
    print('VERIFICACIÓN POST-MIGRACIÓN')
    print('='*70)
    
    tariffs_store1 = await db.tariffs.count_documents({"store_id": 1})
    tariffs_store2 = await db.tariffs.count_documents({"store_id": 2})
    tariffs_store3 = await db.tariffs.count_documents({"store_id": 3})
    print(f"\nTarifas por tienda:")
    print(f"  - Tienda 1: {tariffs_store1}")
    print(f"  - Tienda 2: {tariffs_store2}")
    print(f"  - Tienda 3: {tariffs_store3}")
    
    packs_store1 = await db.packs.count_documents({"store_id": 1})
    packs_store2 = await db.packs.count_documents({"store_id": 2})
    packs_store3 = await db.packs.count_documents({"store_id": 3})
    print(f"\nPacks por tienda:")
    print(f"  - Tienda 1: {packs_store1}")
    print(f"  - Tienda 2: {packs_store2}")
    print(f"  - Tienda 3: {packs_store3}")
    
    sources_store1 = await db.sources.count_documents({"store_id": 1})
    sources_store2 = await db.sources.count_documents({"store_id": 2})
    sources_store3 = await db.sources.count_documents({"store_id": 3})
    print(f"\nProveedores por tienda:")
    print(f"  - Tienda 1: {sources_store1}")
    print(f"  - Tienda 2: {sources_store2}")
    print(f"  - Tienda 3: {sources_store3}")
    
    item_types_store1 = await db.item_types.count_documents({"store_id": 1})
    item_types_store2 = await db.item_types.count_documents({"store_id": 2})
    item_types_store3 = await db.item_types.count_documents({"store_id": 3})
    print(f"\nTipos personalizados por tienda:")
    print(f"  - Tienda 1: {item_types_store1}")
    print(f"  - Tienda 2: {item_types_store2}")
    print(f"  - Tienda 3: {item_types_store3}")
    
    print('\n' + '='*70)
    if tariffs_store2 == 0 and tariffs_store3 == 0 and packs_store2 == 0 and packs_store3 == 0:
        print('✅ MIGRACIÓN EXITOSA')
        print('   Todas las configuraciones asignadas a Tienda 1')
        print('   Tiendas 2 y 3 están vacías (aislamiento completo)')
    else:
        print('⚠️  ADVERTENCIA: Algunas tiendas tienen datos heredados')
    
    print('='*70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_to_complete_multitenant())
