#!/usr/bin/env python3
"""
⚡ SCRIPT: Crear Índices para Optimización de Queries
===================================================

Este script crea índices compuestos en MongoDB para optimizar
las queries del Dashboard y listado de Clientes.

Índices a crear:
1. rentals: (store_id, status) - Para filtrar rentals activos por tienda
2. rentals: (store_id, end_date) - Para devoluciones por fecha
3. customers: (store_id, dni) - Para búsqueda rápida de clientes
4. items: (store_id, status) - Para inventario por tienda

⚠️  Este script es seguro y no modifica datos, solo crea índices.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')

async def create_indexes():
    """Crear índices para optimización"""
    
    print("=" * 70)
    print("⚡ CREANDO ÍNDICES DE OPTIMIZACIÓN")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        indexes_created = []
        
        # ÍNDICE 1: rentals (store_id, status)
        # Para queries de rentals activos por tienda
        print("1️⃣ Creando índice: rentals (store_id, status)...")
        try:
            result = await db.rentals.create_index(
                [("store_id", 1), ("status", 1)],
                name="idx_store_status",
                background=True
            )
            print(f"   ✅ Índice creado: {result}")
            indexes_created.append("rentals.store_id_status")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"   ℹ️  Índice ya existe")
            else:
                print(f"   ⚠️  Error: {e}")
        print()
        
        # ÍNDICE 2: rentals (store_id, end_date)
        # Para devoluciones por fecha
        print("2️⃣ Creando índice: rentals (store_id, end_date)...")
        try:
            result = await db.rentals.create_index(
                [("store_id", 1), ("end_date", 1)],
                name="idx_store_enddate",
                background=True
            )
            print(f"   ✅ Índice creado: {result}")
            indexes_created.append("rentals.store_id_end_date")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"   ℹ️  Índice ya existe")
            else:
                print(f"   ⚠️  Error: {e}")
        print()
        
        # ÍNDICE 3: customers (store_id, dni)
        # Para búsqueda rápida de clientes
        print("3️⃣ Creando índice: customers (store_id, dni)...")
        try:
            result = await db.customers.create_index(
                [("store_id", 1), ("dni", 1)],
                name="idx_store_dni",
                background=True
            )
            print(f"   ✅ Índice creado: {result}")
            indexes_created.append("customers.store_id_dni")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"   ℹ️  Índice ya existe")
            else:
                print(f"   ⚠️  Error: {e}")
        print()
        
        # ÍNDICE 4: items (store_id, status)
        # Para inventario por tienda
        print("4️⃣ Creando índice: items (store_id, status)...")
        try:
            result = await db.items.create_index(
                [("store_id", 1), ("status", 1)],
                name="idx_store_item_status",
                background=True
            )
            print(f"   ✅ Índice creado: {result}")
            indexes_created.append("items.store_id_status")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"   ℹ️  Índice ya existe")
            else:
                print(f"   ⚠️  Error: {e}")
        print()
        
        # ÍNDICE 5: rentals (store_id, customer_id)
        # Para lookups de customer → rentals
        print("5️⃣ Creando índice: rentals (store_id, customer_id)...")
        try:
            result = await db.rentals.create_index(
                [("store_id", 1), ("customer_id", 1)],
                name="idx_store_customer",
                background=True
            )
            print(f"   ✅ Índice creado: {result}")
            indexes_created.append("rentals.store_id_customer_id")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"   ℹ️  Índice ya existe")
            else:
                print(f"   ⚠️  Error: {e}")
        print()
        
        # List all indexes
        print("=" * 70)
        print("📊 ÍNDICES ACTUALES EN RENTALS:")
        print("=" * 70)
        indexes = await db.rentals.index_information()
        for name, info in indexes.items():
            keys = info.get('key', [])
            print(f"   - {name}: {keys}")
        print()
        
        print("=" * 70)
        print("✅ PROCESO COMPLETADO")
        print("=" * 70)
        print(f"   Índices creados/verificados: {len(indexes_created)}")
        print()
        print("💡 IMPACTO ESPERADO:")
        print("   - Queries de rentals activos: 10-100x más rápidas")
        print("   - Listado de clientes activos: < 300ms")
        print("   - Dashboard stats: < 200ms")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
