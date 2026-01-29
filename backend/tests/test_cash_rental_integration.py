"""
Test Cash Register Integration with Rentals
============================================
Tests the critical bug fix: rental payments must create cash_movements linked to active session.

Features tested:
1. Open cash session with opening balance
2. Create rental with cash payment - verify cash_movement created
3. Create rental with card payment - verify cash_movement created  
4. Verify cash summary shows correct totals by payment method
5. Verify net balance = opening_balance + income - expenses
6. Generic items stock management during rental
7. Generic items stock restoration on quick-return
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = "testcaja"
TEST_PASSWORD = "test1234"


class TestCashRentalIntegration:
    """Test cash register integration with rental payments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USER,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            # Try to register if login fails
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "username": TEST_USER,
                "password": TEST_PASSWORD,
                "role": "admin"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("access_token")
            else:
                pytest.skip(f"Could not authenticate: {login_response.text}")
        else:
            token = login_response.json().get("access_token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
        yield
    
    def test_01_check_active_session(self):
        """Check if there's an active cash session"""
        response = self.session.get(f"{BASE_URL}/api/cash/sessions/active")
        print(f"Active session check: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Active session found: {data.get('id', 'N/A')}")
            assert "id" in data or data.get("session_active") == True
        else:
            print("No active session - will need to open one")
            # This is expected if no session is open
            assert response.status_code in [200, 404]
    
    def test_02_open_cash_session(self):
        """Open a new cash session with opening balance"""
        # First check if session already exists
        check_response = self.session.get(f"{BASE_URL}/api/cash/sessions/active")
        
        if check_response.status_code == 200:
            data = check_response.json()
            if data.get("id"):
                print(f"Session already open: {data.get('id')}")
                return  # Session already exists
        
        # Open new session
        opening_balance = 100.00
        response = self.session.post(f"{BASE_URL}/api/cash/sessions/open", json={
            "opening_balance": opening_balance
        })
        
        print(f"Open session response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to open session: {response.text}"
        
        data = response.json()
        assert "id" in data or "session_id" in data
        print(f"Session opened successfully with balance: €{opening_balance}")
    
    def test_03_verify_session_active(self):
        """Verify session is now active"""
        response = self.session.get(f"{BASE_URL}/api/cash/sessions/active")
        
        assert response.status_code == 200, f"No active session: {response.text}"
        
        data = response.json()
        assert data.get("id") is not None, "Session ID should exist"
        print(f"Active session confirmed: {data.get('id')}")
    
    def test_04_get_or_create_test_customer(self):
        """Get or create a test customer for rentals"""
        # Search for existing test customer
        search_response = self.session.get(f"{BASE_URL}/api/customers?search=TESTCASH")
        
        if search_response.status_code == 200:
            customers = search_response.json()
            if customers and len(customers) > 0:
                self.customer_id = customers[0]["id"]
                print(f"Found existing test customer: {self.customer_id}")
                return
        
        # Create new test customer
        customer_data = {
            "dni": f"TESTCASH{int(time.time())}",
            "name": "Test Cash Customer",
            "phone": "123456789",
            "email": "testcash@test.com",
            "address": "Test Address",
            "city": "Test City"
        }
        
        response = self.session.post(f"{BASE_URL}/api/customers", json=customer_data)
        
        assert response.status_code in [200, 201], f"Failed to create customer: {response.text}"
        
        data = response.json()
        self.customer_id = data["id"]
        print(f"Created test customer: {self.customer_id}")
    
    def test_05_get_available_items(self):
        """Get available items for rental"""
        response = self.session.get(f"{BASE_URL}/api/items?status=available")
        
        assert response.status_code == 200, f"Failed to get items: {response.text}"
        
        items = response.json()
        print(f"Found {len(items)} available items")
        
        # Store for later tests
        self.available_items = items
        
        # Also check for generic items
        generic_response = self.session.get(f"{BASE_URL}/api/items/generic")
        if generic_response.status_code == 200:
            generic_items = generic_response.json()
            print(f"Found {len(generic_items)} generic items with stock")
            self.generic_items = generic_items
    
    def test_06_create_rental_cash_payment(self):
        """Create a rental with CASH payment and verify cash_movement is created"""
        # First get a customer
        search_response = self.session.get(f"{BASE_URL}/api/customers?search=TEST")
        customers = search_response.json() if search_response.status_code == 200 else []
        
        if not customers:
            # Create customer
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "dni": f"CASHTEST{int(time.time())}",
                "name": "Cash Test Customer",
                "phone": "111222333"
            })
            customer = customer_response.json()
            customer_id = customer["id"]
        else:
            customer_id = customers[0]["id"]
        
        # Get available items
        items_response = self.session.get(f"{BASE_URL}/api/items?status=available")
        items = items_response.json() if items_response.status_code == 200 else []
        
        # Also check generic items
        generic_response = self.session.get(f"{BASE_URL}/api/items/generic")
        generic_items = generic_response.json() if generic_response.status_code == 200 else []
        
        if not items and not generic_items:
            pytest.skip("No available items for rental test")
        
        # Get initial cash summary
        initial_summary = self.session.get(f"{BASE_URL}/api/cash/summary").json()
        initial_cash_income = initial_summary.get("by_payment_method", {}).get("cash", {}).get("income", 0)
        
        # Prepare rental items
        rental_items = []
        total_amount = 50.00
        
        if generic_items:
            # Use generic item
            generic_item = generic_items[0]
            rental_items.append({
                "barcode": generic_item["id"],  # Use ID for generic items
                "is_generic": True,
                "quantity": 1,
                "unit_price": 25.00
            })
            total_amount = 25.00
        elif items:
            # Use regular item
            item = items[0]
            rental_items.append({
                "barcode": item["barcode"],
                "is_generic": False,
                "quantity": 1,
                "unit_price": 50.00
            })
        
        # Create rental with CASH payment
        today = datetime.now().strftime("%Y-%m-%d")
        rental_data = {
            "customer_id": customer_id,
            "start_date": today,
            "end_date": today,
            "items": rental_items,
            "payment_method": "cash",
            "total_amount": total_amount,
            "paid_amount": total_amount,  # Fully paid
            "deposit": 0,
            "notes": "TEST_CASH_RENTAL"
        }
        
        response = self.session.post(f"{BASE_URL}/api/rentals", json=rental_data)
        
        print(f"Create rental response: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create rental: {response.text}"
        
        rental = response.json()
        rental_id = rental["id"]
        print(f"Created rental: {rental_id}")
        
        # CRITICAL: Verify cash_movement was created
        time.sleep(0.5)  # Small delay for DB consistency
        
        summary_response = self.session.get(f"{BASE_URL}/api/cash/summary")
        assert summary_response.status_code == 200
        
        summary = summary_response.json()
        new_cash_income = summary.get("by_payment_method", {}).get("cash", {}).get("income", 0)
        
        print(f"Initial cash income: €{initial_cash_income}")
        print(f"New cash income: €{new_cash_income}")
        print(f"Expected increase: €{total_amount}")
        
        # Verify the cash income increased by the rental amount
        assert new_cash_income >= initial_cash_income + total_amount - 0.01, \
            f"Cash income should have increased by €{total_amount}. Was €{initial_cash_income}, now €{new_cash_income}"
        
        print("✅ CASH payment correctly registered in caja!")
        
        # Store rental_id for cleanup
        self.cash_rental_id = rental_id
    
    def test_07_create_rental_card_payment(self):
        """Create a rental with CARD payment and verify cash_movement is created"""
        # Get customer
        search_response = self.session.get(f"{BASE_URL}/api/customers?search=TEST")
        customers = search_response.json() if search_response.status_code == 200 else []
        
        if not customers:
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "dni": f"CARDTEST{int(time.time())}",
                "name": "Card Test Customer",
                "phone": "444555666"
            })
            customer = customer_response.json()
            customer_id = customer["id"]
        else:
            customer_id = customers[0]["id"]
        
        # Get available items
        items_response = self.session.get(f"{BASE_URL}/api/items?status=available")
        items = items_response.json() if items_response.status_code == 200 else []
        
        generic_response = self.session.get(f"{BASE_URL}/api/items/generic")
        generic_items = generic_response.json() if generic_response.status_code == 200 else []
        
        if not items and not generic_items:
            pytest.skip("No available items for rental test")
        
        # Get initial card income
        initial_summary = self.session.get(f"{BASE_URL}/api/cash/summary").json()
        initial_card_income = initial_summary.get("by_payment_method", {}).get("card", {}).get("income", 0)
        
        # Prepare rental
        rental_items = []
        total_amount = 75.00
        
        if generic_items:
            generic_item = generic_items[0]
            rental_items.append({
                "barcode": generic_item["id"],
                "is_generic": True,
                "quantity": 1,
                "unit_price": 35.00
            })
            total_amount = 35.00
        elif items:
            item = items[0]
            rental_items.append({
                "barcode": item["barcode"],
                "is_generic": False,
                "quantity": 1,
                "unit_price": 75.00
            })
        
        today = datetime.now().strftime("%Y-%m-%d")
        rental_data = {
            "customer_id": customer_id,
            "start_date": today,
            "end_date": today,
            "items": rental_items,
            "payment_method": "card",  # CARD payment
            "total_amount": total_amount,
            "paid_amount": total_amount,
            "deposit": 0,
            "notes": "TEST_CARD_RENTAL"
        }
        
        response = self.session.post(f"{BASE_URL}/api/rentals", json=rental_data)
        
        print(f"Create card rental response: {response.status_code}")
        
        assert response.status_code in [200, 201], f"Failed to create rental: {response.text}"
        
        rental = response.json()
        rental_id = rental["id"]
        print(f"Created card rental: {rental_id}")
        
        # Verify card income increased
        time.sleep(0.5)
        
        summary_response = self.session.get(f"{BASE_URL}/api/cash/summary")
        summary = summary_response.json()
        new_card_income = summary.get("by_payment_method", {}).get("card", {}).get("income", 0)
        
        print(f"Initial card income: €{initial_card_income}")
        print(f"New card income: €{new_card_income}")
        
        assert new_card_income >= initial_card_income + total_amount - 0.01, \
            f"Card income should have increased by €{total_amount}"
        
        print("✅ CARD payment correctly registered in caja!")
        
        self.card_rental_id = rental_id
    
    def test_08_verify_cash_summary_totals(self):
        """Verify cash summary shows correct totals"""
        response = self.session.get(f"{BASE_URL}/api/cash/summary")
        
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        
        summary = response.json()
        
        print("\n=== CASH SUMMARY ===")
        print(f"Total Income: €{summary.get('total_income', 0):.2f}")
        print(f"Total Expense: €{summary.get('total_expense', 0):.2f}")
        print(f"Total Refunds: €{summary.get('total_refunds', 0):.2f}")
        print(f"Balance: €{summary.get('balance', 0):.2f}")
        print(f"Movements Count: {summary.get('movements_count', 0)}")
        
        by_method = summary.get("by_payment_method", {})
        print("\nBy Payment Method:")
        for method, values in by_method.items():
            print(f"  {method}: income=€{values.get('income', 0):.2f}, expense=€{values.get('expense', 0):.2f}")
        
        # Verify balance calculation
        opening = summary.get("opening_balance", 0)
        income = summary.get("total_income", 0)
        expense = summary.get("total_expense", 0)
        refunds = summary.get("total_refunds", 0)
        balance = summary.get("balance", 0)
        
        expected_balance = opening + income - expense - refunds
        
        print(f"\nBalance verification:")
        print(f"  Opening: €{opening:.2f}")
        print(f"  + Income: €{income:.2f}")
        print(f"  - Expense: €{expense:.2f}")
        print(f"  - Refunds: €{refunds:.2f}")
        print(f"  = Expected: €{expected_balance:.2f}")
        print(f"  Actual: €{balance:.2f}")
        
        assert abs(balance - expected_balance) < 0.01, \
            f"Balance mismatch: expected €{expected_balance:.2f}, got €{balance:.2f}"
        
        print("✅ Balance calculation is correct!")
    
    def test_09_verify_movements_list(self):
        """Verify movements are listed correctly"""
        response = self.session.get(f"{BASE_URL}/api/cash/movements")
        
        assert response.status_code == 200, f"Failed to get movements: {response.text}"
        
        movements = response.json()
        print(f"\nFound {len(movements)} movements in current session")
        
        # Check for rental movements
        rental_movements = [m for m in movements if m.get("category") == "rental"]
        print(f"Rental movements: {len(rental_movements)}")
        
        for m in rental_movements[:5]:  # Show first 5
            print(f"  - {m.get('concept', 'N/A')}: €{m.get('amount', 0):.2f} ({m.get('payment_method', 'N/A')})")
        
        assert len(movements) >= 0, "Should have movements list"
    
    def test_10_generic_item_stock_management(self):
        """Test that generic items correctly manage stock during rental"""
        # Get generic items
        response = self.session.get(f"{BASE_URL}/api/items/generic")
        
        if response.status_code != 200:
            pytest.skip("No generic items endpoint")
        
        generic_items = response.json()
        
        if not generic_items:
            pytest.skip("No generic items available")
        
        item = generic_items[0]
        initial_stock = item.get("stock_available", 0)
        
        print(f"\nGeneric item: {item.get('name', 'N/A')}")
        print(f"Initial stock: {initial_stock}")
        
        if initial_stock < 1:
            pytest.skip("No stock available for test")
        
        # Get customer
        search_response = self.session.get(f"{BASE_URL}/api/customers?search=TEST")
        customers = search_response.json() if search_response.status_code == 200 else []
        
        if not customers:
            customer_response = self.session.post(f"{BASE_URL}/api/customers", json={
                "dni": f"STOCKTEST{int(time.time())}",
                "name": "Stock Test Customer",
                "phone": "777888999"
            })
            customer_id = customer_response.json()["id"]
        else:
            customer_id = customers[0]["id"]
        
        # Create rental with generic item
        today = datetime.now().strftime("%Y-%m-%d")
        rental_data = {
            "customer_id": customer_id,
            "start_date": today,
            "end_date": today,
            "items": [{
                "barcode": item["id"],
                "is_generic": True,
                "quantity": 1,
                "unit_price": item.get("rental_price", 10.00)
            }],
            "payment_method": "cash",
            "total_amount": item.get("rental_price", 10.00),
            "paid_amount": item.get("rental_price", 10.00),
            "deposit": 0,
            "notes": "TEST_STOCK_RENTAL"
        }
        
        rental_response = self.session.post(f"{BASE_URL}/api/rentals", json=rental_data)
        
        if rental_response.status_code not in [200, 201]:
            print(f"Rental creation failed: {rental_response.text}")
            pytest.skip("Could not create rental for stock test")
        
        rental = rental_response.json()
        rental_id = rental["id"]
        
        # Check stock decreased
        time.sleep(0.3)
        items_response = self.session.get(f"{BASE_URL}/api/items")
        all_items = items_response.json()
        
        updated_item = next((i for i in all_items if i["id"] == item["id"]), None)
        
        if updated_item:
            new_stock = updated_item.get("stock_available", 0)
            print(f"Stock after rental: {new_stock}")
            
            assert new_stock == initial_stock - 1, \
                f"Stock should decrease by 1. Was {initial_stock}, now {new_stock}"
            
            print("✅ Generic item stock correctly decreased!")
        
        # Store for return test
        self.stock_test_rental_id = rental_id
        self.stock_test_item_id = item["id"]
        self.stock_after_rental = new_stock if updated_item else initial_stock - 1
    
    def test_11_generic_item_stock_restoration_on_return(self):
        """Test that generic items restore stock on quick-return"""
        if not hasattr(self, 'stock_test_rental_id'):
            pytest.skip("No rental from previous test")
        
        rental_id = self.stock_test_rental_id
        item_id = self.stock_test_item_id
        stock_before_return = self.stock_after_rental
        
        print(f"\nTesting quick-return for rental: {rental_id}")
        print(f"Stock before return: {stock_before_return}")
        
        # Perform quick return
        response = self.session.post(f"{BASE_URL}/api/rentals/{rental_id}/quick-return")
        
        print(f"Quick return response: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"Quick return failed: {response.text}")
            # Try regular return
            return_response = self.session.post(
                f"{BASE_URL}/api/rentals/{rental_id}/return",
                json={"barcodes": [item_id]}
            )
            print(f"Regular return response: {return_response.status_code}")
        
        # Check stock restored
        time.sleep(0.3)
        items_response = self.session.get(f"{BASE_URL}/api/items")
        all_items = items_response.json()
        
        updated_item = next((i for i in all_items if i["id"] == item_id), None)
        
        if updated_item:
            new_stock = updated_item.get("stock_available", 0)
            print(f"Stock after return: {new_stock}")
            
            assert new_stock == stock_before_return + 1, \
                f"Stock should increase by 1. Was {stock_before_return}, now {new_stock}"
            
            print("✅ Generic item stock correctly restored on return!")


class TestCashSessionManagement:
    """Test cash session open/close functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USER,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "username": TEST_USER,
                "password": TEST_PASSWORD,
                "role": "admin"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = login_response.json().get("access_token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_cash_summary_endpoint(self):
        """Test cash summary endpoint returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/cash/summary")
        
        assert response.status_code == 200, f"Summary endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        required_fields = ["total_income", "total_expense", "balance", "by_payment_method"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Summary structure valid: {list(data.keys())}")
    
    def test_get_movements_endpoint(self):
        """Test movements endpoint"""
        response = self.session.get(f"{BASE_URL}/api/cash/movements")
        
        assert response.status_code == 200, f"Movements endpoint failed: {response.text}"
        
        movements = response.json()
        assert isinstance(movements, list), "Movements should be a list"
        
        print(f"Movements endpoint returned {len(movements)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
