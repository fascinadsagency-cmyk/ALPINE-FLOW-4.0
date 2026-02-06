import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def check_store_3_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print('=== TIENDA 3 - VERIFICACIÓN DE AISLAMIENTO ===\n')
    
    # Check customers
    customers_count = await db.customers.count_documents({"store_id": 3})
    print(f"👥 Clientes en Tienda 3: {customers_count}")
    if customers_count > 0:
        print("  ❌ FALLO: La tienda tiene clientes heredados!")
        sample = await db.customers.find({"store_id": 3}, {"_id": 0, "id": 1, "name": 1, "dni": 1}).limit(5).to_list(5)
        for c in sample:
            print(f"     - {c.get('name')} ({c.get('dni')})")
    else:
        print("  ✅ CORRECTO: Sin clientes")
    
    # Check items
    items_count = await db.items.count_documents({"store_id": 3})
    print(f"\n📦 Artículos en Tienda 3: {items_count}")
    if items_count > 0:
        print("  ❌ FALLO: La tienda tiene artículos heredados!")
        sample = await db.items.find({"store_id": 3}, {"_id": 0, "id": 1, "barcode": 1, "item_type": 1}).limit(5).to_list(5)
        for i in sample:
            print(f"     - {i.get('barcode')} ({i.get('item_type')})")
    else:
        print("  ✅ CORRECTO: Sin artículos")
    
    # Check rentals
    rentals_count = await db.rentals.count_documents({"store_id": 3})
    print(f"\n📋 Alquileres en Tienda 3: {rentals_count}")
    if rentals_count > 0:
        print("  ❌ FALLO: La tienda tiene alquileres heredados!")
        sample = await db.rentals.find({"store_id": 3}, {"_id": 0, "id": 1, "rental_date": 1, "status": 1}).limit(5).to_list(5)
        for r in sample:
            print(f"     - Alquiler {r.get('id')[:8]}... ({r.get('status')})")
    else:
        print("  ✅ CORRECTO: Sin alquileres")
    
    # Check tariffs
    tariffs_count = await db.tariffs.count_documents({})
    print(f"\n💰 Tarifas en DB (SIN FILTRO store_id): {tariffs_count}")
    if tariffs_count > 0:
        print("  ⚠️  ADVERTENCIA: Las tarifas son GLOBALES (no tienen store_id)")
        sample = await db.tariffs.find({}, {"_id": 0, "item_type": 1, "category": 1}).limit(3).to_list(3)
        for t in sample:
            print(f"     - {t.get('item_type')} - {t.get('category')}")
    
    # Check packs
    packs_count = await db.packs.count_documents({})
    print(f"\n📦 Packs en DB (SIN FILTRO store_id): {packs_count}")
    if packs_count > 0:
        print("  ⚠️  ADVERTENCIA: Los packs son GLOBALES (no tienen store_id)")
        sample = await db.packs.find({}, {"_id": 0, "name": 1, "category": 1}).limit(3).to_list(3)
        for p in sample:
            print(f"     - {p.get('name')} ({p.get('category')})")
    
    # Check sources (providers)
    sources_count = await db.sources.count_documents({})
    print(f"\n🏢 Proveedores en DB (SIN FILTRO store_id): {sources_count}")
    if sources_count > 0:
        print("  ⚠️  ADVERTENCIA: Los proveedores son GLOBALES (no tienen store_id)")
        sample = await db.sources.find({}, {"_id": 0, "name": 1, "discount_percent": 1}).limit(3).to_list(3)
        for s in sample:
            print(f"     - {s.get('name')} ({s.get('discount_percent')}%)")
    
    # Check cash movements
    cash_count = await db.cash_movements.count_documents({"store_id": 3})
    print(f"\n💵 Movimientos de Caja en Tienda 3: {cash_count}")
    
    # Check cash closings
    closings_count = await db.cash_closings.count_documents({"store_id": 3})
    print(f"🔐 Cierres de Caja en Tienda 3: {closings_count}")
    
    print('\n' + '='*50)
    print('RESUMEN:')
    if customers_count == 0 and items_count == 0 and rentals_count == 0:
        print('✅ Tienda 3 está VACÍA (aislamiento correcto para datos principales)')
    else:
        print('❌ FALLO CRÍTICO: Tienda 3 tiene datos heredados!')
    
    if tariffs_count > 0 or packs_count > 0 or sources_count > 0:
        print('⚠️  PROBLEMA: Colecciones globales (tariffs, packs, sources) NO tienen store_id')
        print('   Estas colecciones DEBEN ser multi-tenant para aislamiento completo.')
    
    client.close()

asyncio.run(check_store_3_data())
