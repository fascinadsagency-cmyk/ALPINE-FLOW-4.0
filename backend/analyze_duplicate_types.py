"""
Script de Análisis: Detectar tipos duplicados
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv('.env')

async def analyze_duplicates():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('ANÁLISIS DE TIPOS DUPLICADOS')
    print('='*70)
    
    # Get all item_types grouped by store
    stores = await db.stores.find({}, {'_id': 0, 'store_id': 1, 'name': 1}).to_list(20)
    
    for store in stores:
        store_id = store['store_id']
        store_name = store['name']
        
        print(f'\n--- Tienda {store_id}: {store_name} ---')
        
        # Get all types for this store
        types = await db.item_types.find(
            {"store_id": store_id},
            {"_id": 0, "id": 1, "value": 1, "label": 1}
        ).to_list(100)
        
        print(f'Total de tipos: {len(types)}')
        
        # Normalize and detect duplicates
        normalized_map = defaultdict(list)
        
        for t in types:
            # Normalize: lowercase, strip spaces
            normalized_value = t['value'].lower().strip().replace(" ", "_")
            normalized_label = t['label'].lower().strip()
            
            normalized_map[normalized_value].append(t)
        
        # Find duplicates
        duplicates = {k: v for k, v in normalized_map.items() if len(v) > 1}
        
        if duplicates:
            print(f'\n⚠️  DUPLICADOS ENCONTRADOS: {len(duplicates)} grupos')
            
            for norm_value, type_list in duplicates.items():
                print(f'\n  Grupo: "{norm_value}" ({len(type_list)} duplicados)')
                
                for t in type_list:
                    # Count items using this type
                    item_count = await db.items.count_documents({
                        "store_id": store_id,
                        "item_type": t['value']
                    })
                    
                    # Check if there's a tariff
                    tariff = await db.tariffs.find_one({
                        "store_id": store_id,
                        "item_type": t['value']
                    })
                    
                    print(f'    - "{t["value"]}" ({t["label"]})')
                    print(f'      ID: {t["id"]}')
                    print(f'      Artículos: {item_count}')
                    print(f'      Tarifa: {"✅ SÍ" if tariff else "❌ NO"}')
        else:
            print('✅ No hay duplicados en esta tienda')
    
    print('\n' + '='*70)
    client.close()

asyncio.run(analyze_duplicates())
