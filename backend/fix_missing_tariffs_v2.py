"""
Script de Migración v2: Asignar tarifas a artículos importados sin tariff_id
Con normalización robusta y búsqueda difusa de tipos
"""
import os
import asyncio
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')


def normalize_type(type_name: str) -> str:
    """
    Normaliza un nombre de tipo para comparación flexible.
    - Convierte a minúsculas
    - Elimina espacios extra, guiones bajos finales
    - Reemplaza caracteres especiales y espacios por guiones bajos
    - Elimina acentos
    """
    if not type_name:
        return ""
    
    # Lowercase
    result = type_name.lower().strip()
    
    # Remove accents
    accents = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u'
    }
    for acc, repl in accents.items():
        result = result.replace(acc, repl)
    
    # Replace spaces and special chars with underscore
    result = re.sub(r'[\s\-]+', '_', result)
    
    # Remove trailing underscores
    result = result.strip('_')
    
    # Remove duplicate underscores
    result = re.sub(r'_+', '_', result)
    
    return result


def create_variants(type_name: str) -> set:
    """
    Genera variantes posibles de un nombre de tipo para matching flexible.
    Ej: "bota esqui" -> {"bota_esqui", "bota_esqui_", "botaesqui", "bota esqui"}
    """
    base = normalize_type(type_name)
    variants = {
        base,
        base + "_",             # Con underscore final
        base.replace("_", ""),  # Sin underscores
        base.replace("_", " "), # Con espacios
        type_name.lower().strip(),  # Original lowercase
    }
    return variants


async def fix_missing_tariffs():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('='*70)
    print('REPARACIÓN DE ARTÍCULOS SIN TARIFAS (v2 - Normalización Robusta)')
    print('='*70)
    
    # 1. Encontrar todos los artículos sin tariff_id
    items_without_tariff = await db.items.find(
        {
            "$or": [
                {"tariff_id": {"$exists": False}},
                {"tariff_id": ""},
                {"tariff_id": None}
            ],
            "item_type": {"$exists": True, "$ne": ""},
            "status": {"$nin": ["deleted", "retired"]}  # Exclude deleted items
        },
        {"_id": 0, "id": 1, "store_id": 1, "item_type": 1, "barcode": 1, "brand": 1, "model": 1}
    ).to_list(None)  # No limit
    
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
    unmatched_types = {}
    
    for store_id, items in stores_map.items():
        print(f"\n--- Procesando Tienda {store_id} ---")
        print(f"   Artículos sin tarifa: {len(items)}")
        
        # Obtener todas las tarifas de esta tienda
        tariffs = await db.tariffs.find(
            {"store_id": store_id},
            {"_id": 0, "id": 1, "item_type": 1}
        ).to_list(100)
        
        # Crear un mapa de variantes -> tariff_id para búsqueda flexible
        tariff_lookup = {}
        for t in tariffs:
            tariff_type = t["item_type"]
            tariff_id = t["id"]
            # Add all variants of this tariff type
            for variant in create_variants(tariff_type):
                tariff_lookup[variant] = tariff_id
        
        print(f"   Tarifas disponibles: {len(tariffs)}")
        print(f"   Tipos originales: {[t['item_type'] for t in tariffs]}")
        
        updated = 0
        not_found = 0
        
        for item in items:
            item_type_raw = item.get("item_type", "")
            item_variants = create_variants(item_type_raw)
            
            # Try to find a match using any variant
            tariff_id = None
            for variant in item_variants:
                if variant in tariff_lookup:
                    tariff_id = tariff_lookup[variant]
                    break
            
            if tariff_id:
                # Assign tariff
                await db.items.update_one(
                    {"id": item["id"]},
                    {"$set": {"tariff_id": tariff_id}}
                )
                updated += 1
            else:
                not_found += 1
                # Track unmatched types for reporting
                normalized = normalize_type(item_type_raw)
                if normalized not in unmatched_types:
                    unmatched_types[normalized] = {
                        "original": item_type_raw,
                        "count": 0,
                        "store_id": store_id
                    }
                unmatched_types[normalized]["count"] += 1
        
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
    
    if unmatched_types:
        print(f"\n📋 Tipos sin tarifa (necesitan crear tarifa en la tienda):")
        for type_key, info in sorted(unmatched_types.items(), key=lambda x: -x[1]["count"]):
            print(f"   - '{info['original']}' → {info['count']} artículos (tienda {info['store_id']})")
    
    print('='*70)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(fix_missing_tariffs())
