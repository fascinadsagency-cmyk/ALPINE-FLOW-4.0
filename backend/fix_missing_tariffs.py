"""
Script de Migración: Asignar tarifas a artículos importados sin tariff_id
Recorre todos los artículos que tienen item_type pero NO tienen tariff_id,
y les asigna automáticamente la tarifa correspondiente de su tienda.
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def fix_missing_tariffs():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('REPARACIÓN DE ARTÍCULOS SIN TARIFAS')
    print('='*70)
    
    # 1. Encontrar todos los artículos sin tariff_id
    items_without_tariff = await db.items.find(
        {
            "$or": [
                {"tariff_id": {"$exists": False}},
                {"tariff_id": ""},
                {"tariff_id": None}
            ],
            "item_type": {"$exists": True, "$ne": ""}
        },
        {"_id": 0, "id": 1, "store_id": 1, "item_type": 1, "barcode": 1, "brand": 1, "model": 1}
    ).to_list(10000)
    
    print(f"\n📦 Artículos encontrados sin tarifa: {len(items_without_tariff)}")
    
    if len(items_without_tariff) == 0:
        print("✅ Todos los artículos ya tienen tarifa asignada")
        client.close()
        return
    
    # 2. Agrupar por store_id para obtener tarifas
    stores_map = {}
    for item in items_without_tariff:
        store_id = item.get('store_id', 1)  # Default to store 1 if missing
        if store_id not in stores_map:
            stores_map[store_id] = []
        stores_map[store_id].append(item)
    
    print(f"\n🏪 Tiendas afectadas: {list(stores_map.keys())}")
    
    # 3. Para cada tienda, obtener sus tarifas y asignar
    total_updated = 0
    total_not_found = 0
    
    for store_id, items in stores_map.items():
        print(f"\n--- Procesando Tienda {store_id} ---")
        print(f"   Artículos sin tarifa: {len(items)}")
        
        # Obtener todas las tarifas de esta tienda
        tariffs = await db.tariffs.find(
            {"store_id": store_id},
            {"_id": 0, "id": 1, "item_type": 1}
        ).to_list(100)
        
        # Crear un mapa item_type -> tariff_id
        tariff_map = {t["item_type"]: t["id"] for t in tariffs}
        
        print(f"   Tarifas disponibles: {len(tariffs)}")
        print(f"   Tipos con tarifa: {list(tariff_map.keys())}")
        
        updated = 0
        not_found = 0
        
        for item in items:
            item_type = item.get("item_type", "").strip().lower()
            
            if item_type in tariff_map:
                # Asignar tarifa
                tariff_id = tariff_map[item_type]
                await db.items.update_one(
                    {"id": item["id"]},
                    {"$set": {"tariff_id": tariff_id}}
                )
                updated += 1
            else:
                not_found += 1
                print(f"   ⚠️  No se encontró tarifa para tipo '{item_type}' (barcode: {item.get('barcode', 'N/A')})")
        
        print(f"   ✅ Actualizados: {updated}")
        print(f"   ⚠️  Sin tarifa disponible: {not_found}")
        
        total_updated += updated
        total_not_found += not_found
    
    # 4. Resumen final
    print('\n' + '='*70)
    print('RESUMEN FINAL')
    print('='*70)
    print(f"✅ Artículos reparados (tarifa asignada): {total_updated}")
    print(f"⚠️  Artículos sin tarifa disponible: {total_not_found}")
    
    if total_not_found > 0:
        print("\nNOTA: Los artículos sin tarifa necesitan que se cree")
        print("      la tarifa correspondiente en su tienda primero.")
    
    print('='*70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_missing_tariffs())
