"""
Script de Reparación CRÍTICA: Asignar tarifas a TODOS los artículos
- Recorre todo el inventario
- Para cada artículo sin tarifa o precio:
  1. Busca la tarifa según su tipo
  2. Asigna tariff_id y rental_price
  3. Si no existe tarifa, la crea
"""
import os
import asyncio
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

load_dotenv('.env')


def normalize_type_name(type_name: str) -> str:
    if not type_name:
        return "general"
    normalized = type_name.lower().strip()
    accents = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u'}
    for acc, repl in accents.items():
        normalized = normalized.replace(acc, repl)
    normalized = re.sub(r'[\s_]+', '_', normalized)
    normalized = normalized.strip('_')
    return normalized if normalized else "general"


def format_type_label(normalized_value: str) -> str:
    return normalized_value.replace('_', ' ').title()


async def repair_tariffs():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('REPARACIÓN CRÍTICA: ASIGNACIÓN DE TARIFAS A ARTÍCULOS')
    print('='*70)
    
    # Get all stores
    stores = await db.stores.find({}, {"store_id": 1, "name": 1}).to_list(100)
    print(f"\n📦 Tiendas encontradas: {len(stores)}")
    
    total_repaired = 0
    total_tariffs_created = 0
    
    for store in stores:
        store_id = store["store_id"]
        store_name = store.get("name", f"Tienda {store_id}")
        print(f"\n--- {store_name} (ID: {store_id}) ---")
        
        # Find all items without tariff_id or rental_price
        items_to_repair = await db.items.find({
            "store_id": store_id,
            "status": {"$nin": ["deleted"]},
            "$or": [
                {"tariff_id": {"$exists": False}},
                {"tariff_id": ""},
                {"tariff_id": None},
                {"rental_price": {"$exists": False}},
                {"rental_price": None},
                {"rental_price": 0}  # Also repair items with price 0 if tariff has higher price
            ]
        }).to_list(None)
        
        print(f"   Artículos a reparar: {len(items_to_repair)}")
        
        if len(items_to_repair) == 0:
            print("   ✅ Todos los artículos tienen tarifa")
            continue
        
        repaired = 0
        tariffs_created = 0
        
        # Cache tariffs for this store
        tariff_cache = {}
        existing_tariffs = await db.tariffs.find({"store_id": store_id}).to_list(500)
        for t in existing_tariffs:
            tariff_cache[t["item_type"]] = {
                "id": t["id"],
                "daily_rate": t.get("daily_rate", 0)
            }
        
        for item in items_to_repair:
            item_type = item.get("item_type", "general")
            normalized_type = normalize_type_name(item_type)
            
            # Check if tariff exists in cache
            if normalized_type not in tariff_cache:
                # Create tariff
                tariff_id = str(uuid.uuid4())
                tariff_doc = {
                    "id": tariff_id,
                    "store_id": store_id,
                    "item_type": normalized_type,
                    "daily_rate": 0.0,
                    "deposit": 0.0,
                    "name": format_type_label(normalized_type),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.tariffs.insert_one(tariff_doc)
                tariff_cache[normalized_type] = {"id": tariff_id, "daily_rate": 0.0}
                tariffs_created += 1
                print(f"   💰 Tarifa creada: {normalized_type}")
            
            # Get tariff data
            tariff_data = tariff_cache[normalized_type]
            
            # Only update if tariff has a price OR item has no tariff_id
            current_price = item.get("rental_price", 0) or 0
            tariff_price = tariff_data["daily_rate"]
            current_tariff_id = item.get("tariff_id", "")
            
            # Update if: no tariff_id, OR tariff has higher price
            if not current_tariff_id or (tariff_price > 0 and current_price == 0):
                update_data = {
                    "tariff_id": tariff_data["id"],
                    "item_type": normalized_type  # Also normalize the type
                }
                # Update price only if tariff has a price
                if tariff_price > 0:
                    update_data["rental_price"] = tariff_price
                elif current_price == 0:
                    update_data["rental_price"] = tariff_price  # Will be 0 but at least it's set
                
                await db.items.update_one(
                    {"id": item["id"]},
                    {"$set": update_data}
                )
                repaired += 1
        
        print(f"   ✅ Reparados: {repaired}")
        print(f"   💰 Tarifas creadas: {tariffs_created}")
        
        total_repaired += repaired
        total_tariffs_created += tariffs_created
    
    # Final summary
    print('\n' + '='*70)
    print('RESUMEN DE REPARACIÓN')
    print('='*70)
    print(f"✅ Artículos reparados: {total_repaired}")
    print(f"💰 Tarifas creadas: {total_tariffs_created}")
    print('='*70)
    
    # Verification: count items still without tariff
    broken_count = await db.items.count_documents({
        "status": {"$nin": ["deleted"]},
        "$or": [
            {"tariff_id": {"$exists": False}},
            {"tariff_id": ""},
            {"tariff_id": None}
        ]
    })
    
    if broken_count == 0:
        print("\n🎉 VERIFICACIÓN: Todos los artículos tienen tarifa asignada")
    else:
        print(f"\n⚠️  VERIFICACIÓN: Aún hay {broken_count} artículos sin tarifa")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(repair_tariffs())
