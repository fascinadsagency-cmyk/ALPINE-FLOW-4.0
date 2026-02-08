#!/usr/bin/env python3
"""
🔄 FASE 3: MIGRACIÓN DE DATOS A EL ENEBRO
==========================================

Este script asigna store_id = "store_enebro_001" (EL ENEBRO)
a todos los documentos existentes en las colecciones principales.

Colecciones a migrar:
- items (artículos)
- customers (clientes)
- rentals (alquileres)
- cash_sessions (sesiones de caja)
- cash_movements (movimientos de caja)
- packs (packs de alquiler)
- tariffs (tarifas)
- users (usuarios)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')
ENEBRO_STORE_ID = "store_enebro_001"

async def migrate_to_multitenant():
    """Migrar todos los datos a EL ENEBRO"""
    
    print("=" * 70)
    print("🔄 FASE 3: MIGRACIÓN DE DATOS A EL ENEBRO")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    collections_to_migrate = [
        "users",
        "customers",
        "items",
        "rentals",
        "cash_sessions",
        "cash_movements",
        "packs",
        "tariffs",
        "item_types"
    ]
    
    try:
        total_migrated = 0
        
        for collection_name in collections_to_migrate:
            print(f"📦 Migrando: {collection_name}...", end=" ")
            
            # Count documents without store_id
            without_store = await db[collection_name].count_documents({"store_id": {"$exists": False}})
            
            if without_store > 0:
                # Add store_id to all documents without it
                result = await db[collection_name].update_many(
                    {"store_id": {"$exists": False}},
                    {
                        "$set": {
                            "store_id": ENEBRO_STORE_ID,
                            "migrated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                print(f"✅ {result.modified_count}/{without_store} docs → EL ENEBRO")
                total_migrated += result.modified_count
            else:
                # Check if collection exists and has documents
                total_docs = await db[collection_name].count_documents({})
                if total_docs > 0:
                    print(f"ℹ️  {total_docs} docs (ya tienen store_id)")
                else:
                    print("⚠️  Colección vacía")
        
        print()
        print("=" * 70)
        print("✅ FASE 3 COMPLETADA")
        print("=" * 70)
        print(f"   Total documentos migrados: {total_migrated:,}")
        print(f"   Tienda asignada: EL ENEBRO ({ENEBRO_STORE_ID})")
        print()
        
        # VALIDACIÓN: Verificar que todos tienen store_id
        print("🔍 VALIDACIÓN POST-MIGRACIÓN:")
        print("-" * 70)
        
        for collection_name in collections_to_migrate:
            total = await db[collection_name].count_documents({})
            with_store = await db[collection_name].count_documents({"store_id": ENEBRO_STORE_ID})
            without_store = await db[collection_name].count_documents({"store_id": {"$exists": False}})
            
            if total > 0:
                print(f"   {collection_name}: {with_store}/{total} con store_id", end="")
                if without_store > 0:
                    print(f" ❌ ({without_store} sin store_id)")
                else:
                    print(" ✅")
        
        print()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_to_multitenant())
