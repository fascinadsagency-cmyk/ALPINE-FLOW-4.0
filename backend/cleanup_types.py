"""
Script de Limpieza de Base de Datos: Tipos de Artículos
- Elimina tipos sin artículos vinculados
- Crea tipos faltantes para artículos huérfanos
- Crea tarifas faltantes para tipos existentes
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
    """Normalize type name for consistent storage and comparison"""
    if not type_name:
        return ""
    normalized = type_name.lower().strip()
    accents = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u'}
    for acc, repl in accents.items():
        normalized = normalized.replace(acc, repl)
    normalized = re.sub(r'[\s_]+', '_', normalized)
    normalized = normalized.strip('_')
    return normalized


def format_type_label(normalized_value: str) -> str:
    """Create human-readable label from normalized value"""
    return normalized_value.replace('_', ' ').title()


async def cleanup_types():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('LIMPIEZA DE TIPOS DE ARTÍCULOS')
    print('='*70)
    
    # Get all stores
    stores = await db.stores.find({}, {"id": 1, "name": 1}).to_list(100)
    print(f"\n📦 Tiendas encontradas: {len(stores)}")
    
    total_types_deleted = 0
    total_types_created = 0
    total_tariffs_created = 0
    
    for store in stores:
        store_id = store["store_id"]
        store_name = store.get("name", f"Tienda {store_id}")
        print(f"\n--- {store_name} (ID: {store_id}) ---")
        
        # 1. ELIMINAR TIPOS SIN ARTÍCULOS
        print("\n1️⃣ Buscando tipos vacíos...")
        store_types = await db.item_types.find({"store_id": store_id}).to_list(1000)
        
        types_deleted = 0
        for item_type in store_types:
            type_value = item_type.get("value", "")
            
            # Count items of this type (excluding deleted)
            item_count = await db.items.count_documents({
                "store_id": store_id,
                "item_type": type_value,
                "status": {"$nin": ["deleted"]}
            })
            
            if item_count == 0:
                # Delete type
                await db.item_types.delete_one({"id": item_type["id"]})
                # Delete associated tariff
                await db.tariffs.delete_one({"store_id": store_id, "item_type": type_value})
                types_deleted += 1
                print(f"   🗑️ Eliminado tipo vacío: '{type_value}'")
        
        if types_deleted == 0:
            print("   ✅ No hay tipos vacíos")
        total_types_deleted += types_deleted
        
        # 2. CREAR TIPOS FALTANTES PARA ARTÍCULOS HUÉRFANOS
        print("\n2️⃣ Buscando artículos sin tipo definido...")
        
        # Get all unique item_types used in items
        items_types = await db.items.distinct("item_type", {
            "store_id": store_id,
            "status": {"$nin": ["deleted"]}
        })
        
        # Get existing types
        existing_types = await db.item_types.distinct("value", {"store_id": store_id})
        
        missing_types = set(items_types) - set(existing_types)
        
        types_created = 0
        for type_value in missing_types:
            if not type_value:
                continue
            
            normalized = normalize_type_name(type_value)
            
            # Create type
            type_doc = {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "value": normalized,
                "label": format_type_label(normalized),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.item_types.insert_one(type_doc)
            types_created += 1
            print(f"   ✅ Creado tipo faltante: '{normalized}'")
        
        if types_created == 0:
            print("   ✅ No hay tipos faltantes")
        total_types_created += types_created
        
        # 3. CREAR TARIFAS FALTANTES
        print("\n3️⃣ Verificando tarifas...")
        
        store_types_updated = await db.item_types.find({"store_id": store_id}).to_list(1000)
        
        tariffs_created = 0
        for item_type in store_types_updated:
            type_value = item_type.get("value", "")
            
            # Check if tariff exists
            tariff = await db.tariffs.find_one({
                "store_id": store_id,
                "item_type": type_value
            })
            
            if not tariff:
                # Create default tariff
                tariff_doc = {
                    "id": str(uuid.uuid4()),
                    "store_id": store_id,
                    "item_type": type_value,
                    "daily_rate": 0.0,
                    "deposit": 0.0,
                    "name": format_type_label(type_value),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.tariffs.insert_one(tariff_doc)
                tariffs_created += 1
                print(f"   💰 Creada tarifa (0€) para: '{type_value}'")
        
        if tariffs_created == 0:
            print("   ✅ Todas las tarifas existen")
        total_tariffs_created += tariffs_created
    
    # 4. RESUMEN FINAL
    print('\n' + '='*70)
    print('RESUMEN DE LIMPIEZA')
    print('='*70)
    print(f"🗑️  Tipos vacíos eliminados: {total_types_deleted}")
    print(f"✅ Tipos faltantes creados: {total_types_created}")
    print(f"💰 Tarifas faltantes creadas: {total_tariffs_created}")
    print('='*70)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup_types())
