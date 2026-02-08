#!/usr/bin/env python3
"""
🏢 FASE 2: CREAR ESTRUCTURA MULTI-TENANT
=========================================

Este script:
1. Crea la colección 'stores' con 3 tiendas
2. Asigna store_id al usuario admin
3. Crea índices multi-tenant en todas las colecciones
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from uuid import uuid4

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')

async def create_multitenant_structure():
    """Crear estructura base multi-tenant"""
    
    print("=" * 70)
    print("🏢 FASE 2: CREAR ESTRUCTURA MULTI-TENANT")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # PASO 1: Crear tiendas
        print("📍 PASO 1: Creando tiendas...")
        print()
        
        stores = [
            {
                "id": "store_enebro_001",
                "name": "EL ENEBRO",
                "code": "ENEBRO",
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_test_001",
                "name": "Tienda Test 1",
                "code": "TEST1",
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_test_002",
                "name": "Tienda Test 2",
                "code": "TEST2",
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for store in stores:
            existing = await db.stores.find_one({"id": store["id"]})
            if not existing:
                await db.stores.insert_one(store)
                print(f"   ✅ Creada: {store['name']} (ID: {store['id']})")
            else:
                print(f"   ℹ️  Ya existe: {store['name']}")
        
        print()
        
        # PASO 2: Asignar store_id a usuario admin
        print("👤 PASO 2: Asignando store_id a usuarios...")
        print()
        
        users = await db.users.find({}).to_list(100)
        
        if users:
            for user in users:
                if not user.get('store_id'):
                    result = await db.users.update_one(
                        {"id": user["id"]},
                        {"$set": {"store_id": "store_enebro_001"}}
                    )
                    if result.modified_count > 0:
                        print(f"   ✅ Usuario '{user.get('username', 'N/A')}' → EL ENEBRO")
        else:
            print("   ℹ️  No hay usuarios en la BD local")
        
        print()
        
        # PASO 3: Crear índices multi-tenant
        print("🔍 PASO 3: Creando índices multi-tenant...")
        print()
        
        indexes_to_create = [
            ("rentals", [("store_id", 1), ("status", 1)], "idx_mt_store_status"),
            ("rentals", [("store_id", 1), ("end_date", 1)], "idx_mt_store_enddate"),
            ("rentals", [("store_id", 1), ("customer_id", 1)], "idx_mt_store_customer"),
            ("items", [("store_id", 1), ("status", 1)], "idx_mt_store_item_status"),
            ("items", [("store_id", 1), ("item_type", 1)], "idx_mt_store_item_type"),
            ("customers", [("store_id", 1), ("dni", 1)], "idx_mt_store_dni"),
            ("cash_sessions", [("store_id", 1), ("date", 1)], "idx_mt_store_date"),
            ("cash_movements", [("store_id", 1), ("session_id", 1)], "idx_mt_store_session"),
        ]
        
        for collection, keys, name in indexes_to_create:
            try:
                result = await db[collection].create_index(keys, name=name, background=True)
                print(f"   ✅ {collection}: {name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"   ℹ️  {collection}: {name} (ya existe)")
                else:
                    print(f"   ⚠️  {collection}: Error - {e}")
        
        print()
        print("=" * 70)
        print("✅ FASE 2 COMPLETADA")
        print("=" * 70)
        print()
        print("Tiendas creadas: 3")
        print("  - EL ENEBRO (principal, recibirá datos legacy)")
        print("  - Tienda Test 1 (vacía)")
        print("  - Tienda Test 2 (vacía)")
        print()
        print("Índices multi-tenant: Creados")
        print("Usuarios asignados: Sí")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_multitenant_structure())
