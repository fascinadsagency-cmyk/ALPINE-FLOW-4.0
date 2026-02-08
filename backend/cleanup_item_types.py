#!/usr/bin/env python3
"""
🧹 SCRIPT DE LIMPIEZA: De-duplicación de Tipos de Artículo
==========================================================

Este script:
1. Identifica tipos de artículo duplicados (mismo label, diferentes values)
2. Selecciona un registro "maestro" para cada grupo de duplicados
3. Actualiza todos los artículos que apuntan a duplicados para que apunten al maestro
4. Elimina los registros duplicados sobrantes

⚠️  CRÍTICO: Este script modifica la base de datos. Hacer backup antes de ejecutar.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
import os
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')

async def deduplicate_item_types():
    """De-duplicar tipos de artículo"""
    
    print("=" * 70)
    print("🧹 INICIANDO LIMPIEZA DE TIPOS DE ARTÍCULO DUPLICADOS")
    print("=" * 70)
    print()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # PASO 1: Obtener todos los tipos de artículo
        print("📊 PASO 1: Analizando tipos de artículo...")
        all_types = await db.item_types.find({}, {"_id": 0}).to_list(None)
        print(f"   Total tipos encontrados: {len(all_types)}")
        print()
        
        # PASO 2: Agrupar por label normalizado (case-insensitive, sin espacios)
        print("🔍 PASO 2: Identificando duplicados...")
        
        def normalize_for_comparison(text):
            """Normalizar texto para comparación (case-insensitive, sin espacios/guiones)"""
            return text.lower().strip().replace(" ", "").replace("_", "").replace("-", "")
        
        groups = defaultdict(list)
        for item_type in all_types:
            normalized_key = normalize_for_comparison(item_type['label'])
            groups[normalized_key].append(item_type)
        
        # Identificar grupos con duplicados
        duplicate_groups = {k: v for k, v in groups.items() if len(v) > 1}
        
        if not duplicate_groups:
            print("   ✅ No se encontraron duplicados. Base de datos limpia.")
            return
        
        print(f"   ❌ Encontrados {len(duplicate_groups)} grupos de duplicados:")
        print()
        
        total_merged = 0
        total_deleted = 0
        
        # PASO 3: Procesar cada grupo de duplicados
        for norm_label, duplicates in duplicate_groups.items():
            print(f"   📦 Grupo: {duplicates[0]['label']}")
            print(f"      Duplicados encontrados: {len(duplicates)}")
            
            # Seleccionar el registro maestro (el que tiene guion bajo, o el primero)
            master = None
            for dup in duplicates:
                if '_' in dup['value']:
                    master = dup
                    break
            if not master:
                master = duplicates[0]
            
            print(f"      ✅ Maestro seleccionado: '{master['value']}' (ID: {master['id']})")
            
            # Identificar duplicados a eliminar
            to_delete = [d for d in duplicates if d['id'] != master['id']]
            
            # PASO 4: Actualizar artículos que apuntan a duplicados
            for dup in to_delete:
                print(f"      🔄 Migrando artículos de '{dup['value']}' → '{master['value']}'...")
                
                # Buscar artículos con este tipo
                items_with_dup = await db.items.count_documents({
                    "store_id": dup.get('store_id'),
                    "item_type": dup['value']
                })
                
                if items_with_dup > 0:
                    # Actualizar a maestro
                    result = await db.items.update_many(
                        {
                            "store_id": dup.get('store_id'),
                            "item_type": dup['value']
                        },
                        {
                            "$set": {
                                "item_type": master['value'],
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    print(f"         ✅ {result.modified_count} artículos actualizados")
                    total_merged += result.modified_count
                else:
                    print(f"         ℹ️  0 artículos (tipo sin uso)")
                
                # PASO 5: Eliminar tipo duplicado
                await db.item_types.delete_one({"id": dup['id']})
                print(f"         🗑️  Tipo '{dup['value']}' eliminado")
                total_deleted += 1
            
            print()
        
        # RESUMEN
        print("=" * 70)
        print("✅ LIMPIEZA COMPLETADA")
        print("=" * 70)
        print(f"   Artículos migrados: {total_merged}")
        print(f"   Tipos eliminados: {total_deleted}")
        print(f"   Grupos fusionados: {len(duplicate_groups)}")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

async def create_unique_index():
    """Crear índice único para prevenir duplicados futuros"""
    
    print("=" * 70)
    print("🔒 CREANDO ÍNDICE ÚNICO EN ITEM_TYPES")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Crear índice único compuesto: store_id + value
        # Esto previene duplicados por tienda
        result = await db.item_types.create_index(
            [("store_id", 1), ("value", 1)],
            unique=True,
            name="unique_store_itemtype"
        )
        
        print(f"   ✅ Índice único creado: {result}")
        print(f"   Campo: store_id + value")
        print(f"   Efecto: MongoDB rechazará duplicados automáticamente")
        print()
        
    except Exception as e:
        if "duplicate key" in str(e).lower():
            print(f"   ⚠️  Ya existe un índice único")
        else:
            print(f"   ❌ ERROR: {e}")
    finally:
        client.close()

async def main():
    """Ejecutar limpieza completa"""
    
    print()
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║  🧹 LIMPIEZA DE INTEGRIDAD: TIPOS DE ARTÍCULO                     ║")
    print("║                                                                    ║")
    print("║  Este script eliminará duplicados y aplicará restricciones únicas ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print()
    
    # Paso 1: Limpiar duplicados existentes
    await deduplicate_item_types()
    
    # Paso 2: Crear índice único
    await create_unique_index()
    
    print()
    print("✅ PROCESO COMPLETADO")
    print()

if __name__ == "__main__":
    asyncio.run(main())
