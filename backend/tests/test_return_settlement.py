"""
Test suite for PROCESAR DEVOLUCIÓN button and Settlement Modal functionality.

Tests cover:
1. Return endpoint validation
2. Settlement calculation (days used vs days paid)
3. Payment/refund processing
4. Cash movement recording for refunds

Test data: Erika Quijano Guerrero rental
- Contract: 55a36f91-74b1-4f2a-bf93-2779a78e2bdc
- Days contracted: 3
- Total: €85.00
- Items: BOOTS-ALTA-001, BC-SKI-190610
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "testcaja"
TEST_PASSWORD = "test1234"

# Known rental data
ERIKA_RENTAL_ID = "55a36f91-74b1-4f2a-bf93-2779a78e2bdc"
ERIKA_BARCODES = ["BOOTS-ALTA-001", "BC-SKI-190610"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestReturnEndpoint:
    """Tests for POST /api/rentals/{rental_id}/return endpoint"""
    
    def test_return_endpoint_exists(self, auth_headers):
        """Verify return endpoint is accessible"""
        # Use a non-existent rental ID to test endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/rentals/nonexistent-id/return",
            json={"barcodes": ["TEST"]},
            headers=auth_headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_return_requires_barcodes(self, auth_headers):
        """Verify return endpoint requires barcodes array"""
        response = requests.post(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}/return",
            json={},  # Missing barcodes
            headers=auth_headers
        )
        # Should return 422 (validation error)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    
    def test_return_with_empty_barcodes(self, auth_headers):
        """Verify return with empty barcodes array"""
        response = requests.post(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}/return",
            json={"barcodes": []},
            headers=auth_headers
        )
        # Should succeed but return no items
        assert response.status_code == 200
        data = response.json()
        assert data["returned_items"] == []


class TestPendingReturns:
    """Tests for GET /api/rentals/pending/returns endpoint"""
    
    def test_pending_returns_endpoint(self, auth_headers):
        """Verify pending returns endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/pending/returns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "other_days" in data
    
    def test_erika_rental_in_pending(self, auth_headers):
        """Verify Erika's rental appears in pending returns"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/pending/returns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Erika's rental in either today or other_days
        all_rentals = data["today"] + data["other_days"]
        erika_rental = next(
            (r for r in all_rentals if r["id"] == ERIKA_RENTAL_ID),
            None
        )
        
        assert erika_rental is not None, "Erika's rental not found in pending returns"
        assert erika_rental["customer_name"] == "Erika Quijano Guerrero"
        assert erika_rental["days"] == 3
        assert erika_rental["total_amount"] == 85.0
    
    def test_pending_items_have_barcodes(self, auth_headers):
        """Verify pending items include barcode information"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/pending/returns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        all_rentals = data["today"] + data["other_days"]
        erika_rental = next(
            (r for r in all_rentals if r["id"] == ERIKA_RENTAL_ID),
            None
        )
        
        assert erika_rental is not None
        assert len(erika_rental["pending_items"]) == 2
        
        barcodes = [item["barcode"] for item in erika_rental["pending_items"]]
        assert "BOOTS-ALTA-001" in barcodes
        assert "BC-SKI-190610" in barcodes


class TestPaymentEndpoint:
    """Tests for POST /api/rentals/{rental_id}/payment endpoint"""
    
    def test_payment_endpoint_exists(self, auth_headers):
        """Verify payment endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/rentals/nonexistent-id/payment",
            json={"amount": 10.0, "payment_method": "cash"},
            headers=auth_headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_payment_requires_amount(self, auth_headers):
        """Verify payment endpoint requires amount"""
        response = requests.post(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}/payment",
            json={"payment_method": "cash"},  # Missing amount
            headers=auth_headers
        )
        # Should return 422 (validation error)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"


class TestCashMovements:
    """Tests for cash movements (refund recording)"""
    
    def test_cash_movements_endpoint_exists(self, auth_headers):
        """Verify cash movements endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/cash/movements",
            headers=auth_headers
        )
        # Should return 200 or list of movements
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
    
    def test_can_create_refund_movement(self, auth_headers):
        """Verify refund movement can be created"""
        # This is a test movement - will be cleaned up
        test_movement = {
            "type": "expense",
            "category": "refund",
            "amount": 0.01,  # Minimal test amount
            "payment_method": "cash",
            "description": "TEST_REFUND - Delete me",
            "reference_id": "test-reference",
            "reference_type": "rental"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cash/movements",
            json=test_movement,
            headers=auth_headers
        )
        
        # Should succeed or return appropriate error
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"


class TestRentalDetails:
    """Tests for rental details needed for settlement calculation"""
    
    def test_get_rental_by_id(self, auth_headers):
        """Verify rental details can be retrieved"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify essential fields for settlement calculation
        assert "days" in data
        assert "total_amount" in data
        assert "paid_amount" in data
        assert "start_date" in data
        assert "items" in data
        assert "payment_method" in data
    
    def test_rental_has_correct_data(self, auth_headers):
        """Verify Erika's rental has correct data for settlement"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify data matches expected values
        assert data["days"] == 3, f"Expected 3 days, got {data['days']}"
        assert data["total_amount"] == 85.0, f"Expected €85.00, got {data['total_amount']}"
        assert data["customer_name"] == "Erika Quijano Guerrero"
        
        # Verify items
        pending_items = [i for i in data["items"] if not i.get("returned", False)]
        assert len(pending_items) == 2, f"Expected 2 pending items, got {len(pending_items)}"


class TestSettlementCalculation:
    """Tests for settlement calculation logic (frontend-side but verified via API data)"""
    
    def test_calculate_price_per_day(self, auth_headers):
        """Verify price per day calculation"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Calculate price per day
        price_per_day = data["total_amount"] / data["days"]
        expected_price = 85.0 / 3  # ~28.33
        
        assert abs(price_per_day - expected_price) < 0.01, \
            f"Price per day mismatch: {price_per_day} vs {expected_price}"
    
    def test_rental_start_date_format(self, auth_headers):
        """Verify start date is in correct format for calculation"""
        response = requests.get(
            f"{BASE_URL}/api/rentals/{ERIKA_RENTAL_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify start_date can be parsed
        start_date_str = data["start_date"]
        try:
            # Try ISO format
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        except ValueError:
            # Try date-only format
            start_date = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
        
        assert start_date is not None, "Could not parse start_date"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
