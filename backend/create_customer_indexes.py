#!/usr/bin/env python3
"""
Crear índices para optimizar consultas de clientes activos
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def create_indexes():
    """Crear índices para optimizar rendimiento"""
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "rental_system")
    
    if not mongo_url:
        print("❌ MONGO_URL no encontrada en .env")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔧 Creando índices para optimización de clientes activos en BD: {db_name}...")
    
    # Índices para customers
    print("\n📊 Índices en 'customers':")
    try:
        # Índice compuesto para filtros comunes
        await db.customers.create_index([
            ("store_id", 1),
            ("created_at", -1)
        ], name="idx_store_created")
        print("  ✅ idx_store_created")
        
        # Índice para búsquedas de texto
        await db.customers.create_index([
            ("store_id", 1),
            ("dni", 1)
        ], name="idx_store_dni")
        print("  ✅ idx_store_dni")
        
        await db.customers.create_index([
            ("store_id", 1),
            ("name", 1)
        ], name="idx_store_name")
        print("  ✅ idx_store_name")
        
        # Índice para customer_id
        await db.customers.create_index([
            ("id", 1),
            ("store_id", 1)
        ], name="idx_id_store")
        print("  ✅ idx_id_store")
        
    except Exception as e:
        print(f"  ⚠️  Error en customers: {e}")
    
    # Índices para rentals (crítico para JOIN en aggregation)
    print("\n📊 Índices en 'rentals':")
    try:
        # Índice compuesto para la consulta de active rentals
        await db.rentals.create_index([
            ("store_id", 1),
            ("status", 1),
            ("customer_id", 1)
        ], name="idx_store_status_customer")
        print("  ✅ idx_store_status_customer")
        
        # Índice para customer_dni
        await db.rentals.create_index([
            ("store_id", 1),
            ("status", 1),
            ("customer_dni", 1)
        ], name="idx_store_status_dni")
        print("  ✅ idx_store_status_dni")
        
    except Exception as e:
        print(f"  ⚠️  Error en rentals: {e}")
    
    # Listar todos los índices
    print("\n📋 Índices actuales en 'customers':")
    customer_indexes = await db.customers.list_indexes().to_list(None)
    for idx in customer_indexes:
        print(f"  - {idx['name']}: {idx.get('key', {})}")
    
    print("\n📋 Índices actuales en 'rentals':")
    rental_indexes = await db.rentals.list_indexes().to_list(None)
    for idx in rental_indexes:
        print(f"  - {idx['name']}: {idx.get('key', {})}")
    
    print("\n✅ Índices creados exitosamente")
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
