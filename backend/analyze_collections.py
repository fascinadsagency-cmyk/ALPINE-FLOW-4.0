import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def analyze_collections():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*60)
    print('ANÁLISIS DE COLECCIONES SIN STORE_ID')
    print('='*60)
    
    # Tariffs
    print('\n1. TARIFFS (Tarifas Individuales)')
    print('-'*60)
    tariff_sample = await db.tariffs.find_one({})
    if tariff_sample:
        print(f"Campos: {list(tariff_sample.keys())}")
        print(f"Ejemplo: {tariff_sample}")
        has_store_id = 'store_id' in tariff_sample
        print(f"¿Tiene store_id?: {'✅ SÍ' if has_store_id else '❌ NO'}")
    print(f"Total de tarifas: {await db.tariffs.count_documents({})}")
    
    # Packs
    print('\n2. PACKS (Packs/Combos)')
    print('-'*60)
    pack_sample = await db.packs.find_one({})
    if pack_sample:
        print(f"Campos: {list(pack_sample.keys())}")
        print(f"Ejemplo: {pack_sample}")
        has_store_id = 'store_id' in pack_sample
        print(f"¿Tiene store_id?: {'✅ SÍ' if has_store_id else '❌ NO'}")
    print(f"Total de packs: {await db.packs.count_documents({})}")
    
    # Sources
    print('\n3. SOURCES (Proveedores)')
    print('-'*60)
    source_sample = await db.sources.find_one({})
    if source_sample:
        print(f"Campos: {list(source_sample.keys())}")
        print(f"Ejemplo: {source_sample}")
        has_store_id = 'store_id' in source_sample
        print(f"¿Tiene store_id?: {'✅ SÍ' if has_store_id else '❌ NO'}")
    print(f"Total de proveedores: {await db.sources.count_documents({})}")
    
    # Item Types
    print('\n4. ITEM_TYPES (Tipos de Artículos Personalizados)')
    print('-'*60)
    item_type_sample = await db.item_types.find_one({})
    if item_type_sample:
        print(f"Campos: {list(item_type_sample.keys())}")
        print(f"Ejemplo: {item_type_sample}")
        has_store_id = 'store_id' in item_type_sample
        print(f"¿Tiene store_id?: {'✅ SÍ' if has_store_id else '❌ NO'}")
    else:
        print("No hay item_types personalizados")
    print(f"Total de tipos personalizados: {await db.item_types.count_documents({})}")
    
    print('\n' + '='*60)
    print('RESUMEN')
    print('='*60)
    print('Colecciones que NECESITAN store_id:')
    print('  - tariffs (tarifas individuales)')
    print('  - packs (packs/combos)')
    print('  - sources (proveedores)')
    print('  - item_types (tipos personalizados)')
    
    client.close()

asyncio.run(analyze_collections())
