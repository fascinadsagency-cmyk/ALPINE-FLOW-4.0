"""
Script de Fusión de Tipos Duplicados
- Detecta tipos con nombres similares (case-insensitive, sin espacios)
- Reasigna artículos al tipo principal
- Reasigna tarifas al tipo principal
- Elimina tipos duplicados
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv('.env')

def normalize_type_value(value):
    """Normaliza el valor del tipo: lowercase, sin espacios extras, underscores"""
    return value.lower().strip().replace(" ", "_")

async def merge_duplicate_types():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('FUSIÓN DE TIPOS DUPLICADOS')
    print('='*70)
    
    # Get all stores
    stores = await db.stores.find({}, {'_id': 0, 'store_id': 1, 'name': 1}).to_list(20)
    
    total_merged = 0
    total_deleted = 0
    
    for store in stores:
        store_id = store['store_id']
        store_name = store['name']
        
        print(f'\n--- Tienda {store_id}: {store_name} ---')
        
        # Get all types for this store
        types = await db.item_types.find(
            {"store_id": store_id},
            {"_id": 0, "id": 1, "value": 1, "label": 1}
        ).to_list(100)
        
        if not types:
            print('  Sin tipos para procesar')
            continue
        
        # Group by normalized value
        normalized_groups = defaultdict(list)
        
        for t in types:
            normalized = normalize_type_value(t['value'])
            normalized_groups[normalized].append(t)
        
        # Find duplicates
        duplicates = {k: v for k, v in normalized_groups.items() if len(v) > 1}
        
        if not duplicates:
            print('  ✅ No hay duplicados')
            continue
        
        print(f'  ⚠️  {len(duplicates)} grupos de duplicados encontrados')
        
        for norm_value, type_list in duplicates.items():
            print(f'\n  Fusionando grupo: "{norm_value}" ({len(type_list)} duplicados)')
            
            # Choose the primary type (first one, or one with most items)
            primary_type = type_list[0]
            max_items = 0
            
            for t in type_list:
                count = await db.items.count_documents({
                    "store_id": store_id,
                    "item_type": t['value']
                })
                if count > max_items:
                    max_items = count
                    primary_type = t
            
            print(f'    Tipo principal: "{primary_type["value"]}" (ID: {primary_type["id"]})')
            
            # Merge duplicates into primary
            for t in type_list:
                if t['id'] == primary_type['id']:
                    continue  # Skip primary
                
                print(f'    Procesando duplicado: "{t["value"]}"')
                
                # 1. Reasignar artículos
                items_count = await db.items.count_documents({
                    "store_id": store_id,
                    "item_type": t['value']
                })
                
                if items_count > 0:
                    result = await db.items.update_many(
                        {"store_id": store_id, "item_type": t['value']},
                        {"$set": {"item_type": primary_type['value']}}
                    )
                    print(f'      ✅ {result.modified_count} artículos reasignados')
                
                # 2. Reasignar tarifa (si existe)
                tariff = await db.tariffs.find_one({
                    "store_id": store_id,
                    "item_type": t['value']
                })
                
                if tariff:
                    # Check if primary type already has a tariff
                    primary_tariff = await db.tariffs.find_one({
                        "store_id": store_id,
                        "item_type": primary_type['value']
                    })
                    
                    if not primary_tariff:
                        # Move tariff to primary type
                        await db.tariffs.update_one(
                            {"id": tariff['id']},
                            {"$set": {"item_type": primary_type['value']}}
                        )
                        print(f'      ✅ Tarifa reasignada a tipo principal')
                    else:
                        # Primary already has tariff, delete duplicate tariff
                        await db.tariffs.delete_one({"id": tariff['id']})
                        print(f'      ⚠️  Tarifa duplicada eliminada (primary ya tenía tarifa)')
                
                # 3. Eliminar tipo duplicado
                await db.item_types.delete_one({"id": t['id']})
                print(f'      ✅ Tipo duplicado eliminado')
                
                total_deleted += 1
            
            total_merged += 1
    
    print('\n' + '='*70)
    print(f'✅ FUSIÓN COMPLETADA')
    print(f'   Grupos fusionados: {total_merged}')
    print(f'   Tipos eliminados: {total_deleted}')
    print('='*70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(merge_duplicate_types())
