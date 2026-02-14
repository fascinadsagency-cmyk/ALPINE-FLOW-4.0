"""
Test deposit flow: Create rental with deposit -> Process return with deposit management
Tests the complete cycle:
1. Create rental with €40 deposit
2. Process return and verify deposit dialog logic
3. Verify cash movements are correctly registered
"""

import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://skiflow-admin-fix.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "admin123"


class TestDepositFlow:
    """Test the complete deposit flow from rental creation to return"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_1_verify_cash_session_is_open(self):
        """Verify cash session is open before running deposit tests"""
        response = requests.get(
            f"{BASE_URL}/api/cash/sessions/active",
            headers=self.headers
        )
        assert response.status_code == 200, f"No active cash session: {response.text}"
        session = response.json()
        assert session.get("status") == "open", "Cash session is not open"
        print(f"✅ Cash session {session['id'][:8]} is open")
    
    def test_2_get_available_item_and_customer(self):
        """Get an available item and customer for the rental test"""
        # Get available item
        response = requests.get(
            f"{BASE_URL}/api/items?status=available&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        items = response.json()
        # Find a non-generic item
        regular_items = [i for i in items if not i.get("is_generic", False)]
        assert len(regular_items) > 0, "No available regular items found"
        self.test_item = regular_items[0]
        print(f"✅ Found available item: {self.test_item['barcode']} ({self.test_item['item_type']})")
        
        # Get customer
        response = requests.get(
            f"{BASE_URL}/api/customers?search=",
            headers=self.headers
        )
        assert response.status_code == 200
        customers = response.json()
        assert len(customers) > 0, "No customers found"
        self.test_customer = customers[0]
        print(f"✅ Found customer: {self.test_customer['name']} ({self.test_customer['dni']})")
    
    def test_3_create_rental_with_deposit(self):
        """Create a rental with €40 deposit"""
        # First get available item and customer
        items_response = requests.get(
            f"{BASE_URL}/api/items?status=available&limit=10",
            headers=self.headers
        )
        items = items_response.json()
        regular_items = [i for i in items if not i.get("is_generic", False)]
        assert len(regular_items) > 0, "No available regular items"
        test_item = regular_items[0]
        
        customers_response = requests.get(
            f"{BASE_URL}/api/customers?search=",
            headers=self.headers
        )
        customers = customers_response.json()
        assert len(customers) > 0, "No customers"
        test_customer = customers[0]
        
        # Create rental with deposit
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        rental_data = {
            "customer_id": test_customer["id"],
            "start_date": today,
            "end_date": end_date,
            "items": [
                {
                    "barcode": test_item["barcode"],
                    "person_name": "",
                    "is_generic": False,
                    "quantity": 1,
                    "unit_price": 30.0
                }
            ],
            "payment_method": "cash",
            "total_amount": 30.0,
            "paid_amount": 30.0,
            "deposit": 40.0,  # €40 deposit
            "notes": "TEST_DEPOSIT_FLOW"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rentals",
            headers=self.headers,
            json=rental_data
        )
        
        assert response.status_code == 200, f"Failed to create rental: {response.text}"
        rental = response.json()
        
        # Verify deposit is recorded
        assert rental.get("deposit") == 40.0, f"Deposit not recorded: {rental.get('deposit')}"
        assert rental.get("total_amount") == 30.0, f"Total amount wrong: {rental.get('total_amount')}"
        assert rental.get("paid_amount") == 30.0, f"Paid amount wrong: {rental.get('paid_amount')}"
        assert rental.get("status") == "active", f"Status should be active: {rental.get('status')}"
        
        print(f"✅ Created rental {rental['id'][:8]} with deposit €{rental['deposit']}")
        print(f"   - Total: €{rental['total_amount']}, Paid: €{rental['paid_amount']}")
        
        # Store for next test
        self.created_rental_id = rental["id"]
        self.created_rental_barcode = test_item["barcode"]
        return rental["id"], test_item["barcode"]
    
    def test_4_verify_deposit_cash_movement(self):
        """Verify that deposit created a cash movement"""
        # Get recent cash movements
        response = requests.get(
            f"{BASE_URL}/api/cash/movements?limit=20",
            headers=self.headers
        )
        assert response.status_code == 200
        movements = response.json()
        
        # Find deposit movement (category = "deposit")
        deposit_movements = [m for m in movements if m.get("category") == "deposit"]
        
        # At least one deposit movement should exist
        assert len(deposit_movements) > 0, "No deposit movement found in cash movements"
        
        latest_deposit = deposit_movements[0]
        print(f"✅ Found deposit cash movement: €{latest_deposit.get('amount')} ({latest_deposit.get('category')})")
    
    def test_5_process_return_with_deposit_return(self):
        """Process return and verify deposit return action"""
        # First create a rental to return
        items_response = requests.get(
            f"{BASE_URL}/api/items?status=available&limit=10",
            headers=self.headers
        )
        items = items_response.json()
        regular_items = [i for i in items if not i.get("is_generic", False)]
        assert len(regular_items) > 0, "No available regular items"
        test_item = regular_items[0]
        
        customers_response = requests.get(
            f"{BASE_URL}/api/customers?search=",
            headers=self.headers
        )
        customers = customers_response.json()
        test_customer = customers[0]
        
        # Create rental with deposit
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        rental_data = {
            "customer_id": test_customer["id"],
            "start_date": today,
            "end_date": end_date,
            "items": [
                {
                    "barcode": test_item["barcode"],
                    "person_name": "",
                    "is_generic": False,
                    "quantity": 1,
                    "unit_price": 30.0
                }
            ],
            "payment_method": "cash",
            "total_amount": 30.0,
            "paid_amount": 30.0,
            "deposit": 40.0,
            "notes": "TEST_DEPOSIT_RETURN"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/rentals",
            headers=self.headers,
            json=rental_data
        )
        assert create_response.status_code == 200
        rental = create_response.json()
        rental_id = rental["id"]
        print(f"✅ Created rental {rental_id[:8]} for return test")
        
        # Now process the return with deposit_action = "return"
        return_data = {
            "barcodes": [test_item["barcode"]],
            "quantities": {},
            "deposit_action": "return",  # Return the deposit to customer
            "forfeit_reason": None
        }
        
        return_response = requests.post(
            f"{BASE_URL}/api/rentals/{rental_id}/return",
            headers=self.headers,
            json=return_data
        )
        
        assert return_response.status_code == 200, f"Failed to process return: {return_response.text}"
        result = return_response.json()
        
        # Verify return result
        assert result.get("status") == "returned", f"Status should be 'returned': {result.get('status')}"
        assert result.get("deposit_returned") == True, f"deposit_returned should be True: {result}"
        assert result.get("deposit_amount") == 40.0, f"deposit_amount should be 40: {result.get('deposit_amount')}"
        
        print(f"✅ Return processed successfully:")
        print(f"   - Status: {result.get('status')}")
        print(f"   - Deposit returned: {result.get('deposit_returned')}")
        print(f"   - Deposit amount: €{result.get('deposit_amount')}")
    
    def test_6_process_return_with_deposit_forfeit(self):
        """Process return with deposit forfeit (material damaged)"""
        # Get available items
        items_response = requests.get(
            f"{BASE_URL}/api/items?status=available&limit=10",
            headers=self.headers
        )
        items = items_response.json()
        regular_items = [i for i in items if not i.get("is_generic", False)]
        assert len(regular_items) > 0, "No available regular items"
        test_item = regular_items[0]
        
        customers_response = requests.get(
            f"{BASE_URL}/api/customers?search=",
            headers=self.headers
        )
        customers = customers_response.json()
        test_customer = customers[0]
        
        # Create rental with deposit
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        rental_data = {
            "customer_id": test_customer["id"],
            "start_date": today,
            "end_date": end_date,
            "items": [
                {
                    "barcode": test_item["barcode"],
                    "person_name": "",
                    "is_generic": False,
                    "quantity": 1,
                    "unit_price": 30.0
                }
            ],
            "payment_method": "cash",
            "total_amount": 30.0,
            "paid_amount": 30.0,
            "deposit": 40.0,
            "notes": "TEST_DEPOSIT_FORFEIT"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/rentals",
            headers=self.headers,
            json=rental_data
        )
        assert create_response.status_code == 200
        rental = create_response.json()
        rental_id = rental["id"]
        print(f"✅ Created rental {rental_id[:8]} for forfeit test")
        
        # Process the return with deposit_action = "forfeit"
        return_data = {
            "barcodes": [test_item["barcode"]],
            "quantities": {},
            "deposit_action": "forfeit",  # Forfeit the deposit (material damaged)
            "forfeit_reason": "Material dañado - Test automático"
        }
        
        return_response = requests.post(
            f"{BASE_URL}/api/rentals/{rental_id}/return",
            headers=self.headers,
            json=return_data
        )
        
        assert return_response.status_code == 200, f"Failed to process return: {return_response.text}"
        result = return_response.json()
        
        # Verify forfeit result
        assert result.get("status") == "returned", f"Status should be 'returned': {result.get('status')}"
        assert result.get("deposit_forfeited") == True, f"deposit_forfeited should be True: {result}"
        assert result.get("deposit_amount") == 40.0, f"deposit_amount should be 40: {result.get('deposit_amount')}"
        
        print(f"✅ Return with forfeit processed successfully:")
        print(f"   - Status: {result.get('status')}")
        print(f"   - Deposit forfeited: {result.get('deposit_forfeited')}")
        print(f"   - Deposit amount: €{result.get('deposit_amount')}")
    
    def test_7_verify_cash_movements_after_returns(self):
        """Verify cash movements after deposit returns"""
        response = requests.get(
            f"{BASE_URL}/api/cash/movements?limit=30",
            headers=self.headers
        )
        assert response.status_code == 200
        movements = response.json()
        
        # Check for deposit return movement
        deposit_return_movements = [m for m in movements if m.get("category") == "deposit_return"]
        assert len(deposit_return_movements) > 0, "No deposit_return movement found"
        print(f"✅ Found {len(deposit_return_movements)} deposit_return movement(s)")
        
        # Check for deposit forfeit movement
        deposit_forfeit_movements = [m for m in movements if m.get("category") == "deposit_forfeited"]
        assert len(deposit_forfeit_movements) > 0, "No deposit_forfeited movement found"
        print(f"✅ Found {len(deposit_forfeit_movements)} deposit_forfeited movement(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
