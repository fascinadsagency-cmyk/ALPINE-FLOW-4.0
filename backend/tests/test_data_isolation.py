"""
Data Isolation Tests - Iteration 40
Tests: admin_master (store_id=4) should see 0 customers/items/rentals
       admin.enebro@test.com (store_id=1) should still see EL ENEBRO data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_MASTER_USERNAME = "admin_master"
ADMIN_MASTER_PASSWORD = "admin123"
ADMIN_ENEBRO_USERNAME = "admin.enebro@test.com"
ADMIN_ENEBRO_PASSWORD = "admin123"


class TestDataIsolation:
    """Data isolation tests for multi-tenant fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, username, password):
        """Login and return token and user data"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": username,
            "password": password
        })
        assert response.status_code == 200, f"Login failed for {username}: {response.text}"
        data = response.json()
        return data["access_token"], data["user"]
    
    # ==================== admin_master Tests ====================
    
    def test_01_admin_master_login_returns_correct_store_name(self):
        """POST /api/auth/login for admin_master returns store_name='Gestión Central Pruebas'"""
        token, user = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        # Verify store_name in login response
        assert "store_name" in user, "store_name field missing from login response"
        assert user["store_name"] == "Gestión Central Pruebas", f"Expected 'Gestión Central Pruebas', got '{user['store_name']}'"
        print(f"PASS: admin_master login returns store_name='{user['store_name']}'")
    
    def test_02_admin_master_auth_me_returns_correct_store_name(self):
        """GET /api/auth/me for admin_master returns store_name='Gestión Central Pruebas'"""
        token, _ = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        # Get /auth/me
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"auth/me failed: {response.text}"
        
        user = response.json()
        assert "store_name" in user, "store_name field missing from auth/me response"
        assert user["store_name"] == "Gestión Central Pruebas", f"Expected 'Gestión Central Pruebas', got '{user['store_name']}'"
        print(f"PASS: admin_master auth/me returns store_name='{user['store_name']}'")
    
    def test_03_admin_master_customers_returns_empty(self):
        """GET /api/customers for admin_master returns 0 customers (empty store)"""
        token, _ = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200, f"GET customers failed: {response.text}"
        
        customers = response.json()
        assert isinstance(customers, list), "Expected list of customers"
        assert len(customers) == 0, f"Expected 0 customers for admin_master, got {len(customers)}"
        print(f"PASS: admin_master sees 0 customers (data isolation working)")
    
    def test_04_admin_master_items_returns_empty(self):
        """GET /api/items for admin_master returns 0 items (empty store)"""
        token, _ = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200, f"GET items failed: {response.text}"
        
        items = response.json()
        assert isinstance(items, list), "Expected list of items"
        assert len(items) == 0, f"Expected 0 items for admin_master, got {len(items)}"
        print(f"PASS: admin_master sees 0 items (data isolation working)")
    
    def test_05_admin_master_dashboard_returns_zero_counts(self):
        """GET /api/dashboard for admin_master returns 0 for active rentals and customers"""
        token, _ = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200, f"GET dashboard failed: {response.text}"
        
        dashboard = response.json()
        # Check active_rentals
        assert dashboard.get("active_rentals", 0) == 0, f"Expected 0 active_rentals, got {dashboard.get('active_rentals')}"
        # Check today_customers or customers_today
        today_customers = dashboard.get("today_customers", dashboard.get("customers_today", 0))
        assert today_customers == 0, f"Expected 0 customers_today, got {today_customers}"
        print(f"PASS: admin_master dashboard shows 0 active rentals and 0 customers today")
    
    # ==================== EL ENEBRO (admin.enebro) Tests ====================
    
    def test_06_admin_enebro_login_returns_correct_store_name(self):
        """POST /api/auth/login for admin.enebro returns store_name='EL ENEBRO'"""
        token, user = self.login(ADMIN_ENEBRO_USERNAME, ADMIN_ENEBRO_PASSWORD)
        
        # Verify store_name in login response  
        assert "store_name" in user, "store_name field missing from login response"
        assert user["store_name"] == "EL ENEBRO", f"Expected 'EL ENEBRO', got '{user['store_name']}'"
        print(f"PASS: admin.enebro login returns store_name='{user['store_name']}'")
    
    def test_07_admin_enebro_customers_not_lost(self):
        """GET /api/customers for admin.enebro still returns customers (data not lost)"""
        token, _ = self.login(ADMIN_ENEBRO_USERNAME, ADMIN_ENEBRO_PASSWORD)
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200, f"GET customers failed: {response.text}"
        
        customers = response.json()
        assert isinstance(customers, list), "Expected list of customers"
        # EL ENEBRO should have customers (the test reports mention ~17594 customers)
        assert len(customers) > 0, f"EL ENEBRO customers lost! Expected >0, got {len(customers)}"
        print(f"PASS: admin.enebro sees {len(customers)} customers (data preserved)")
    
    # ==================== Store Management Tests ====================
    
    def test_08_admin_master_can_access_stores_list(self):
        """GET /api/stores - admin_master (super_admin) can see all stores including EL ENEBRO"""
        token, user = self.login(ADMIN_MASTER_USERNAME, ADMIN_MASTER_PASSWORD)
        
        # Verify admin_master is super_admin
        assert user["role"] == "super_admin", f"admin_master should be super_admin, got {user['role']}"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200, f"GET stores failed: {response.text}"
        
        stores = response.json()
        # Check if it's a list directly or wrapped in an object
        if isinstance(stores, dict) and "stores" in stores:
            stores = stores["stores"]
        
        assert isinstance(stores, list), "Expected list of stores"
        
        # Find EL ENEBRO and Gestión Central Pruebas
        store_names = [s.get("name", "") for s in stores]
        assert "EL ENEBRO" in store_names, f"EL ENEBRO not found in stores list: {store_names}"
        assert "Gestión Central Pruebas" in store_names, f"Gestión Central Pruebas not found: {store_names}"
        
        print(f"PASS: admin_master can see all stores: {store_names}")


class TestUserResponseStructure:
    """Tests for UserResponse model structure with store_name"""
    
    def test_user_response_includes_store_name(self):
        """UserResponse model includes store_name field"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_MASTER_USERNAME,
            "password": ADMIN_MASTER_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        user = data.get("user", {})
        
        # Check all expected fields in UserResponse
        expected_fields = ["id", "username", "role", "store_name"]
        for field in expected_fields:
            assert field in user, f"UserResponse missing field: {field}"
        
        print(f"PASS: UserResponse includes all expected fields: {list(user.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
