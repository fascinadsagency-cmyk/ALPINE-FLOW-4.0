"""
Test suite for Centralized Swap (Modo Canje) feature
Tests the POST /api/rentals/{rental_id}/central-swap endpoint
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "testcaja"
TEST_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCentralSwapEndpoint:
    """Tests for POST /api/rentals/{rental_id}/central-swap"""
    
    def test_swap_endpoint_exists(self, api_client):
        """Verify the central-swap endpoint exists and responds"""
        # Test with invalid rental ID to verify endpoint exists
        response = api_client.post(f"{BASE_URL}/api/rentals/invalid-id/central-swap", json={
            "old_item_barcode": "TEST",
            "new_item_barcode": "TEST2",
            "days_remaining": 1,
            "payment_method": "cash",
            "delta_amount": 0
        })
        # Should return 404 for invalid rental, not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Endpoint should exist. Got: {response.status_code}"
        print("✓ Central-swap endpoint exists and responds")
    
    def test_swap_requires_valid_rental(self, api_client):
        """Verify swap fails with non-existent rental"""
        fake_rental_id = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/rentals/{fake_rental_id}/central-swap", json={
            "old_item_barcode": "TEST001",
            "new_item_barcode": "J005",
            "days_remaining": 3,
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 404
        assert "no encontrado" in response.json().get("detail", "").lower()
        print("✓ Swap correctly rejects non-existent rental")
    
    def test_swap_requires_active_rental(self, api_client):
        """Verify swap fails on returned/closed rentals"""
        # Get a returned rental if exists
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=returned")
        if rentals_response.status_code == 200:
            returned_rentals = rentals_response.json()
            if returned_rentals:
                rental_id = returned_rentals[0]["id"]
                response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
                    "old_item_barcode": "TEST",
                    "new_item_barcode": "TEST2",
                    "days_remaining": 1,
                    "payment_method": "cash",
                    "delta_amount": 0
                })
                assert response.status_code == 400
                print("✓ Swap correctly rejects closed rentals")
                return
        print("⚠ No returned rentals to test - skipping")
    
    def test_swap_validates_old_item_in_rental(self, api_client):
        """Verify swap fails if old item is not in the rental"""
        # Get an active rental
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        assert rentals_response.status_code == 200
        active_rentals = rentals_response.json()
        
        if not active_rentals:
            pytest.skip("No active rentals available for testing")
        
        rental = active_rentals[0]
        rental_id = rental["id"]
        
        # Try to swap an item that's not in the rental
        response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
            "old_item_barcode": "NONEXISTENT_ITEM_12345",
            "new_item_barcode": "J005",
            "days_remaining": 3,
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 404
        assert "no encontrado" in response.json().get("detail", "").lower()
        print("✓ Swap correctly validates old item exists in rental")
    
    def test_swap_validates_new_item_exists(self, api_client):
        """Verify swap fails if new item doesn't exist in inventory"""
        # Get an active rental with items
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        assert rentals_response.status_code == 200
        active_rentals = rentals_response.json()
        
        if not active_rentals:
            pytest.skip("No active rentals available for testing")
        
        rental = active_rentals[0]
        rental_id = rental["id"]
        
        # Find a non-returned item in the rental
        old_item = None
        for item in rental.get("items", []):
            if not item.get("returned"):
                old_item = item
                break
        
        if not old_item:
            pytest.skip("No non-returned items in rental")
        
        old_barcode = old_item.get("internal_code") or old_item.get("barcode")
        
        response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
            "old_item_barcode": old_barcode,
            "new_item_barcode": "NONEXISTENT_NEW_ITEM_99999",
            "days_remaining": 3,
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 404
        assert "no encontrado" in response.json().get("detail", "").lower()
        print("✓ Swap correctly validates new item exists in inventory")
    
    def test_swap_validates_new_item_available(self, api_client):
        """Verify swap fails if new item is already rented"""
        # Get an active rental
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        assert rentals_response.status_code == 200
        active_rentals = rentals_response.json()
        
        if not active_rentals:
            pytest.skip("No active rentals available for testing")
        
        rental = active_rentals[0]
        rental_id = rental["id"]
        
        # Find a non-returned item in the rental
        old_item = None
        for item in rental.get("items", []):
            if not item.get("returned"):
                old_item = item
                break
        
        if not old_item:
            pytest.skip("No non-returned items in rental")
        
        old_barcode = old_item.get("internal_code") or old_item.get("barcode")
        
        # Try to swap with an item that's already rented (use another item from same rental)
        rented_item = None
        for item in rental.get("items", []):
            if not item.get("returned") and item != old_item:
                rented_item = item
                break
        
        if rented_item:
            rented_barcode = rented_item.get("internal_code") or rented_item.get("barcode")
            response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
                "old_item_barcode": old_barcode,
                "new_item_barcode": rented_barcode,
                "days_remaining": 3,
                "payment_method": "cash",
                "delta_amount": 0
            })
            assert response.status_code == 400
            assert "alquilado" in response.json().get("detail", "").lower()
            print("✓ Swap correctly rejects already rented items")
        else:
            print("⚠ No second rented item to test - skipping")


class TestCentralSwapFunctionality:
    """Tests for actual swap functionality"""
    
    def test_get_active_rentals(self, api_client):
        """Verify we can get active rentals for swap testing"""
        response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        assert response.status_code == 200
        rentals = response.json()
        print(f"✓ Found {len(rentals)} active rentals")
        
        # Check rental structure
        if rentals:
            rental = rentals[0]
            assert "id" in rental
            assert "customer_name" in rental
            assert "items" in rental
            print(f"✓ Active rental structure is correct: {rental['customer_name']}")
    
    def test_get_available_items_for_swap(self, api_client):
        """Verify we can find available items for swapping"""
        # Test items mentioned in the request: J005, J009, J010, 4041, 4043
        test_codes = ["J005", "4041"]
        
        for code in test_codes:
            response = api_client.get(f"{BASE_URL}/api/items?search={code}")
            assert response.status_code == 200
            items = response.json()
            
            if items:
                item = items[0]
                print(f"✓ Found item {code}: {item.get('item_type')} - Status: {item.get('status')}")
            else:
                print(f"⚠ Item {code} not found in inventory")
    
    def test_tariffs_available_for_price_calculation(self, api_client):
        """Verify tariffs are available for price delta calculation"""
        response = api_client.get(f"{BASE_URL}/api/tariffs")
        assert response.status_code == 200
        tariffs = response.json()
        print(f"✓ Found {len(tariffs)} tariffs for price calculation")
        
        # Check tariff structure
        if tariffs:
            tariff = tariffs[0]
            assert "item_type" in tariff
            assert "day_1" in tariff
            print(f"✓ Tariff structure correct: {tariff.get('item_type')}")


class TestSwapRequestValidation:
    """Tests for request body validation"""
    
    def test_swap_requires_old_item_barcode(self, api_client):
        """Verify swap requires old_item_barcode field"""
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        if rentals_response.status_code != 200 or not rentals_response.json():
            pytest.skip("No active rentals")
        
        rental_id = rentals_response.json()[0]["id"]
        
        response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
            "new_item_barcode": "J005",
            "days_remaining": 3,
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 422  # Validation error
        print("✓ Swap correctly requires old_item_barcode")
    
    def test_swap_requires_new_item_barcode(self, api_client):
        """Verify swap requires new_item_barcode field"""
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        if rentals_response.status_code != 200 or not rentals_response.json():
            pytest.skip("No active rentals")
        
        rental_id = rentals_response.json()[0]["id"]
        
        response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
            "old_item_barcode": "TEST001",
            "days_remaining": 3,
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 422  # Validation error
        print("✓ Swap correctly requires new_item_barcode")
    
    def test_swap_requires_days_remaining(self, api_client):
        """Verify swap requires days_remaining field"""
        rentals_response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        if rentals_response.status_code != 200 or not rentals_response.json():
            pytest.skip("No active rentals")
        
        rental_id = rentals_response.json()[0]["id"]
        
        response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/central-swap", json={
            "old_item_barcode": "TEST001",
            "new_item_barcode": "J005",
            "payment_method": "cash",
            "delta_amount": 0
        })
        assert response.status_code == 422  # Validation error
        print("✓ Swap correctly requires days_remaining")


class TestSwapUIIntegration:
    """Tests for UI-related API calls"""
    
    def test_items_search_for_barcode_scanner(self, api_client):
        """Verify items search works for barcode scanner input"""
        # Test search by internal_code
        response = api_client.get(f"{BASE_URL}/api/items?search=J005")
        assert response.status_code == 200
        items = response.json()
        print(f"✓ Items search returns {len(items)} results for 'J005'")
        
        # Test search by barcode
        response = api_client.get(f"{BASE_URL}/api/items?search=BOOTS")
        assert response.status_code == 200
        items = response.json()
        print(f"✓ Items search returns {len(items)} results for 'BOOTS'")
    
    def test_rental_items_have_required_fields(self, api_client):
        """Verify rental items have fields needed for swap detection"""
        response = api_client.get(f"{BASE_URL}/api/rentals?status=active")
        assert response.status_code == 200
        rentals = response.json()
        
        if not rentals:
            pytest.skip("No active rentals")
        
        rental = rentals[0]
        items = rental.get("items", [])
        
        if items:
            item = items[0]
            # Check required fields for swap detection
            assert "item_type" in item, "item_type required for auto-detection"
            assert "barcode" in item or "internal_code" in item, "barcode/internal_code required"
            print(f"✓ Rental items have required fields for swap: item_type={item.get('item_type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
