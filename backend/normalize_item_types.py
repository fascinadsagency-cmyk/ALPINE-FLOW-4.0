#!/usr/bin/env python3
"""
🧹 SCRIPT DE LIMPIEZA: Normalización de item_type en Artículos
===============================================================

Este script normaliza TODOS los valores de item_type en la colección items.
Si hay artículos con "Bota Snowboard", "bota snowboard", "bota_snowboard",
todos se actualizarán al valor normalizado "bota_snowboard".

⚠️  CRÍTICO: Este script modifica la base de datos. Hacer backup antes de ejecutar.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
import os
from datetime import datetime, timezone
import re

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')

def normalize_type_name(type_name: str) -> str:
    """
    Normaliza el nombre del tipo de artículo.
    - Elimina espacios al inicio y final
    - Convierte a minúsculas
    - Reemplaza múltiples espacios/guiones bajos con un solo guion bajo
    """
    if not type_name:
        return ""
    
    normalized = type_name.strip().lower()
    # Replace multiple spaces or underscores with single underscore
    normalized = re.sub(r'[\s_]+', '_', normalized)
    # Remove leading/trailing underscores
    normalized = normalized.strip('_')
    
    return normalized

async def normalize_item_types():
    """Normalizar todos los item_type en la colección items"""
    
    print("=" * 70)
    print("🧹 NORMALIZANDO TIPOS DE ARTÍCULO EN ITEMS")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # PASO 1: Obtener todos los tipos distintos actuales
        print("📊 PASO 1: Analizando tipos existentes...")
        distinct_types = await db.items.distinct("item_type")
        distinct_types = [t for t in distinct_types if t and t.strip()]
        
        print(f"   Total tipos distintos: {len(distinct_types)}")
        print()
        
        # PASO 2: Agrupar por valor normalizado
        print("🔍 PASO 2: Agrupando por valor normalizado...")
        
        normalization_map = {}  # original -> normalized
        groups = defaultdict(list)  # normalized -> [original1, original2, ...]
        
        for original in distinct_types:
            normalized = normalize_type_name(original)
            normalization_map[original] = normalized
            groups[normalized].append(original)
        
        # Identificar grupos con múltiples variantes
        variants_groups = {k: v for k, v in groups.items() if len(v) > 1}
        
        if variants_groups:
            print(f"   ⚠️  Encontrados {len(variants_groups)} tipos con variantes:")
            for normalized, variants in variants_groups.items():
                print(f"      '{normalized}' tiene {len(variants)} variantes:")
                for var in variants:
                    count = await db.items.count_documents({"item_type": var})
                    print(f"         - '{var}': {count} artículos")
            print()
        else:
            print("   ✅ Todos los tipos ya están normalizados")
            print()
        
        # PASO 3: Normalizar todos los artículos
        print("🔄 PASO 3: Normalizando artículos...")
        
        total_updated = 0
        
        for original, normalized in normalization_map.items():
            # Si ya está normalizado, skip
            if original == normalized:
                continue
            
            # Contar artículos a actualizar
            count = await db.items.count_documents({"item_type": original})
            
            if count > 0:
                print(f"   Actualizando '{original}' → '{normalized}' ({count} artículos)...")
                
                # Actualizar
                result = await db.items.update_many(
                    {"item_type": original},
                    {
                        "$set": {
                            "item_type": normalized,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                print(f"      ✅ {result.modified_count} artículos actualizados")
                total_updated += result.modified_count
        
        print()
        print("=" * 70)
        print("✅ NORMALIZACIÓN COMPLETADA")
        print("=" * 70)
        print(f"   Total artículos actualizados: {total_updated}")
        print(f"   Tipos únicos finales: {len(groups)}")
        print()
        
        # PASO 4: Verificación
        print("🔍 VERIFICACIÓN FINAL:")
        final_distinct = await db.items.distinct("item_type")
        final_distinct = [t for t in final_distinct if t and t.strip()]
        
        # Verificar que no hay duplicados normalizados
        final_normalized = set()
        duplicates_found = False
        
        for t in final_distinct:
            norm = normalize_type_name(t)
            if norm in final_normalized:
                print(f"   ❌ DUPLICADO: '{t}' (normalizado: '{norm}')")
                duplicates_found = True
            final_normalized.add(norm)
        
        if not duplicates_found:
            print("   ✅ No hay duplicados normalizados")
        
        print(f"   Total tipos finales: {len(final_distinct)}")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

async def main():
    """Ejecutar normalización"""
    
    print()
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║  🧹 NORMALIZACIÓN: TIPOS DE ARTÍCULO EN ITEMS                     ║")
    print("║                                                                    ║")
    print("║  Este script normalizará todos los item_type en la colección items║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()
    
    await normalize_item_types()
    
    print()
    print("✅ PROCESO COMPLETADO")
    print()

if __name__ == "__main__":
    asyncio.run(main())
