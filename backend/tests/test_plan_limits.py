"""
Test Plan Limits - Backend tests for PLAN_LIMIT_EXCEEDED feature
Tests that stores with basic plan and custom limits get 403 errors when exceeding limits
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPlanLimits:
    """Test plan limit enforcement for store 3 (basic plan with max 2 each)"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get store 3 token via impersonation"""
        # Login as admin_master (super_admin)
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin_master", "password": "admin123"}
        )
        assert login_resp.status_code == 200, f"Failed to login as admin_master: {login_resp.text}"
        admin_token = login_resp.json()["access_token"]

        # Impersonate store 3
        impersonate_resp = requests.post(
            f"{BASE_URL}/api/stores/3/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert impersonate_resp.status_code == 200, f"Failed to impersonate store 3: {impersonate_resp.text}"
        self.store3_token = impersonate_resp.json()["access_token"]

    def test_items_limit_exceeded(self):
        """POST /api/items should return 403 PLAN_LIMIT_EXCEEDED for store 3 (at max 2 items)"""
        response = requests.post(
            f"{BASE_URL}/api/items",
            headers={
                "Authorization": f"Bearer {self.store3_token}",
                "Content-Type": "application/json"
            },
            json={
                "internal_code": "TEST_ITEM_LIMIT",
                "item_type": "Esquí",
                "brand": "Test",
                "size": "180"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "PLAN_LIMIT_EXCEEDED", f"Expected PLAN_LIMIT_EXCEEDED, got {detail}"
        assert detail.get("limit_type") == "items"
        assert detail.get("current_count") == 2
        assert detail.get("max_allowed") == 2
        assert detail.get("plan_name") == "Plan Básico"

    def test_customers_limit_exceeded(self):
        """POST /api/customers should return 403 PLAN_LIMIT_EXCEEDED for store 3 (at max 2 customers)"""
        response = requests.post(
            f"{BASE_URL}/api/customers",
            headers={
                "Authorization": f"Bearer {self.store3_token}",
                "Content-Type": "application/json"
            },
            json={
                "name": "Test Customer Limit",
                "dni": "TEST12345",
                "phone": "123456789"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "PLAN_LIMIT_EXCEEDED", f"Expected PLAN_LIMIT_EXCEEDED, got {detail}"
        assert detail.get("limit_type") == "customers"
        assert detail.get("current_count") == 2
        assert detail.get("max_allowed") == 2
        assert detail.get("plan_name") == "Plan Básico"

    def test_users_limit_exceeded(self):
        """POST /api/team/members should return 403 PLAN_LIMIT_EXCEEDED for store 3 (at max 2 users)"""
        response = requests.post(
            f"{BASE_URL}/api/team/members",
            headers={
                "Authorization": f"Bearer {self.store3_token}",
                "Content-Type": "application/json"
            },
            json={
                "username": f"test_user_limit_{os.urandom(4).hex()}",
                "email": f"test_{os.urandom(4).hex()}@example.com",
                "password": "testpass123",
                "name": "Test User Limit",
                "role": "employee"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "PLAN_LIMIT_EXCEEDED", f"Expected PLAN_LIMIT_EXCEEDED, got {detail}"
        assert detail.get("limit_type") == "users"
        assert detail.get("current_count") == 2
        assert detail.get("max_allowed") == 2
        assert detail.get("plan_name") == "Plan Básico"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
