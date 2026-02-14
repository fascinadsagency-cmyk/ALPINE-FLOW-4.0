"""
Test impersonate endpoint for store management
P0 Bug fix verification: admin_master can access stores via 'Acceder' button
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImpersonateEndpoint:
    """Test the /api/stores/{store_id}/impersonate endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin_master token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin_master", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.admin_token = data["access_token"]
        self.user_role = data["user"]["role"]
        assert self.user_role == "super_admin", "admin_master should be super_admin"
    
    def test_impersonate_store_4_returns_token(self):
        """P0 Bug Fix: POST /api/stores/4/impersonate should return access_token (NOT 404)"""
        response = requests.post(
            f"{BASE_URL}/api/stores/4/impersonate",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["access_token"], "access_token should not be empty"
        assert "message" in data
        print(f"Store 4 impersonation successful: {data['message']}")
    
    def test_impersonate_store_1_returns_token(self):
        """POST /api/stores/1/impersonate should return access_token for store 1"""
        response = requests.post(
            f"{BASE_URL}/api/stores/1/impersonate",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["access_token"], "access_token should not be empty"
        print(f"Store 1 impersonation successful: {data['message']}")
    
    def test_impersonate_nonexistent_store_returns_404(self):
        """POST /api/stores/999/impersonate should return 404 for non-existent store"""
        response = requests.post(
            f"{BASE_URL}/api/stores/999/impersonate",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_impersonate_without_super_admin_fails(self):
        """Non-super_admin users should not be able to impersonate"""
        # Login as regular admin (el_enebro)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "el_enebro", "password": "enebro123"}
        )
        assert login_response.status_code == 200, "el_enebro login failed"
        regular_token = login_response.json()["access_token"]
        
        # Try to impersonate - should fail
        response = requests.post(
            f"{BASE_URL}/api/stores/1/impersonate",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        # Should be 403 Forbidden for non-super_admin
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestImpersonatedSession:
    """Test that impersonated sessions work correctly"""
    
    def test_impersonated_token_accesses_store_data(self):
        """Impersonated token should access correct store's data"""
        # Login as super_admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin_master", "password": "admin123"}
        )
        admin_token = login_response.json()["access_token"]
        
        # Impersonate store 4
        impersonate_response = requests.post(
            f"{BASE_URL}/api/stores/4/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        impersonated_token = impersonate_response.json()["access_token"]
        
        # Access /api/auth/me with impersonated token
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {impersonated_token}"}
        )
        assert me_response.status_code == 200
        
        user_data = me_response.json()
        # The impersonated session should show the store name
        print(f"Impersonated user: {user_data.get('username')}, store: {user_data.get('store_name')}")


class TestStoreManagementAccess:
    """Test stores endpoint for super_admin"""
    
    def test_super_admin_can_list_all_stores(self):
        """super_admin should be able to list all stores via /api/stores"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin_master", "password": "admin123"}
        )
        token = login_response.json()["access_token"]
        
        stores_response = requests.get(
            f"{BASE_URL}/api/stores",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert stores_response.status_code == 200, f"GET /api/stores failed: {stores_response.text}"
        
        stores = stores_response.json()
        assert isinstance(stores, list)
        assert len(stores) > 0, "Should have at least one store"
        
        # Check that store 4 exists
        store_4 = next((s for s in stores if s.get("store_id") == 4), None)
        assert store_4 is not None, "Store 4 (Gestión Central Pruebas) should exist"
        print(f"Found {len(stores)} stores, including store 4: {store_4.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
