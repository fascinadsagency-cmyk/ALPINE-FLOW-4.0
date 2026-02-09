#!/usr/bin/env python3
"""
Script de debug para verificar la agregación de clientes activos
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import json

load_dotenv("/app/backend/.env")

async def test_aggregation():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "test_database")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Usar store_id de "EL ENEBRO" (store_id: 1)
    store_id = 1
    
    print(f"🔍 Testing aggregation pipeline for store_id={store_id}")
    print("=" * 70)
    
    # Contar total de clientes
    total_customers = await db.customers.count_documents({"store_id": store_id})
    print(f"\n📊 Total clientes en store: {total_customers}")
    
    # Contar alquileres activos
    active_rentals = await db.rentals.count_documents({
        "store_id": store_id,
        "status": {"$in": ["active", "partial"]}
    })
    print(f"📊 Total alquileres activos: {active_rentals}")
    
    # Pipeline de agregación
    pipeline = [
        # Stage 1: Match customers del store
        {"$match": {"store_id": store_id}},
        
        # Stage 2: Lookup active rentals
        {
            "$lookup": {
                "from": "rentals",
                "let": {
                    "customer_id": "$id",
                    "customer_dni": {"$toUpper": "$dni"}
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$store_id", store_id]},
                                    {"$in": ["$status", ["active", "partial"]]},
                                    {
                                        "$or": [
                                            {"$eq": ["$customer_id", "$$customer_id"]},
                                            {"$eq": [{"$toUpper": "$customer_dni"}, "$$customer_dni"]}
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    {"$limit": 1}
                ],
                "as": "active_rentals"
            }
        },
        
        # Stage 3: Add computed field
        {
            "$addFields": {
                "has_active_rental": {"$gt": [{"$size": "$active_rentals"}, 0]}
            }
        },
        
        # Stage 4: Filter by active
        {"$match": {"has_active_rental": True}},
        
        # Stage 5: Project
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "dni": 1,
                "name": 1,
                "has_active_rental": 1,
                "active_rentals_count": {"$size": "$active_rentals"}
            }
        },
        
        # Stage 6: Sort
        {"$sort": {"name": 1}}
    ]
    
    print(f"\n🔧 Ejecutando pipeline de agregación...")
    customers = await db.customers.aggregate(pipeline).to_list(None)
    
    print(f"\n✅ Clientes ACTIVOS encontrados: {len(customers)}")
    print("=" * 70)
    
    if customers:
        print(f"\n📋 Primeros 10 clientes activos:")
        for i, customer in enumerate(customers[:10], 1):
            print(f"  {i}. {customer['name']} ({customer['dni']}) - Rentals: {customer.get('active_rentals_count', 0)}")
    else:
        print("\n⚠️  NO se encontraron clientes activos")
        print("\n🔍 Verificando por qué...")
        
        # Verificar si hay rentals con customer_id
        sample_rentals = await db.rentals.find(
            {"store_id": store_id, "status": {"$in": ["active", "partial"]}},
            {"customer_id": 1, "customer_dni": 1, "customer_name": 1, "_id": 0}
        ).limit(5).to_list(5)
        
        print(f"\n📋 Sample de alquileres activos:")
        for rental in sample_rentals:
            print(f"  - customer_id: {rental.get('customer_id')}, dni: {rental.get('customer_dni')}, name: {rental.get('customer_name')}")
        
        # Verificar si hay customers con esos IDs
        if sample_rentals:
            first_customer_id = sample_rentals[0].get("customer_id")
            if first_customer_id:
                customer = await db.customers.find_one({"id": first_customer_id, "store_id": store_id})
                print(f"\n🔍 Customer con id={first_customer_id}:")
                if customer:
                    print(f"  Encontrado: {customer.get('name')} ({customer.get('dni')})")
                else:
                    print(f"  ❌ NO ENCONTRADO")
    
    # Test sin filtro para ver todos con el flag
    print(f"\n\n📊 Testing SIN filtro (todos los clientes con flag)...")
    pipeline_all = pipeline[:-2]  # Quitar el match y limit
    pipeline_all.append({"$limit": 10})
    
    all_customers = await db.customers.aggregate(pipeline_all).to_list(10)
    print(f"Primeros 10 clientes (con flag):")
    for customer in all_customers:
        status_icon = "✅" if customer.get("has_active_rental") else "❌"
        print(f"  {status_icon} {customer['name']} - has_active_rental: {customer.get('has_active_rental')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_aggregation())
