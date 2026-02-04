#!/usr/bin/env python3
"""
Test Completo de Edición de Métodos de Pago y Reconciliación de Caja
Testing payment method editing system with automatic cash register reconciliation.

Test Scenarios:
1. Change Cash → Card
2. Change Cash → Pending  
3. Change Pending → Card
4. Integrity verification

Each payment method change should reflect correctly in Cash Register (Arqueo de Caja)
with cash_movements created with session_id.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://skiflow-1.preview.emergentagent.com/api"
TEST_DATE = "2026-02-04"

class PaymentMethodTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.session_id = None
        self.customer_id = None
        self.rental_ids = []
        self.initial_balances = {}
        self.test_barcode_1 = None
        self.test_barcode_2 = None
        self.test_barcode_3 = None
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate with test credentials"""
        try:
            login_data = {
                "username": "testcaja",
                "password": "test1234"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 401:
                # User doesn't exist, create it
                register_data = {
                    "username": "testcaja",
                    "password": "test1234",
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
    
    def setup_test_environment(self):
        """Setup test environment with cash session and test data"""
        try:
            # 1. Close any existing session
            try:
                active_response = requests.get(f"{BACKEND_URL}/cash/sessions/active", headers=self.headers)
                if active_response.status_code == 200 and active_response.json():
                    close_data = {
                        "date": TEST_DATE,
                        "physical_cash": 0,
                        "card_total": 0,
                        "notes": "Closing for payment method test setup"
                    }
                    requests.post(f"{BACKEND_URL}/cash/close", json=close_data, headers=self.headers)
            except:
                pass
            
            # 2. Open new cash session
            session_data = {
                "opening_balance": 100.0,
                "date": TEST_DATE
            }
            
            session_response = requests.post(f"{BACKEND_URL}/cash/sessions/open", json=session_data, headers=self.headers)
            
            if session_response.status_code not in [200, 201]:
                self.log_test("Setup Cash Session", False, f"Could not open session: {session_response.text}")
                return False
            
            session_data = session_response.json()
            self.session_id = session_data.get("id") or session_data.get("session_id")
            
            # 3. Create test customer
            customer_data = {
                "dni": "TESTPAY001",
                "name": "Cliente Test Pago",
                "phone": "666777888",
                "email": "testpago@test.com",
                "address": "Calle Test 123",
                "city": "Madrid"
            }
            
            customer_response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.headers)
            
            if customer_response.status_code == 400 and "already exists" in customer_response.text:
                # Customer exists, get it
                customer_response = requests.get(f"{BACKEND_URL}/customers/dni/TESTPAY001", headers=self.headers)
            
            if customer_response.status_code == 200:
                customer = customer_response.json()
                self.customer_id = customer["id"]
            else:
                self.log_test("Setup Test Customer", False, f"Could not create/get customer: {customer_response.text}")
                return False
            
            # 4. Use existing available items instead of creating new ones
            items_response = requests.get(f"{BACKEND_URL}/items", headers=self.headers)
            if items_response.status_code == 200:
                items = items_response.json()
                available_items = [item for item in items if item.get("status") == "available"]
                
                if len(available_items) >= 3:  # Need at least 3 items for all tests
                    self.test_barcode_1 = available_items[0]["barcode"]
                    self.test_barcode_2 = available_items[1]["barcode"]
                    self.test_barcode_3 = available_items[2]["barcode"]
                    print(f"   Using existing items: {self.test_barcode_1}, {self.test_barcode_2}, {self.test_barcode_3}")
                else:
                    self.log_test("Setup Test Items", False, f"Not enough available items: {len(available_items)}")
                    return False
            else:
                self.log_test("Setup Test Items", False, f"Could not get items: {items_response.text}")
                return False
            
            self.log_test("Setup Test Environment", True, f"Session ID: {self.session_id}, Customer ID: {self.customer_id}")
            return True
            
        except Exception as e:
            self.log_test("Setup Test Environment", False, f"Exception: {str(e)}")
            return False
    
    def get_cash_register_balances(self):
        """Get current cash register balances"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            by_payment = data.get("by_payment_method", {})
            
            balances = {
                "cash_balance": by_payment.get("cash", {}).get("income", 0) - by_payment.get("cash", {}).get("expense", 0) - by_payment.get("cash", {}).get("refund", 0) + by_payment.get("cash", {}).get("adjustment", 0),
                "card_balance": by_payment.get("card", {}).get("income", 0) - by_payment.get("card", {}).get("expense", 0) - by_payment.get("card", {}).get("refund", 0) + by_payment.get("card", {}).get("adjustment", 0),
                "total_balance": data.get("balance", 0),
                "movements_count": data.get("movements_count", 0)
            }
            
            return balances
            
        except Exception as e:
            print(f"Error getting balances: {str(e)}")
            return None
    
    def create_test_rental(self, payment_method="cash", amount=50.0, item_index=0):
        """Create a test rental with specified payment method"""
        try:
            # Use different items for each rental to avoid conflicts
            available_barcodes = [self.test_barcode_1, self.test_barcode_2, self.test_barcode_3]
            if item_index >= len(available_barcodes):
                print(f"Warning: Not enough available items for index {item_index}")
                return None
                
            barcode = available_barcodes[item_index]
            
            rental_data = {
                "customer_id": self.customer_id,
                "start_date": TEST_DATE,
                "end_date": "2026-02-06",
                "items": [{"barcode": barcode, "person_name": ""}],
                "payment_method": payment_method,
                "total_amount": amount,
                "paid_amount": amount if payment_method != "pending" else 0,
                "deposit": 0.0
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals", json=rental_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                rental = response.json()
                return rental["id"]
            else:
                print(f"Error creating rental: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Exception creating rental: {str(e)}")
            return None
    
    def test_cash_to_card_change(self):
        """TEST 1: Change Cash → Card"""
        try:
            print("\n🔄 TEST 1: Cambio Efectivo → Tarjeta")
            
            # 1. Create rental with cash payment
            rental_id = self.create_test_rental("cash", 50.0, 0)  # Use first item
            if not rental_id:
                self.log_test("TEST 1 - Create Cash Rental", False, "Could not create cash rental")
                return False
            
            self.rental_ids.append(rental_id)
            
            # 2. Get initial balances
            initial_balances = self.get_cash_register_balances()
            if not initial_balances:
                self.log_test("TEST 1 - Get Initial Balances", False, "Could not get initial balances")
                return False
            
            print(f"   Initial - Cash: €{initial_balances['cash_balance']}, Card: €{initial_balances['card_balance']}")
            
            # 3. Change payment method from cash to card
            change_data = {"new_payment_method": "card"}
            response = requests.patch(f"{BACKEND_URL}/rentals/{rental_id}/payment-method", 
                                    json=change_data, headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("TEST 1 - Change Payment Method", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # 4. Get updated balances
            updated_balances = self.get_cash_register_balances()
            if not updated_balances:
                self.log_test("TEST 1 - Get Updated Balances", False, "Could not get updated balances")
                return False
            
            print(f"   Updated - Cash: €{updated_balances['cash_balance']}, Card: €{updated_balances['card_balance']}")
            
            # 5. Verify changes
            cash_decrease = initial_balances['cash_balance'] - updated_balances['cash_balance']
            card_increase = updated_balances['card_balance'] - initial_balances['card_balance']
            movements_increase = updated_balances['movements_count'] - initial_balances['movements_count']
            
            # Should have: Cash decreased by 50, Card increased by 50, 2 new movements (cash out, card in)
            if abs(cash_decrease - 50.0) < 0.01 and abs(card_increase - 50.0) < 0.01 and movements_increase >= 2:
                # 6. Verify cash_movements have session_id
                movements_response = requests.get(f"{BACKEND_URL}/cash/movements", headers=self.headers)
                if movements_response.status_code == 200:
                    movements = movements_response.json()
                    recent_movements = [m for m in movements if m.get("reference_id") == rental_id]
                    
                    session_linked = all(m.get("session_id") for m in recent_movements)
                    
                    if session_linked and len(recent_movements) >= 2:
                        self.log_test("TEST 1 - Cash to Card Change", True, 
                                    f"Cash decreased €{cash_decrease:.2f}, Card increased €{card_increase:.2f}, "
                                    f"{len(recent_movements)} movements with session_id")
                        return True
                    else:
                        # Debug: show what movements we found
                        movement_details = []
                        for m in recent_movements:
                            movement_details.append(f"Type: {m.get('movement_type')}, Amount: {m.get('amount')}, Method: {m.get('payment_method')}, Session: {m.get('session_id') is not None}")
                        
                        self.log_test("TEST 1 - Cash to Card Change", False, 
                                    f"Movements issue - Count: {len(recent_movements)}, Session linked: {session_linked}. Details: {movement_details}")
                        return False
                else:
                    self.log_test("TEST 1 - Cash to Card Change", False, "Could not verify movements")
                    return False
            else:
                self.log_test("TEST 1 - Cash to Card Change", False, 
                            f"Incorrect balance changes - Cash: €{cash_decrease:.2f}, Card: €{card_increase:.2f}, Movements: {movements_increase}")
                return False
                
        except Exception as e:
            self.log_test("TEST 1 - Cash to Card Change", False, f"Exception: {str(e)}")
            return False
    
    def test_cash_to_pending_change(self):
        """TEST 2: Change Cash → Pending"""
        try:
            print("\n🔄 TEST 2: Cambio Efectivo → Pendiente")
            
            # 1. Create rental with cash payment
            rental_id = self.create_test_rental("cash", 75.0, 1)  # Use second item
            if not rental_id:
                self.log_test("TEST 2 - Create Cash Rental", False, "Could not create cash rental")
                return False
            
            self.rental_ids.append(rental_id)
            
            # 2. Get initial balances
            initial_balances = self.get_cash_register_balances()
            if not initial_balances:
                self.log_test("TEST 2 - Get Initial Balances", False, "Could not get initial balances")
                return False
            
            print(f"   Initial - Cash: €{initial_balances['cash_balance']}")
            
            # 3. Change payment method from cash to pending
            change_data = {"new_payment_method": "pending"}
            response = requests.patch(f"{BACKEND_URL}/rentals/{rental_id}/payment-method", 
                                    json=change_data, headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("TEST 2 - Change Payment Method", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # 4. Get updated balances and rental info
            updated_balances = self.get_cash_register_balances()
            rental_response = requests.get(f"{BACKEND_URL}/rentals/{rental_id}", headers=self.headers)
            
            if not updated_balances or rental_response.status_code != 200:
                self.log_test("TEST 2 - Get Updated Data", False, "Could not get updated data")
                return False
            
            rental_data = rental_response.json()
            print(f"   Updated - Cash: €{updated_balances['cash_balance']}, Rental pending: €{rental_data.get('pending_amount', 0)}")
            
            # 5. Verify changes
            cash_decrease = initial_balances['cash_balance'] - updated_balances['cash_balance']
            pending_amount = rental_data.get('pending_amount', 0)
            
            # Should have: Cash decreased by 75, rental has pending_amount > 0
            if abs(cash_decrease - 75.0) < 0.01 and pending_amount > 0:
                self.log_test("TEST 2 - Cash to Pending Change", True, 
                            f"Cash decreased €{cash_decrease:.2f}, Pending amount: €{pending_amount}")
                return True
            else:
                self.log_test("TEST 2 - Cash to Pending Change", False, 
                            f"Incorrect changes - Cash decrease: €{cash_decrease:.2f}, Pending: €{pending_amount}")
                return False
                
        except Exception as e:
            self.log_test("TEST 2 - Cash to Pending Change", False, f"Exception: {str(e)}")
            return False
    
    def test_pending_to_card_change(self):
        """TEST 3: Change Pending → Card"""
        try:
            print("\n🔄 TEST 3: Cambio Pendiente → Tarjeta")
            
            # 1. Create rental with pending payment
            rental_id = self.create_test_rental("pending", 60.0, 2)  # Use third item
            if not rental_id:
                self.log_test("TEST 3 - Create Pending Rental", False, "Could not create pending rental")
                return False
            
            self.rental_ids.append(rental_id)
            
            # 2. Get initial balances
            initial_balances = self.get_cash_register_balances()
            if not initial_balances:
                self.log_test("TEST 3 - Get Initial Balances", False, "Could not get initial balances")
                return False
            
            print(f"   Initial - Card: €{initial_balances['card_balance']}")
            
            # 3. Change payment method from pending to card
            change_data = {"new_payment_method": "card"}
            response = requests.patch(f"{BACKEND_URL}/rentals/{rental_id}/payment-method", 
                                    json=change_data, headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("TEST 3 - Change Payment Method", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # 4. Get updated balances and rental info
            updated_balances = self.get_cash_register_balances()
            rental_response = requests.get(f"{BACKEND_URL}/rentals/{rental_id}", headers=self.headers)
            
            if not updated_balances or rental_response.status_code != 200:
                self.log_test("TEST 3 - Get Updated Data", False, "Could not get updated data")
                return False
            
            rental_data = rental_response.json()
            print(f"   Updated - Card: €{updated_balances['card_balance']}, Rental paid: €{rental_data.get('paid_amount', 0)}")
            
            # 5. Verify changes
            card_increase = updated_balances['card_balance'] - initial_balances['card_balance']
            paid_amount = rental_data.get('paid_amount', 0)
            
            # Should have: Card increased by 60, rental has paid_amount > 0
            if abs(card_increase - 60.0) < 0.01 and paid_amount > 0:
                self.log_test("TEST 3 - Pending to Card Change", True, 
                            f"Card increased €{card_increase:.2f}, Paid amount: €{paid_amount}")
                return True
            else:
                self.log_test("TEST 3 - Pending to Card Change", False, 
                            f"Incorrect changes - Card increase: €{card_increase:.2f}, Paid: €{paid_amount}")
                return False
                
        except Exception as e:
            self.log_test("TEST 3 - Pending to Card Change", False, f"Exception: {str(e)}")
            return False
    
    def test_integrity_verification(self):
        """TEST 4: Verify cash movements integrity"""
        try:
            print("\n🔍 TEST 4: Verificación de Integridad")
            
            # 1. Get all cash movements for current session
            movements_response = requests.get(f"{BACKEND_URL}/cash/movements", headers=self.headers)
            
            if movements_response.status_code != 200:
                self.log_test("TEST 4 - Get Movements", False, f"Could not get movements: {movements_response.status_code}")
                return False
            
            movements = movements_response.json()
            session_movements = [m for m in movements if m.get("session_id") == self.session_id]
            
            # 2. Calculate totals from movements
            cash_income = sum(m["amount"] for m in session_movements 
                            if m.get("payment_method") == "cash" and m.get("movement_type") == "income")
            cash_expense = sum(m["amount"] for m in session_movements 
                             if m.get("payment_method") == "cash" and m.get("movement_type") == "expense")
            cash_refund = sum(m["amount"] for m in session_movements 
                            if m.get("payment_method") == "cash" and m.get("movement_type") == "refund")
            
            card_income = sum(m["amount"] for m in session_movements 
                            if m.get("payment_method") == "card" and m.get("movement_type") == "income")
            card_expense = sum(m["amount"] for m in session_movements 
                             if m.get("payment_method") == "card" and m.get("movement_type") == "expense")
            card_refund = sum(m["amount"] for m in session_movements 
                            if m.get("payment_method") == "card" and m.get("movement_type") == "refund")
            
            # 3. Get cash register summary
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary", headers=self.headers)
            
            if summary_response.status_code != 200:
                self.log_test("TEST 4 - Get Summary", False, f"Could not get summary: {summary_response.status_code}")
                return False
            
            summary = summary_response.json()
            by_payment = summary.get("by_payment_method", {})
            
            summary_cash_income = by_payment.get("cash", {}).get("income", 0)
            summary_cash_expense = by_payment.get("cash", {}).get("expense", 0)
            summary_cash_refund = by_payment.get("cash", {}).get("refund", 0)
            
            summary_card_income = by_payment.get("card", {}).get("income", 0)
            summary_card_expense = by_payment.get("card", {}).get("expense", 0)
            summary_card_refund = by_payment.get("card", {}).get("refund", 0)
            
            # 4. Verify integrity
            cash_matches = (abs(cash_income - summary_cash_income) < 0.01 and 
                          abs(cash_expense - summary_cash_expense) < 0.01 and 
                          abs(cash_refund - summary_cash_refund) < 0.01)
            
            card_matches = (abs(card_income - summary_card_income) < 0.01 and 
                          abs(card_expense - summary_card_expense) < 0.01 and 
                          abs(card_refund - summary_card_refund) < 0.01)
            
            # 5. Check session_id presence
            movements_with_session = len([m for m in session_movements if m.get("session_id")])
            total_session_movements = len(session_movements)
            
            if cash_matches and card_matches and movements_with_session == total_session_movements:
                self.log_test("TEST 4 - Integrity Verification", True, 
                            f"All {total_session_movements} movements have session_id, "
                            f"Cash totals match (I:€{cash_income}, E:€{cash_expense}, R:€{cash_refund}), "
                            f"Card totals match (I:€{card_income}, E:€{card_expense}, R:€{card_refund})")
                return True
            else:
                self.log_test("TEST 4 - Integrity Verification", False, 
                            f"Integrity issues - Cash match: {cash_matches}, Card match: {card_matches}, "
                            f"Session movements: {movements_with_session}/{total_session_movements}")
                return False
                
        except Exception as e:
            self.log_test("TEST 4 - Integrity Verification", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all payment method editing tests"""
        print("🎯 STARTING PAYMENT METHOD EDITING AND CASH RECONCILIATION TESTS")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Setup test environment
        print("\n🔧 Setting up test environment...")
        if not self.setup_test_environment():
            print("❌ Could not setup test environment. Cannot continue tests.")
            return False
        
        # Step 3: Run test scenarios
        test_results = []
        
        test_results.append(self.test_cash_to_card_change())
        test_results.append(self.test_cash_to_pending_change())
        test_results.append(self.test_pending_to_card_change())
        test_results.append(self.test_integrity_verification())
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS SUMMARY:")
        print("=" * 80)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ ALL PAYMENT METHOD EDITING TESTS PASSED!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            return False

def main():
    """Main test execution"""
    tester = PaymentMethodTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Payment Method Editing and Cash Reconciliation system is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Payment Method Editing system has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()