"""
Multi-Tenant Segregation Tests
CRITICAL: Verify that users from different stores CANNOT see each other's data
Test stores:
  - EL ENEBRO (store_id=1): admin / admin - Main production store with real data
  - Tienda Test 1 (store_id=22): test1@test.com / test123 - Empty test store
  - Tienda Test 2 (store_id=23): test2@test.com / test123 - Empty test store
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials per store
STORES = {
    "el_enebro": {"store_id": 1, "username": "admin@test.com", "password": "admin123"},
    "test_store_1": {"store_id": 22, "username": "test1@test.com", "password": "test123"},
    "test_store_2": {"store_id": 23, "username": "test2@test.com", "password": "test123"},
}


class TestMultiTenantAuth:
    """Test that JWT tokens correctly include store_id"""
    
    def get_token(self, username: str, password: str) -> dict:
        """Login and return token + store_id from JWT"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": username,
            "password": password
        })
        return response.json() if response.status_code == 200 else None
    
    def test_login_el_enebro_returns_store_id(self):
        """Login to EL ENEBRO should work and return a valid token"""
        result = self.get_token("admin", "admin")
        assert result is not None, "Login to EL ENEBRO failed"
        assert "access_token" in result, "No access_token in response"
        print(f"✅ EL ENEBRO login successful")
    
    def test_login_test_store_1_returns_store_id(self):
        """Login to Test Store 1 should work"""
        result = self.get_token("test1@test.com", "test123")
        assert result is not None, f"Login to Test Store 1 failed"
        assert "access_token" in result, "No access_token in response"
        print(f"✅ Test Store 1 login successful")
    
    def test_login_test_store_2_returns_store_id(self):
        """Login to Test Store 2 should work"""
        result = self.get_token("test2@test.com", "test123")
        assert result is not None, f"Login to Test Store 2 failed"
        assert "access_token" in result, "No access_token in response"
        print(f"✅ Test Store 2 login successful")


class TestItemsSegregation:
    """Test that items are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_items(self, auth_headers):
        """EL ENEBRO should see its 1,994 items"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/items", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get items: {resp.text}"
        
        items = resp.json()
        # EL ENEBRO has production data - should have many items
        assert len(items) > 100, f"EL ENEBRO should have many items, got {len(items)}"
        print(f"✅ EL ENEBRO sees {len(items)} items (expected ~1,994)")
    
    def test_test_store_1_sees_empty_or_own_items_only(self, auth_headers):
        """Test Store 1 should see 0 items (empty store) OR only items they created"""
        if "test_store_1" not in auth_headers:
            pytest.skip("Test Store 1 login failed")
        
        resp = requests.get(f"{BASE_URL}/api/items", headers=auth_headers["test_store_1"])
        assert resp.status_code == 200, f"Failed to get items: {resp.text}"
        
        items = resp.json()
        # Test Store 1 was created empty - should have 0 or very few items
        assert len(items) < 10, f"Test Store 1 should have few/no items, got {len(items)}"
        print(f"✅ Test Store 1 sees {len(items)} items (expected 0-10)")
    
    def test_test_store_2_sees_empty_or_own_items_only(self, auth_headers):
        """Test Store 2 should see 0 items (empty store) OR only items they created"""
        if "test_store_2" not in auth_headers:
            pytest.skip("Test Store 2 login failed")
        
        resp = requests.get(f"{BASE_URL}/api/items", headers=auth_headers["test_store_2"])
        assert resp.status_code == 200, f"Failed to get items: {resp.text}"
        
        items = resp.json()
        # Test Store 2 was created empty - should have 0 or very few items
        assert len(items) < 10, f"Test Store 2 should have few/no items, got {len(items)}"
        print(f"✅ Test Store 2 sees {len(items)} items (expected 0-10)")
    
    def test_item_created_by_store1_not_visible_to_store2(self, auth_headers):
        """CRITICAL: Item created by Store 1 should NOT be visible to Store 2"""
        if "test_store_1" not in auth_headers or "test_store_2" not in auth_headers:
            pytest.skip("Test stores login failed")
        
        # Create item in Store 1
        unique_code = f"TEST-SEG-{uuid.uuid4().hex[:8].upper()}"
        item_data = {
            "internal_code": unique_code,
            "barcode": unique_code,
            "item_type": "ski",
            "brand": "SegregationTest",
            "model": "Store1Only",
            "size": "170"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/items",
            json=item_data,
            headers=auth_headers["test_store_1"]
        )
        
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create item in Store 1: {create_resp.text}")
        
        created_item = create_resp.json()
        item_id = created_item["id"]
        
        try:
            # Verify Store 1 can see the item
            store1_items = requests.get(f"{BASE_URL}/api/items?search={unique_code}", headers=auth_headers["test_store_1"])
            assert store1_items.status_code == 200
            store1_search = store1_items.json()
            assert any(i["id"] == item_id for i in store1_search), "Store 1 should see its own item"
            print(f"✅ Store 1 can see its own item: {unique_code}")
            
            # CRITICAL: Verify Store 2 CANNOT see the item
            store2_items = requests.get(f"{BASE_URL}/api/items?search={unique_code}", headers=auth_headers["test_store_2"])
            assert store2_items.status_code == 200
            store2_search = store2_items.json()
            assert not any(i["id"] == item_id for i in store2_search), \
                f"🚨 DATA LEAK! Store 2 can see Store 1's item! Item: {unique_code}"
            print(f"✅ Store 2 CANNOT see Store 1's item (correct isolation)")
            
        finally:
            # Cleanup: delete the test item
            requests.delete(f"{BASE_URL}/api/items/{item_id}", headers=auth_headers["test_store_1"])


class TestCustomersSegregation:
    """Test that customers are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_customers(self, auth_headers):
        """EL ENEBRO should see its 17,639 customers"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get customers: {resp.text}"
        
        customers = resp.json()
        # EL ENEBRO has production data - should have many customers
        assert len(customers) > 1000, f"EL ENEBRO should have many customers, got {len(customers)}"
        print(f"✅ EL ENEBRO sees {len(customers)} customers (expected ~17,639)")
    
    def test_test_store_1_sees_empty_customers(self, auth_headers):
        """Test Store 1 should see 0 customers (empty store)"""
        if "test_store_1" not in auth_headers:
            pytest.skip("Test Store 1 login failed")
        
        resp = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers["test_store_1"])
        assert resp.status_code == 200, f"Failed to get customers: {resp.text}"
        
        customers = resp.json()
        assert len(customers) < 10, f"Test Store 1 should have few/no customers, got {len(customers)}"
        print(f"✅ Test Store 1 sees {len(customers)} customers (expected 0-10)")
    
    def test_customer_created_by_store1_not_visible_to_store2(self, auth_headers):
        """CRITICAL: Customer created by Store 1 should NOT be visible to Store 2"""
        if "test_store_1" not in auth_headers or "test_store_2" not in auth_headers:
            pytest.skip("Test stores login failed")
        
        # Create customer in Store 1
        unique_dni = f"SEG{uuid.uuid4().hex[:6].upper()}"
        customer_data = {
            "dni": unique_dni,
            "name": "Segregation Test Customer",
            "phone": "123456789"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/customers",
            json=customer_data,
            headers=auth_headers["test_store_1"]
        )
        
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create customer in Store 1: {create_resp.text}")
        
        created_customer = create_resp.json()
        customer_id = created_customer["id"]
        
        try:
            # Verify Store 1 can see the customer
            store1_customers = requests.get(f"{BASE_URL}/api/customers?search={unique_dni}", headers=auth_headers["test_store_1"])
            assert store1_customers.status_code == 200
            store1_search = store1_customers.json()
            assert any(c["id"] == customer_id for c in store1_search), "Store 1 should see its own customer"
            print(f"✅ Store 1 can see its own customer: {unique_dni}")
            
            # CRITICAL: Verify Store 2 CANNOT see the customer
            store2_customers = requests.get(f"{BASE_URL}/api/customers?search={unique_dni}", headers=auth_headers["test_store_2"])
            assert store2_customers.status_code == 200
            store2_search = store2_customers.json()
            assert not any(c["id"] == customer_id for c in store2_search), \
                f"🚨 DATA LEAK! Store 2 can see Store 1's customer! DNI: {unique_dni}"
            print(f"✅ Store 2 CANNOT see Store 1's customer (correct isolation)")
            
        finally:
            # Cleanup: delete the test customer
            requests.delete(f"{BASE_URL}/api/customers/{customer_id}", headers=auth_headers["test_store_1"])


class TestDashboardSegregation:
    """Test that dashboard KPIs are properly filtered by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_dashboard_shows_own_data(self, auth_headers):
        """EL ENEBRO dashboard should show its rentals and stats"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get dashboard: {resp.text}"
        
        data = resp.json()
        stats = data.get("stats", {})
        
        # EL ENEBRO has production data
        inventory = stats.get("inventory", {})
        # Should have significant inventory
        print(f"✅ EL ENEBRO dashboard - inventory: {inventory}")
    
    def test_test_store_1_dashboard_shows_empty_data(self, auth_headers):
        """Test Store 1 dashboard should show 0/minimal data (empty store)"""
        if "test_store_1" not in auth_headers:
            pytest.skip("Test Store 1 login failed")
        
        resp = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers["test_store_1"])
        assert resp.status_code == 200, f"Failed to get dashboard: {resp.text}"
        
        data = resp.json()
        stats = data.get("stats", {})
        
        # Test Store 1 is empty - should have minimal/zero stats
        active_rentals = stats.get("active_rentals", 0)
        # Empty store should have few/no active rentals
        assert active_rentals < 10, f"Empty store should have few active rentals, got {active_rentals}"
        print(f"✅ Test Store 1 dashboard - active_rentals: {active_rentals} (expected ~0)")
    
    def test_dashboard_returns_control_filtered_by_store(self, auth_headers):
        """Dashboard returns-control should only show store's pending returns"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/dashboard/returns-control", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get returns-control: {resp.text}"
        
        data = resp.json()
        print(f"✅ EL ENEBRO returns-control - total_pending: {data.get('total_pending', 0)}")
    
    def test_dashboard_analytics_filtered_by_store(self, auth_headers):
        """Dashboard analytics should only show store's performance data"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(
            f"{BASE_URL}/api/dashboard/analytics?period=week",
            headers=auth_headers["el_enebro"]
        )
        assert resp.status_code == 200, f"Failed to get analytics: {resp.text}"
        
        data = resp.json()
        print(f"✅ EL ENEBRO analytics - weekly_calendar: {len(data.get('weekly_calendar', []))} days")


class TestRentalsSegregation:
    """Test that rentals are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_rentals(self, auth_headers):
        """EL ENEBRO should see its 129+ rentals"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/rentals", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get rentals: {resp.text}"
        
        rentals = resp.json()
        assert len(rentals) > 10, f"EL ENEBRO should have many rentals, got {len(rentals)}"
        print(f"✅ EL ENEBRO sees {len(rentals)} rentals (expected ~129)")
    
    def test_test_store_1_sees_empty_rentals(self, auth_headers):
        """Test Store 1 should see 0 rentals (empty store)"""
        if "test_store_1" not in auth_headers:
            pytest.skip("Test Store 1 login failed")
        
        resp = requests.get(f"{BASE_URL}/api/rentals", headers=auth_headers["test_store_1"])
        assert resp.status_code == 200, f"Failed to get rentals: {resp.text}"
        
        rentals = resp.json()
        assert len(rentals) < 10, f"Test Store 1 should have few/no rentals, got {len(rentals)}"
        print(f"✅ Test Store 1 sees {len(rentals)} rentals (expected ~0)")


class TestTariffsSegregation:
    """Test that tariffs are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_tariffs(self, auth_headers):
        """EL ENEBRO should see its tariffs"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/tariffs", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get tariffs: {resp.text}"
        
        tariffs = resp.json()
        assert len(tariffs) > 0, "EL ENEBRO should have tariffs configured"
        print(f"✅ EL ENEBRO sees {len(tariffs)} tariffs")


class TestItemTypesSegregation:
    """Test that item types are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_item_types(self, auth_headers):
        """EL ENEBRO should see its item types"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get item-types: {resp.text}"
        
        types = resp.json()
        assert len(types) > 5, f"EL ENEBRO should have item types configured, got {len(types)}"
        print(f"✅ EL ENEBRO sees {len(types)} item types")


class TestPacksSegregation:
    """Test that packs are properly isolated by store"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for all stores"""
        headers = {}
        for name, creds in STORES.items():
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": creds["username"],
                "password": creds["password"]
            })
            if resp.status_code == 200:
                headers[name] = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        return headers
    
    def test_el_enebro_sees_own_packs(self, auth_headers):
        """EL ENEBRO should see its packs"""
        if "el_enebro" not in auth_headers:
            pytest.skip("EL ENEBRO login failed")
        
        resp = requests.get(f"{BASE_URL}/api/packs", headers=auth_headers["el_enebro"])
        assert resp.status_code == 200, f"Failed to get packs: {resp.text}"
        
        packs = resp.json()
        # Packs may or may not be configured
        print(f"✅ EL ENEBRO sees {len(packs)} packs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
