"""
Backend tests for Cash Register (Caja) functionality
Tests the /api/cash/summary/realtime endpoint and by_category calculations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "demo",
        "password": "demo1234"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCashSummaryRealtime:
    """Tests for /api/cash/summary/realtime endpoint"""
    
    def test_cash_summary_returns_200(self, api_client):
        """Test that cash summary endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/cash/summary/realtime")
        assert response.status_code == 200
        print("✅ Cash summary endpoint returns 200")
    
    def test_cash_summary_has_by_category(self, api_client):
        """Test that cash summary includes by_category field"""
        response = api_client.get(f"{BASE_URL}/api/cash/summary/realtime")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_category" in data, "by_category field missing from response"
        
        by_category = data["by_category"]
        assert "rental" in by_category, "rental category missing"
        assert "rental_adjustment" in by_category, "rental_adjustment category missing"
        assert "other" in by_category, "other category missing"
        print(f"✅ by_category present: {by_category}")
    
    def test_cash_summary_has_by_payment_method(self, api_client):
        """Test that cash summary includes by_payment_method field"""
        response = api_client.get(f"{BASE_URL}/api/cash/summary/realtime")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_payment_method" in data, "by_payment_method field missing"
        
        by_payment = data["by_payment_method"]
        assert "cash" in by_payment, "cash payment method missing"
        assert "card" in by_payment, "card payment method missing"
        
        # Verify structure of payment method data
        for method in ["cash", "card"]:
            assert "income" in by_payment[method], f"{method}.income missing"
            assert "expense" in by_payment[method], f"{method}.expense missing"
            assert "refund" in by_payment[method], f"{method}.refund missing"
        
        print(f"✅ by_payment_method present with correct structure")
    
    def test_balance_calculation_correct(self, api_client):
        """Test that balance is calculated correctly"""
        response = api_client.get(f"{BASE_URL}/api/cash/summary/realtime")
        assert response.status_code == 200
        
        data = response.json()
        
        opening = data.get("opening_balance", 0)
        income = data.get("total_income", 0)
        expense = data.get("total_expense", 0)
        refunds = data.get("total_refunds", 0)
        balance = data.get("balance", 0)
        
        # Calculate expected balance
        expected_balance = opening + income - expense - refunds
        
        # Allow small floating point difference
        assert abs(balance - expected_balance) < 0.01, \
            f"Balance mismatch: got {balance}, expected {expected_balance}"
        
        print(f"✅ Balance calculation correct: {balance}")
    
    def test_cash_summary_has_session_info(self, api_client):
        """Test that cash summary includes session information"""
        response = api_client.get(f"{BASE_URL}/api/cash/summary/realtime")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check for session-related fields
        assert "session_active" in data, "session_active field missing"
        assert "movements_count" in data, "movements_count field missing"
        
        print(f"✅ Session info present: active={data.get('session_active')}, movements={data.get('movements_count')}")


class TestActiveRentals:
    """Tests for Active Rentals endpoint"""
    
    def test_get_active_rentals(self, api_client):
        """Test that active rentals endpoint returns data"""
        response = api_client.get(f"{BASE_URL}/api/rentals", params={"status": "active"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Active rentals endpoint returns {len(data)} rentals")
    
    def test_rental_has_required_fields(self, api_client):
        """Test that rental objects have required fields"""
        response = api_client.get(f"{BASE_URL}/api/rentals", params={"status": "active"})
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            rental = data[0]
            required_fields = ["id", "customer_name", "customer_dni", "items", "total_amount", "status"]
            for field in required_fields:
                assert field in rental, f"Required field '{field}' missing from rental"
            print(f"✅ Rental has all required fields")
        else:
            print("⚠️ No active rentals to test")


class TestPendingReturns:
    """Tests for Pending Returns endpoint"""
    
    def test_get_pending_returns(self, api_client):
        """Test that pending returns endpoint returns data"""
        response = api_client.get(f"{BASE_URL}/api/rentals/pending/returns")
        assert response.status_code == 200
        
        data = response.json()
        assert "today" in data, "today field missing"
        assert "other_days" in data, "other_days field missing"
        
        print(f"✅ Pending returns: today={len(data.get('today', []))}, other_days={len(data.get('other_days', []))}")


class TestCentralSwap:
    """Tests for Central Swap endpoint (CAMBIOS functionality)"""
    
    def test_central_swap_endpoint_exists(self, api_client):
        """Test that central swap endpoint exists"""
        # This should return 404 or 422 for invalid rental ID, not 405 (method not allowed)
        response = api_client.post(f"{BASE_URL}/api/rentals/invalid-id/central-swap", json={
            "old_item_barcode": "TEST",
            "new_item_barcode": "TEST2",
            "days_remaining": 1,
            "payment_method": "cash",
            "delta_amount": 0
        })
        
        # Should not be 405 (method not allowed)
        assert response.status_code != 405, "Central swap endpoint not found"
        print(f"✅ Central swap endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
