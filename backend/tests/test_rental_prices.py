"""
Test suite for Rental price capture and payment dialog
Tests the issue: "al cobrar en Nuevo Alquiler no se capturan los precios correctamente"
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin_master",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")

@pytest.fixture
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestRentalPriceCapture:
    """Tests for verifying prices are captured correctly in rentals"""
    
    def test_create_rental_with_price(self, api_client):
        """Test that rental creation captures price correctly"""
        # Step 1: Get an available item
        items_response = api_client.get(f"{BASE_URL}/api/items?status=available&limit=1")
        assert items_response.status_code == 200
        items = items_response.json()
        assert len(items) > 0, "No available items found"
        
        item = items[0]
        print(f"Using item: {item.get('barcode')} - {item.get('brand')} {item.get('model')}")
        
        # Step 2: Get a test customer
        customers_response = api_client.get(f"{BASE_URL}/api/customers?search=test&limit=1")
        assert customers_response.status_code == 200
        customers = customers_response.json()
        assert len(customers) > 0, "No test customers found"
        
        customer = customers[0]
        print(f"Using customer: {customer.get('name')} - {customer.get('id')}")
        
        # Step 3: Create rental with explicit price
        test_price = 25.00
        rental_data = {
            "customer_id": customer["id"],
            "items": [{
                "item_id": str(item["id"]),
                "barcode": item["barcode"],
                "item_type": item.get("item_type", "esquí"),
                "price": test_price,  # Explicit price
                "days": 1
            }],
            "start_date": "2026-02-11",
            "end_date": "2026-02-11",
            "total_price": test_price,
            "deposit": 0,
            "payment_method": "card",
            "paid_amount": test_price,
            "notes": "TEST_rental_price_capture"
        }
        
        print(f"Creating rental with price: €{test_price}")
        create_response = api_client.post(f"{BASE_URL}/api/rentals", json=rental_data)
        
        # Check response
        print(f"Create rental response status: {create_response.status_code}")
        print(f"Create rental response: {create_response.text[:500]}")
        
        assert create_response.status_code in [200, 201], f"Rental creation failed: {create_response.text}"
        
        rental = create_response.json()
        rental_id = rental.get("id")
        
        # Step 4: Verify the price was captured correctly
        assert rental.get("total_price") == test_price, f"Total price mismatch: expected {test_price}, got {rental.get('total_price')}"
        assert rental.get("paid_amount") == test_price, f"Paid amount mismatch: expected {test_price}, got {rental.get('paid_amount')}"
        
        # Step 5: Verify by fetching the rental
        get_response = api_client.get(f"{BASE_URL}/api/rentals/{rental_id}")
        if get_response.status_code == 200:
            fetched_rental = get_response.json()
            assert fetched_rental.get("total_price") == test_price, "Price not persisted correctly"
            print(f"PASS: Rental price persisted correctly: €{fetched_rental.get('total_price')}")
        
        # Cleanup: Mark as returned
        return_response = api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/return")
        print(f"Cleanup - return status: {return_response.status_code}")
        
        print("TEST PASSED: Rental price capture working correctly")
    
    def test_rental_endpoint_accepts_payment_data(self, api_client):
        """Test that rental endpoint accepts payment method, deposit, and discount"""
        # Get available item
        items_response = api_client.get(f"{BASE_URL}/api/items?status=available&limit=1")
        items = items_response.json()
        if not items:
            pytest.skip("No available items")
        
        item = items[0]
        
        # Get customer
        customers_response = api_client.get(f"{BASE_URL}/api/customers?search=test&limit=1")
        customers = customers_response.json()
        if not customers:
            pytest.skip("No test customers")
        
        customer = customers[0]
        
        # Create rental with all payment fields
        rental_data = {
            "customer_id": customer["id"],
            "items": [{
                "item_id": str(item["id"]),
                "barcode": item["barcode"],
                "item_type": item.get("item_type", "esquí"),
                "price": 30.00,
                "days": 1
            }],
            "start_date": "2026-02-11",
            "end_date": "2026-02-11",
            "total_price": 30.00,
            "deposit": 50.00,  # Test deposit
            "discount_percent": 10.0,  # Test discount
            "payment_method": "cash",
            "paid_amount": 77.00,  # 30 - 3 (10% discount) + 50 deposit = 77
            "notes": "TEST_payment_fields"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/rentals", json=rental_data)
        print(f"Response: {create_response.status_code} - {create_response.text[:300]}")
        
        assert create_response.status_code in [200, 201], f"Failed: {create_response.text}"
        
        rental = create_response.json()
        
        # Verify payment fields
        assert rental.get("deposit") == 50.00, f"Deposit mismatch: {rental.get('deposit')}"
        assert rental.get("payment_method") == "cash", f"Payment method mismatch: {rental.get('payment_method')}"
        
        # Cleanup
        rental_id = rental.get("id")
        api_client.post(f"{BASE_URL}/api/rentals/{rental_id}/return")
        
        print("TEST PASSED: Payment fields captured correctly")
    
    def test_tariffs_return_prices(self, api_client):
        """Test that tariffs API returns prices for calculating totals"""
        response = api_client.get(f"{BASE_URL}/api/tariffs")
        assert response.status_code == 200, f"Tariffs API failed: {response.text}"
        
        tariffs = response.json()
        assert len(tariffs) > 0, "No tariffs configured"
        
        # Check tariff structure
        tariff = tariffs[0]
        print(f"Sample tariff: {json.dumps(tariff, indent=2)[:500]}")
        
        # Tariffs should have prices
        has_prices = "prices" in tariff or "price" in tariff or "rental_price" in tariff
        assert has_prices, f"Tariff missing price data: {tariff.keys()}"
        
        print("TEST PASSED: Tariffs API returns price data")


class TestRentalEndpoint:
    """Tests for rental creation endpoint structure"""
    
    def test_rental_create_endpoint_exists(self, api_client):
        """Test POST /api/rentals endpoint exists"""
        # Send minimal data to check endpoint
        response = api_client.post(f"{BASE_URL}/api/rentals", json={})
        
        # Should get 422 (validation error) not 404
        assert response.status_code != 404, "Rental creation endpoint not found"
        print(f"Endpoint exists, status: {response.status_code}")
    
    def test_rental_list_endpoint(self, api_client):
        """Test GET /api/rentals endpoint"""
        response = api_client.get(f"{BASE_URL}/api/rentals")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        rentals = response.json()
        print(f"Found {len(rentals)} rentals")
        
        if len(rentals) > 0:
            # Check rental structure has price fields
            rental = rentals[0]
            print(f"Sample rental keys: {rental.keys()}")
            assert "total_price" in rental, "Rental missing total_price field"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
