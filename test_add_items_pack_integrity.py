#!/usr/bin/env python3
"""
TEST: Integridad financiera en "Añadir a Alquiler Activo"
Bug: El sistema cobra visualmente 27€ (pack), pero registra 34€ en la base de datos
"""

import requests
import json
from datetime import datetime, timedelta

# Configuración
API_URL = "https://39f97af1-e3a2-4757-b38b-39e61130ce9c-00-3uztqraqv68b0.riker.replit.dev/api"
ADMIN_EMAIL = "admin@enebro.com"
ADMIN_PASSWORD = "new_password_123"

def login():
    """Login y obtener token"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        print(f"❌ Error en login: {response.status_code}")
        print(response.text)
        return None
    return response.json()["token"]

def create_test_rental(token):
    """Crear un alquiler de prueba activo"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Obtener un cliente
    customers = requests.get(f"{API_URL}/customers", headers=headers).json()
    if not customers:
        print("❌ No hay clientes disponibles")
        return None
    customer_id = customers[0]["id"]
    
    # Crear alquiler con un solo artículo
    start_date = datetime.now().strftime("%Y-%m-%d")
    end_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    
    rental_data = {
        "customer_id": customer_id,
        "start_date": start_date,
        "end_date": end_date,
        "days": 5,
        "items": [],
        "payment_method": "cash",
        "total_amount": 0,
        "paid_amount": 0,
        "deposit": 0,
        "notes": "TEST: Rental para verificar add-items con packs"
    }
    
    response = requests.post(f"{API_URL}/rentals/", json=rental_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Error creando rental: {response.status_code}")
        print(response.text)
        return None
    
    rental = response.json()
    print(f"✅ Rental de prueba creado: {rental['id']}")
    return rental

def get_available_items_for_pack(token):
    """Obtener artículos disponibles que puedan formar un pack"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Obtener packs configurados
    packs_response = requests.get(f"{API_URL}/packs", headers=headers)
    if packs_response.status_code != 200:
        print("❌ No se pudieron obtener packs")
        return None, None
    
    packs = packs_response.json()
    if not packs:
        print("⚠️  No hay packs configurados")
        return None, None
    
    # Usar el primer pack
    pack = packs[0]
    print(f"📦 Pack a probar: {pack['name']} - Precio día 5: €{pack.get('day_5', 0)}")
    
    # Buscar artículos disponibles de los tipos requeridos
    items_to_add = []
    required_types = pack["items"]
    
    for item_type in required_types:
        response = requests.get(
            f"{API_URL}/items?status=available&item_type={item_type}&limit=1",
            headers=headers
        )
        if response.status_code == 200 and response.json():
            item = response.json()[0]
            items_to_add.append(item)
    
    if len(items_to_add) != len(required_types):
        print(f"⚠️  No se encontraron suficientes artículos disponibles para el pack")
        print(f"   Requeridos: {required_types}")
        print(f"   Encontrados: {len(items_to_add)}")
        return None, None
    
    print(f"✅ Artículos encontrados para formar pack:")
    for item in items_to_add:
        print(f"   - {item['barcode']} ({item['item_type']})")
    
    return items_to_add, pack

def add_items_to_rental(token, rental_id, items, days, pack_price):
    """Añadir artículos a un alquiler activo"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Calcular precio individual de cada item (sin pack)
    tariffs_response = requests.get(f"{API_URL}/tariffs", headers=headers)
    tariffs = tariffs_response.json() if tariffs_response.status_code == 200 else []
    
    individual_total = 0
    items_payload = []
    
    for item in items:
        # Buscar tarifa
        tariff = next((t for t in tariffs if t.get("item_type") == item["item_type"]), None)
        unit_price = tariff.get(f"day_{days}", 0) if tariff else 0
        individual_total += unit_price
        
        items_payload.append({
            "barcode": item["barcode"],
            "unit_price": unit_price,
            "person_name": ""
        })
    
    print(f"\n💰 PRECIOS:")
    print(f"   Individual (sin pack): €{individual_total:.2f}")
    print(f"   Con pack aplicado:     €{pack_price:.2f}")
    print(f"   Ahorro:                €{(individual_total - pack_price):.2f}")
    
    # Añadir items con calculated_total (precio con pack)
    add_items_data = {
        "items": items_payload,
        "days": days,
        "charge_now": True,
        "payment_method": "cash",
        "calculated_total": pack_price  # ← El valor correcto con pack
    }
    
    print(f"\n🔧 Enviando request con calculated_total: €{pack_price:.2f}")
    
    response = requests.post(
        f"{API_URL}/rentals/{rental_id}/add-items",
        json=add_items_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Error añadiendo items: {response.status_code}")
        print(response.text)
        return None
    
    result = response.json()
    print(f"✅ Items añadidos. Respuesta backend:")
    print(f"   additional_amount: €{result.get('additional_amount', 0):.2f}")
    
    return result, individual_total, pack_price

def verify_cash_movement(token, rental_id, expected_amount):
    """Verificar el movimiento de caja registrado"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Obtener movimientos de caja de hoy
    today = datetime.now().strftime("%Y-%m-%d")
    response = requests.get(f"{API_URL}/cash/movements", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error obteniendo movimientos: {response.status_code}")
        return False
    
    movements = response.json()
    
    # Buscar el movimiento relacionado con este rental
    rental_movement = None
    for movement in movements:
        if movement.get("reference_id") == rental_id and movement.get("category") == "rental_extension":
            rental_movement = movement
            break
    
    if not rental_movement:
        print("❌ No se encontró el movimiento de caja para este rental")
        return False
    
    registered_amount = rental_movement["amount"]
    print(f"\n🔍 VERIFICACIÓN EN BASE DE DATOS:")
    print(f"   Movimiento ID: {rental_movement['id']}")
    print(f"   Monto registrado en DB: €{registered_amount:.2f}")
    print(f"   Monto esperado (pack):  €{expected_amount:.2f}")
    
    if abs(registered_amount - expected_amount) < 0.01:
        print(f"✅ ¡CORRECTO! El movimiento registra €{registered_amount:.2f}")
        return True
    else:
        print(f"❌ ¡ERROR! Se esperaba €{expected_amount:.2f} pero se registró €{registered_amount:.2f}")
        print(f"   Diferencia: €{abs(registered_amount - expected_amount):.2f}")
        return False

def main():
    print("=" * 70)
    print("TEST: INTEGRIDAD FINANCIERA - AÑADIR ITEMS CON PACK")
    print("=" * 70)
    
    # 1. Login
    print("\n[1/5] Login...")
    token = login()
    if not token:
        return
    
    # 2. Crear rental de prueba
    print("\n[2/5] Crear rental de prueba...")
    rental = create_test_rental(token)
    if not rental:
        return
    
    # 3. Obtener artículos que formen pack
    print("\n[3/5] Buscar artículos para pack...")
    items, pack = get_available_items_for_pack(token)
    if not items or not pack:
        print("⚠️  No se puede continuar sin artículos para pack")
        return
    
    days = 5
    pack_price = pack.get(f"day_{days}", pack.get("day_1", 0))
    
    # 4. Añadir items al rental
    print("\n[4/5] Añadir items al rental...")
    result = add_items_to_rental(token, rental["id"], items, days, pack_price)
    if not result:
        return
    
    add_result, individual_total, pack_price = result
    
    # 5. Verificar movimiento en caja
    print("\n[5/5] Verificar movimiento en base de datos...")
    success = verify_cash_movement(token, rental["id"], pack_price)
    
    print("\n" + "=" * 70)
    if success:
        print("🎉 TEST PASADO: El sistema registra correctamente el precio con pack")
    else:
        print("❌ TEST FALLIDO: El sistema NO registra el precio correcto")
    print("=" * 70)

if __name__ == "__main__":
    main()
