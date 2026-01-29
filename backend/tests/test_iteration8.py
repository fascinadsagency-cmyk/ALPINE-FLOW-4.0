"""
Backend API Tests - Iteration 8
Testing: Health endpoint, Cash endpoints, and Rental-Cash integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test /api/health returns valid JSON"""
    
    def test_health_returns_valid_json(self):
        """Verify health endpoint returns valid JSON with status healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] == "healthy", f"Expected 'healthy', got {data['status']}"
        assert "timestamp" in data, "Response should contain 'timestamp' field"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Try to login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_iter8_user", "password": "test123456"}
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        # If login fails, register new user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "test_iter8_user",
                "password": "test123456",
                "email": "test_iter8@test.com"
            }
        )
        
        if register_response.status_code in [200, 201]:
            return register_response.json().get("access_token")
        
        pytest.skip("Could not authenticate")
    
    def test_login_returns_valid_json(self, auth_token):
        """Verify login returns valid JSON with token"""
        assert auth_token is not None, "Should have valid token"
        assert len(auth_token) > 0, "Token should not be empty"


class TestCashEndpoints:
    """Test cash management endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_iter8_user", "password": "test123456"}
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip("Could not authenticate")
    
    def test_cash_sessions_active_returns_valid_json(self, auth_token):
        """Verify /api/cash/sessions/active returns valid JSON"""
        response = requests.get(
            f"{BASE_URL}/api/cash/sessions/active",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Response can be null or a session object
        data = response.json()
        # If there's an active session, it should have an id
        if data is not None:
            assert "id" in data or data == {}, "Active session should have 'id' field or be empty"
    
    def test_cash_summary_returns_valid_json(self, auth_token):
        """Verify /api/cash/summary returns valid JSON with expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/cash/summary?date=2026-01-29",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "date" in data, "Summary should contain 'date' field"
        assert "session_active" in data, "Summary should contain 'session_active' field"
        assert "total_income" in data, "Summary should contain 'total_income' field"
        assert "total_expense" in data, "Summary should contain 'total_expense' field"
        assert "balance" in data, "Summary should contain 'balance' field"
    
    def test_cash_session_open_and_close(self, auth_token):
        """Test opening and closing a cash session"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First check if there's an active session
        active_response = requests.get(
            f"{BASE_URL}/api/cash/sessions/active",
            headers=headers
        )
        
        active_session = active_response.json()
        
        # If there's an active session, close it first
        if active_session and active_session.get("id"):
            close_response = requests.post(
                f"{BASE_URL}/api/cash/sessions/close",
                headers=headers,
                json={"notes": "Test close"}
            )
            # May fail if already closed, that's ok
        
        # Open a new session
        open_response = requests.post(
            f"{BASE_URL}/api/cash/sessions/open",
            headers=headers,
            json={"opening_balance": 100.0, "notes": "Test session for iteration 8"}
        )
        
        assert open_response.status_code == 200, f"Expected 200, got {open_response.status_code}: {open_response.text}"
        
        session_data = open_response.json()
        assert "id" in session_data, "Session should have 'id' field"
        assert session_data.get("opening_balance") == 100.0, "Opening balance should be 100.0"
        
        # Verify session is active
        verify_response = requests.get(
            f"{BASE_URL}/api/cash/sessions/active",
            headers=headers
        )
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data is not None, "Should have active session"
        assert verify_data.get("id") == session_data.get("id"), "Active session should match opened session"


class TestRentalEndpoints:
    """Test rental endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_iter8_user", "password": "test123456"}
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip("Could not authenticate")
    
    def test_rentals_list_returns_valid_json(self, auth_token):
        """Verify /api/rentals returns valid JSON array"""
        response = requests.get(
            f"{BASE_URL}/api/rentals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Rentals should return a list"
    
    def test_tariffs_returns_valid_json(self, auth_token):
        """Verify /api/tariffs returns valid JSON"""
        response = requests.get(
            f"{BASE_URL}/api/tariffs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Tariffs should return a list"
    
    def test_items_returns_valid_json(self, auth_token):
        """Verify /api/items returns valid JSON"""
        response = requests.get(
            f"{BASE_URL}/api/items",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Items should return a list"
    
    def test_customers_returns_valid_json(self, auth_token):
        """Verify /api/customers returns valid JSON"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Customers should return a list"


class TestItemTypes:
    """Test item types endpoint for quick access buttons"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_iter8_user", "password": "test123456"}
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip("Could not authenticate")
    
    def test_item_types_includes_required_types(self, auth_token):
        """Verify item types include helmet, boots, poles for quick access buttons"""
        response = requests.get(
            f"{BASE_URL}/api/item-types",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Item types should return a list"
        
        # Extract values
        type_values = [t.get("value") for t in data]
        
        # Check required types for quick access buttons
        assert "helmet" in type_values, "Should include 'helmet' type"
        assert "boots" in type_values, "Should include 'boots' type"
        assert "poles" in type_values, "Should include 'poles' type"
    
    def test_items_filter_by_type(self, auth_token):
        """Verify items can be filtered by type (for quick access modal)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test filtering by helmet
        response = requests.get(
            f"{BASE_URL}/api/items?item_type=helmet&status=available",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Filtered items should return a list"
        
        # All returned items should be helmets
        for item in data:
            assert item.get("item_type") == "helmet", f"Expected helmet, got {item.get('item_type')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
