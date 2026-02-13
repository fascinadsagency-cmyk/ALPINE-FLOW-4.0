#!/usr/bin/env python3
"""
Test del endpoint de clientes activos con usuario real
"""
import requests
import json

API_URL = "https://rental-mgmt-suite.preview.emergentagent.com/api"

# Necesitamos un token real - vamos a intentar hacer login primero
print("🔐 Intentando login...")

# Probar con diferentes credenciales
credentials_to_try = [
    {"username": "admin@enebro.com", "password": "admin123"},
    {"username": "admin@enebro.com", "password": "new_password_123"},
]

token = None
for creds in credentials_to_try:
    try:
        response = requests.post(f"{API_URL}/auth/login", json=creds, timeout=5)
        if response.status_code == 200:
            token = response.json()["token"]
            print(f"✅ Login exitoso con {creds['username']}")
            break
    except Exception as e:
        continue

if not token:
    print("❌ No se pudo hacer login. Por favor verifica las credenciales en el handoff summary.")
    print("\nIntentando sin autenticación (fallará pero veremos el error)...")
    token = "fake_token"

headers = {"Authorization": f"Bearer {token}"}

# Test 1: Get stats
print(f"\n{'='*70}")
print("📊 TEST 1: Stats de clientes")
print(f"{'='*70}")
try:
    response = requests.get(f"{API_URL}/customers/stats/summary", headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"Total: {stats['total']}")
        print(f"Activos: {stats['active']}")
        print(f"Inactivos: {stats['inactive']}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Get all customers (first page)
print(f"\n{'='*70}")
print("📋 TEST 2: Todos los clientes (página 1, limit 5)")
print(f"{'='*70}")
try:
    response = requests.get(
        f"{API_URL}/customers/paginated/list?page=1&limit=5&status=all",
        headers=headers,
        timeout=5
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total: {data['pagination']['total']}")
        print(f"Recibidos: {len(data['customers'])}")
        print("\nPrimeros clientes:")
        for c in data['customers'][:3]:
            print(f"  - {c['name']} (has_active_rental: {c.get('has_active_rental', 'N/A')})")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Get ACTIVE customers only
print(f"\n{'='*70}")
print("✅ TEST 3: Solo clientes ACTIVOS (status=active)")
print(f"{'='*70}")
try:
    response = requests.get(
        f"{API_URL}/customers/paginated/list?page=1&limit=200&status=active",
        headers=headers,
        timeout=5
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total activos: {data['pagination']['total']}")
        print(f"Recibidos: {len(data['customers'])}")
        
        if data['customers']:
            print("\n📋 Clientes activos:")
            for i, c in enumerate(data['customers'], 1):
                print(f"  {i}. {c['name']} (DNI: {c.get('dni', 'N/A')}) - has_active_rental: {c.get('has_active_rental', 'N/A')}")
        else:
            print("\n⚠️  El endpoint devolvió 0 clientes activos")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")

print(f"\n{'='*70}")
print("✅ Tests completados")
print(f"{'='*70}")
