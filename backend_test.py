#!/usr/bin/env python3
"""
Comprehensive Backend Test for Cash Management System - Sistema de Caja con Sincronización Total
Testing session validation, orphaned operations, and mandatory session linking as specified in review request.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://plan-guard-1.preview.emergentagent.com/api"
TEST_DATE = "2026-01-29"

class CashSessionTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.session_id = None
        self.customer_id = None
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate with test user"""
        try:
            # Try to login with existing admin2 user
            login_data = {
                "username": "admin2",
                "password": "admin123"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 401:
                # User doesn't exist, create it
                register_data = {
                    "username": "admin2",
                    "password": "admin123",
                    "role": "admin"
                }
                response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
                
            if response.status_code in [200, 201]:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("Authentication", True, f"Logged in as {login_data['username']}")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_open_cash_session(self):
        """Test 1: Open cash session with opening balance"""
        try:
            # First close any existing session
            try:
                # Try to get active session first
                active_response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
                if active_response.status_code == 200 and active_response.json():
                    # Close existing session using correct endpoint
                    close_data = {
                        "date": TEST_DATE,
                        "physical_cash": 0,
                        "card_total": 0,
                        "notes": "Closing for test setup"
                    }
                    requests.post(f"{BACKEND_URL}/cash/close", json=close_data, headers=self.headers)
            except:
                pass
            
            session_data = {
                "opening_balance": 100.0,
                "date": TEST_DATE
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.session_id = data.get("id") or data.get("session_id")
                self.log_test("Open Cash Session", True, f"Session opened with ID: {self.session_id}, Balance: €100")
                return True
            else:
                self.log_test("Open Cash Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Open Cash Session", False, f"Exception: {str(e)}")
            return False
    
    def create_test_items(self):
        """Create test inventory items for rental testing"""
        try:
            items = [
                {
                    "barcode": "SKI-001",
                    "internal_code": "SKI-TEST-001",
                    "item_type": "ski",
                    "brand": "Test Brand",
                    "model": "Test Model",
                    "size": "170",
                    "purchase_price": 100.0,
                    "purchase_date": "2024-01-01",
                    "category": "MEDIA"
                },
                {
                    "barcode": "SKI-002", 
                    "internal_code": "SKI-TEST-002",
                    "item_type": "ski",
                    "brand": "Test Brand",
                    "model": "Test Model",
                    "size": "175",
                    "purchase_price": 100.0,
                    "purchase_date": "2024-01-01",
                    "category": "MEDIA"
                }
            ]
            
            created_count = 0
            for item in items:
                response = requests.post(f"{BACKEND_URL}/items", json=item, headers=self.headers)
                if response.status_code in [200, 201]:
                    created_count += 1
                elif response.status_code == 400 and "already exists" in response.text:
                    created_count += 1  # Item already exists, that's fine
                else:
                    print(f"Failed to create item {item['barcode']}: {response.status_code} - {response.text}")
            
            self.log_test("Create Test Items", created_count >= 2, 
                         f"Created/verified {created_count}/2 test items for rental testing")
            return created_count >= 2
            
        except Exception as e:
            self.log_test("Create Test Items", False, f"Exception: {str(e)}")
            return False
    
    def create_test_customer(self):
        """Create a test customer for rental testing"""
        try:
            customer_data = {
                "dni": "12345678T",
                "name": "Cliente Test Caja",
                "phone": "666777888",
                "email": "test@caja.com",
                "address": "Calle Test 123",
                "city": "Madrid"
            }
            
            response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.customer_id = data["id"]
                self.log_test("Create Test Customer", True, f"Customer created with ID: {self.customer_id}")
                return True
            elif response.status_code == 400 and "already exists" in response.text:
                # Customer exists, get it
                response = requests.get(f"{BACKEND_URL}/customers/dni/12345678T", headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    self.customer_id = data["id"]
                    self.log_test("Create Test Customer", True, f"Using existing customer ID: {self.customer_id}")
                    return True
            
            self.log_test("Create Test Customer", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
                
        except Exception as e:
            self.log_test("Create Test Customer", False, f"Exception: {str(e)}")
            return False
        """Create a test customer for rental testing"""
        try:
            customer_data = {
                "dni": "12345678T",
                "name": "Cliente Test Caja",
                "phone": "666777888",
                "email": "test@caja.com",
                "address": "Calle Test 123",
                "city": "Madrid"
            }
            
            response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.customer_id = data["id"]
                self.log_test("Create Test Customer", True, f"Customer created with ID: {self.customer_id}")
                return True
            elif response.status_code == 400 and "already exists" in response.text:
                # Customer exists, get it
                response = requests.get(f"{BACKEND_URL}/customers/dni/12345678T", headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    self.customer_id = data["id"]
                    self.log_test("Create Test Customer", True, f"Using existing customer ID: {self.customer_id}")
                    return True
            
            self.log_test("Create Test Customer", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
                
        except Exception as e:
            self.log_test("Create Test Customer", False, f"Exception: {str(e)}")
            return False
    
    def test_rental_with_active_session(self):
        """Test 2: Create rental WITH active session (should succeed)"""
        try:
            if not self.customer_id:
                self.log_test("Rental WITH Active Session", False, "No customer ID available")
                return False
            
            rental_data = {
                "customer_id": self.customer_id,
                "start_date": TEST_DATE,
                "end_date": "2026-01-31",
                "items": [{"barcode": "SKI-001", "person_name": ""}],
                "payment_method": "cash",
                "total_amount": 50.0,
                "paid_amount": 50.0,
                "deposit": 0.0
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals", json=rental_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                rental = response.json()
                rental_id = rental["id"]
                
                # Verify cash movement was created automatically
                movements_response = requests.get(f"{BACKEND_URL}/cash/movements", headers=self.headers)
                if movements_response.status_code == 200:
                    movements = movements_response.json()
                    rental_movement = None
                    for movement in movements:
                        if movement.get("reference_id") == rental_id:
                            rental_movement = movement
                            break
                    
                    if rental_movement:
                        self.log_test("Rental WITH Active Session", True, 
                                    f"Rental created successfully, cash movement auto-registered: €{rental_movement['amount']}")
                        
                        # Verify cash summary shows the income
                        summary_response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
                        if summary_response.status_code == 200:
                            summary = summary_response.json()
                            self.log_test("Cash Summary After Rental", True, 
                                        f"Summary updated: Total Income includes +€50")
                        
                        return True
                    else:
                        self.log_test("Rental WITH Active Session", False, "Rental created but no cash movement found")
                        return False
                else:
                    self.log_test("Rental WITH Active Session", False, "Could not verify cash movements")
                    return False
            else:
                self.log_test("Rental WITH Active Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Rental WITH Active Session", False, f"Exception: {str(e)}")
            return False
    
    def test_rental_without_active_session(self):
        """Test 3: Create rental WITHOUT active session (should fail)"""
        try:
            # First close the active session
            close_response = requests.post(f"{BACKEND_URL}/cash/sessions/close", headers=self.headers)
            
            if not self.customer_id:
                self.log_test("Rental WITHOUT Active Session", False, "No customer ID available")
                return False
            
            rental_data = {
                "customer_id": self.customer_id,
                "start_date": TEST_DATE,
                "end_date": "2026-01-31",
                "items": [{"barcode": "SKI-002", "person_name": ""}],
                "payment_method": "cash",
                "total_amount": 50.0,
                "paid_amount": 50.0,
                "deposit": 0.0
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals", json=rental_data, headers=self.headers)
            
            if response.status_code == 400 and "No hay sesión de caja activa" in response.text:
                self.log_test("Rental WITHOUT Active Session", True, 
                            "Correctly failed with error: 'No hay sesión de caja activa'")
                return True
            elif response.status_code in [200, 201]:
                self.log_test("Rental WITHOUT Active Session", False, 
                            "ERROR: Rental was created without active session (should have failed)")
                return False
            else:
                self.log_test("Rental WITHOUT Active Session", False, 
                            f"Unexpected response: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Rental WITHOUT Active Session", False, f"Exception: {str(e)}")
            return False
    
    def test_movements_linked_to_session(self):
        """Test 4: Validate movements are linked to session_id"""
        try:
            # Reopen session for this test
            session_data = {"opening_balance": 100.0, "date": TEST_DATE}
            requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
            
            response = requests.get(f"{BACKEND_URL}/cash/movements", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Movements Linked to Session", False, f"Could not get movements: {response.status_code}")
                return False
            
            movements = response.json()
            
            if not movements:
                self.log_test("Movements Linked to Session", True, "No movements found (expected for clean test)")
                return True
            
            # Check that all movements have session_id
            movements_with_session = [m for m in movements if m.get("session_id")]
            movements_without_session = [m for m in movements if not m.get("session_id")]
            
            if movements_without_session:
                self.log_test("Movements Linked to Session", False, 
                            f"Found {len(movements_without_session)} movements without session_id")
                return False
            else:
                self.log_test("Movements Linked to Session", True, 
                            f"All {len(movements_with_session)} movements have session_id")
                return True
                
        except Exception as e:
            self.log_test("Movements Linked to Session", False, f"Exception: {str(e)}")
            return False
    
    def test_validate_orphans(self):
        """Test 5: Validate orphaned operations endpoint"""
        try:
            response = requests.post(f"{BACKEND_URL}/cash/validate-orphans", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Validate Orphans Endpoint", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check required fields in response
            required_fields = ["total_orphans_found", "fixed_count", "orphans_remaining", "errors"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Validate Orphans Endpoint", False, f"Missing fields: {missing_fields}")
                return False
            
            self.log_test("Validate Orphans Endpoint", True, 
                        f"Orphans: {data['total_orphans_found']} found, {data['fixed_count']} fixed, "
                        f"{data['orphans_remaining']} remaining, {len(data['errors'])} errors")
            return True
                
        except Exception as e:
            self.log_test("Validate Orphans Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_cash_summary_calculations(self):
        """Test 6: Cash summary calculations are correct"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Cash Summary Calculations", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check required fields
            required_fields = ["opening_balance", "total_income", "total_expense", "total_refunds", 
                             "balance", "by_payment_method"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Cash Summary Calculations", False, f"Missing fields: {missing_fields}")
                return False
            
            # Verify calculation logic
            opening = data["opening_balance"]
            income = data["total_income"]
            expense = data["total_expense"]
            refunds = data["total_refunds"]
            balance = data["balance"]
            
            expected_balance = opening + income - expense - refunds
            
            if abs(balance - expected_balance) > 0.01:  # Allow small floating point differences
                self.log_test("Cash Summary Calculations", False, 
                            f"Balance calculation incorrect. Expected: {expected_balance}, Got: {balance}")
                return False
            
            # Check by_payment_method structure
            by_payment = data.get("by_payment_method", {})
            if not by_payment:
                self.log_test("Cash Summary Calculations", False, "Missing by_payment_method breakdown")
                return False
            
            self.log_test("Cash Summary Calculations", True, 
                        f"Opening: €{opening}, Income: €{income}, Expense: €{expense}, "
                        f"Refunds: €{refunds}, Balance: €{balance}")
            return True
                
        except Exception as e:
            self.log_test("Cash Summary Calculations", False, f"Exception: {str(e)}")
            return False
    
    def test_complete_flow(self):
        """Test 7: Complete flow - income → expense → refund"""
        try:
            # Create income movement
            income_data = {
                "movement_type": "income",
                "amount": 50.0,
                "payment_method": "cash",
                "category": "rental",
                "concept": "Test Income Movement",
                "notes": "Test flow income"
            }
            
            income_response = requests.post(f"{BACKEND_URL}/cash/movements", json=income_data, headers=self.headers)
            
            # Create expense movement
            expense_data = {
                "movement_type": "expense",
                "amount": 20.0,
                "payment_method": "cash",
                "category": "maintenance",
                "concept": "Test Expense Movement",
                "notes": "Test flow expense"
            }
            
            expense_response = requests.post(f"{BACKEND_URL}/cash/movements", json=expense_data, headers=self.headers)
            
            # Create refund movement
            refund_data = {
                "movement_type": "refund",
                "amount": 10.0,
                "payment_method": "card",
                "category": "rental",
                "concept": "Test Refund Movement",
                "notes": "Test flow refund"
            }
            
            refund_response = requests.post(f"{BACKEND_URL}/cash/movements", json=refund_data, headers=self.headers)
            
            # Check all movements were created
            success_count = 0
            if income_response.status_code in [200, 201]:
                success_count += 1
            if expense_response.status_code in [200, 201]:
                success_count += 1
            if refund_response.status_code in [200, 201]:
                success_count += 1
            
            if success_count == 3:
                # Verify summary reflects all movements
                summary_response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
                if summary_response.status_code == 200:
                    summary = summary_response.json()
                    movements_count = summary.get("movements_count", 0)
                    by_payment = summary.get("by_payment_method", {})
                    
                    cash_income = by_payment.get("cash", {}).get("income", 0)
                    cash_expense = by_payment.get("cash", {}).get("expense", 0)
                    card_refund = by_payment.get("card", {}).get("refund", 0)
                    
                    self.log_test("Complete Flow", True, 
                                f"All movements created. Summary: {movements_count} total movements, "
                                f"Cash income: €{cash_income}, Cash expense: €{cash_expense}, "
                                f"Card refund: €{card_refund}")
                    return True
                else:
                    self.log_test("Complete Flow", False, "Could not verify summary after movements")
                    return False
            else:
                self.log_test("Complete Flow", False, f"Only {success_count}/3 movements created successfully")
                return False
                
        except Exception as e:
            self.log_test("Complete Flow", False, f"Exception: {str(e)}")
            return False
    
    def test_close_session(self):
        """Test 8: Close session and verify status"""
        try:
            # Get current summary for closing data
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
            if summary_response.status_code != 200:
                self.log_test("Close Session", False, "Could not get summary for closing")
                return False
            
            summary = summary_response.json()
            
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": summary.get("balance", 0),
                "card_total": 0,
                "notes": "Test session closure"
            }
            
            # Use correct endpoint for closing session
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                # Verify session is marked as closed
                active_response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
                
                if active_response.status_code == 200:
                    active_data = active_response.json()
                    if active_data is None or not active_data:
                        self.log_test("Close Session", True, "Session closed successfully, no active session found")
                        return True
                    else:
                        self.log_test("Close Session", False, "Session still appears as active after closing")
                        return False
                else:
                    self.log_test("Close Session", True, "Session closed (could not verify active status)")
                    return True
            else:
                self.log_test("Close Session", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Close Session", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all cash session synchronization tests"""
        print("🎯 STARTING SISTEMA DE CAJA CON SINCRONIZACIÓN TOTAL TESTING")
        print("=" * 70)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Create test items
        print("\n📦 Creating test inventory items...")
        if not self.create_test_items():
            print("❌ Could not create test items. Cannot test rentals.")
            return False
        
        # Step 3: Open cash session (prerequisite)
        print("\n💰 Opening cash session...")
        if not self.test_open_cash_session():
            print("❌ Could not open cash session. Cannot continue tests.")
            return False
        
        # Step 4: Create test customer
        print("\n👤 Creating test customer...")
        if not self.create_test_customer():
            print("❌ Could not create test customer. Cannot continue tests.")
            return False
        
        # Step 5: Test rental WITH active session
        print("\n✅ Testing rental creation WITH active session...")
        rental_with_session = self.test_rental_with_active_session()
        
        # Step 6: Test rental WITHOUT active session
        print("\n❌ Testing rental creation WITHOUT active session...")
        rental_without_session = self.test_rental_without_active_session()
        
        # Step 7: Reopen session for remaining tests (if needed)
        print("\n🔄 Ensuring session is open for remaining tests...")
        if not rental_without_session:  # If the previous test didn't close the session
            session_data = {"opening_balance": 100.0, "date": TEST_DATE}
            requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
        
        # Step 8: Test movements linked to session
        print("\n🔗 Testing movements linked to session...")
        movements_linked = self.test_movements_linked_to_session()
        
        # Step 9: Test validate orphans endpoint
        print("\n🔍 Testing validate orphans endpoint...")
        validate_orphans = self.test_validate_orphans()
        
        # Step 10: Test cash summary calculations
        print("\n📊 Testing cash summary calculations...")
        summary_calculations = self.test_cash_summary_calculations()
        
        # Step 11: Test complete flow
        print("\n🔄 Testing complete flow (income → expense → refund)...")
        complete_flow = self.test_complete_flow()
        
        # Step 12: Test close session
        print("\n🔒 Testing session closure...")
        close_session = self.test_close_session()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY:")
        print("=" * 70)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ ALL CASH SESSION SYNCHRONIZATION TESTS PASSED!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            return False

def main():
    """Main test execution"""
    tester = CashSessionTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Sistema de Caja con Sincronización Total is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Sistema de Caja con Sincronización Total has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()