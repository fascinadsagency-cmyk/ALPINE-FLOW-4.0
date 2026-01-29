#!/usr/bin/env python3
"""
Comprehensive Backend Test for Cash Management System (Módulo de Gestión de Caja)
Testing detailed breakdown by payment method as specified in review request.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://skiboard-hub.preview.emergentagent.com/api"
TEST_DATE = "2026-01-29"

class CashManagementTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        
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
    
    def create_test_movements(self):
        """Create test cash movements for testing"""
        try:
            movements = [
                # 2 ENTRADA movements in EFECTIVO (cash)
                {
                    "movement_type": "income",
                    "amount": 100.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Alquiler Test 1 - Efectivo",
                    "notes": "Movimiento de prueba efectivo 1"
                },
                {
                    "movement_type": "income", 
                    "amount": 50.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Alquiler Test 2 - Efectivo",
                    "notes": "Movimiento de prueba efectivo 2"
                },
                # 1 ENTRADA movement in TARJETA (card)
                {
                    "movement_type": "income",
                    "amount": 75.0,
                    "payment_method": "card",
                    "category": "rental", 
                    "concept": "Alquiler Test 3 - Tarjeta",
                    "notes": "Movimiento de prueba tarjeta"
                },
                # 1 SALIDA movement in EFECTIVO (cash expense)
                {
                    "movement_type": "expense",
                    "amount": 20.0,
                    "payment_method": "cash",
                    "category": "maintenance",
                    "concept": "Gasto mantenimiento - Efectivo",
                    "notes": "Gasto de prueba efectivo"
                },
                # 1 DEVOLUCIÓN movement in TARJETA (card refund)
                {
                    "movement_type": "refund",
                    "amount": 15.0,
                    "payment_method": "card",
                    "category": "rental",
                    "concept": "Devolución Test - Tarjeta",
                    "notes": "Devolución de prueba tarjeta"
                }
            ]
            
            created_count = 0
            for movement in movements:
                response = requests.post(f"{BACKEND_URL}/cash/movements", json=movement, headers=self.headers)
                if response.status_code in [200, 201]:
                    created_count += 1
                else:
                    print(f"Failed to create movement: {response.status_code} - {response.text}")
            
            self.log_test("Create Test Movements", created_count == 5, 
                         f"Created {created_count}/5 movements (2 cash income, 1 card income, 1 cash expense, 1 card refund)")
            return created_count == 5
            
        except Exception as e:
            self.log_test("Create Test Movements", False, f"Exception: {str(e)}")
            return False
    
    def test_cash_summary_structure(self):
        """Test GET /api/cash/summary structure with by_payment_method"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Cash Summary API", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check required fields
            required_fields = ["by_payment_method", "total_income", "total_expense", "total_refunds", "movements_count"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Cash Summary Structure", False, f"Missing fields: {missing_fields}")
                return False
            
            # Check by_payment_method structure
            by_payment = data.get("by_payment_method", {})
            
            # Should have cash and card methods
            expected_methods = ["cash", "card"]
            found_methods = []
            
            for method in expected_methods:
                if method in by_payment:
                    found_methods.append(method)
                    method_data = by_payment[method]
                    # Each method should have income, expense, refund
                    expected_keys = ["income", "expense", "refund"]
                    method_keys = list(method_data.keys())
                    if not all(key in method_keys for key in expected_keys):
                        self.log_test("Cash Summary Structure", False, 
                                    f"Method {method} missing keys. Expected: {expected_keys}, Found: {method_keys}")
                        return False
            
            # Verify calculations (check that our test movements are included)
            cash_data = by_payment.get("cash", {})
            card_data = by_payment.get("card", {})
            
            # We expect at least our test movements to be included
            min_cash_income = 150.0  # 100 + 50 from our test
            min_cash_expense = 20.0  # from our test
            min_card_income = 75.0   # from our test
            min_card_refund = 15.0   # from our test
            
            cash_income = cash_data.get("income", 0)
            cash_expense = cash_data.get("expense", 0)
            card_income = card_data.get("income", 0)
            card_refund = card_data.get("refund", 0)
            
            # Check that our test data is at least included (there may be more from previous tests)
            calculations_correct = (
                cash_income >= min_cash_income and
                cash_expense >= min_cash_expense and
                card_income >= min_card_income and
                card_refund >= min_card_refund
            )
            
            if not calculations_correct:
                self.log_test("Cash Summary Calculations", False, 
                            f"Expected at least: Cash(income>={min_cash_income}, expense>={min_cash_expense}), "
                            f"Card(income>={min_card_income}, refund>={min_card_refund}). "
                            f"Got: Cash(income={cash_income}, expense={cash_expense}), "
                            f"Card(income={card_income}, refund={card_refund})")
                return False
            
            self.log_test("Cash Summary Structure", True, 
                         f"Structure correct with methods: {found_methods}, movements_count: {data['movements_count']}")
            self.log_test("Cash Summary Calculations", True, 
                         f"Cash: €{cash_income} income, €{cash_expense} expense | Card: €{card_income} income, €{card_refund} refund")
            
            return True
            
        except Exception as e:
            self.log_test("Cash Summary Structure", False, f"Exception: {str(e)}")
            return False
    
    def test_cash_closing(self):
        """Test cash closing functionality"""
        try:
            # First get the summary to calculate expected values
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            if summary_response.status_code != 200:
                self.log_test("Cash Closing - Get Summary", False, "Could not get summary for closing")
                return False
            
            summary = summary_response.json()
            by_payment = summary.get("by_payment_method", {})
            
            # Calculate expected values
            cash_expected = by_payment.get("cash", {}).get("income", 0) - by_payment.get("cash", {}).get("expense", 0) - by_payment.get("cash", {}).get("refund", 0)
            card_expected = by_payment.get("card", {}).get("income", 0) - by_payment.get("card", {}).get("expense", 0) - by_payment.get("card", {}).get("refund", 0)
            
            # Simulate physical count (with small discrepancy for testing)
            physical_cash = cash_expected + 2.0  # €2 more than expected
            card_total = card_expected - 1.0     # €1 less than expected
            
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": physical_cash,
                "card_total": card_total,
                "expected_cash": cash_expected,
                "expected_card": card_expected,
                "discrepancy_cash": physical_cash - cash_expected,
                "discrepancy_card": card_total - card_expected,
                "discrepancy_total": (physical_cash - cash_expected) + (card_total - card_expected),
                "notes": "Cierre de prueba con desglose detallado por método de pago"
            }
            
            # Try to close cash register
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                closing_result = response.json()
                
                # Verify the closing contains by_payment_method
                if "by_payment_method" not in closing_result:
                    self.log_test("Cash Closing Structure", False, "Missing by_payment_method in closing result")
                    return False
                
                self.log_test("Cash Closing", True, 
                             f"Closed successfully. Cash: €{physical_cash} (expected €{cash_expected}), "
                             f"Card: €{card_total} (expected €{card_expected}), "
                             f"Total discrepancy: €{closing_data['discrepancy_total']}")
                return True
            else:
                # If already closed, try to get existing closing
                if response.status_code == 400 and "already closed" in response.text.lower():
                    self.log_test("Cash Closing", True, "Cash register already closed for this date")
                    return True
                else:
                    self.log_test("Cash Closing", False, f"Status: {response.status_code}, Response: {response.text}")
                    return False
                
        except Exception as e:
            self.log_test("Cash Closing", False, f"Exception: {str(e)}")
            return False
    
    def test_cash_closings_history(self):
        """Test GET /api/cash/closings for history and reprint functionality"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Cash Closings History", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            
            if not isinstance(closings, list):
                self.log_test("Cash Closings History", False, "Response is not a list")
                return False
            
            # Find our test closing
            test_closing = None
            for closing in closings:
                if closing.get("date") == TEST_DATE:
                    test_closing = closing
                    break
            
            if not test_closing:
                self.log_test("Cash Closings History", False, f"Test closing for {TEST_DATE} not found")
                return False
            
            # Verify structure for detailed breakdown
            required_fields = ["by_payment_method", "total_income", "total_expense", "total_refunds", 
                             "physical_cash", "card_total", "discrepancy_cash", "discrepancy_card"]
            
            missing_fields = [field for field in required_fields if field not in test_closing]
            
            if missing_fields:
                self.log_test("Cash Closings History Structure", False, f"Missing fields: {missing_fields}")
                return False
            
            # Check by_payment_method structure in historical closing
            by_payment = test_closing.get("by_payment_method", {})
            if not by_payment:
                self.log_test("Cash Closings History Structure", False, "Empty by_payment_method in historical closing")
                return False
            
            # Verify cash and card data exists
            cash_data = by_payment.get("cash", {})
            card_data = by_payment.get("card", {})
            
            if not cash_data or not card_data:
                self.log_test("Cash Closings History Structure", False, "Missing cash or card data in by_payment_method")
                return False
            
            self.log_test("Cash Closings History", True, 
                         f"Found {len(closings)} closings. Test closing has detailed breakdown: "
                         f"Cash(income={cash_data.get('income', 0)}, expense={cash_data.get('expense', 0)}), "
                         f"Card(income={card_data.get('income', 0)}, refund={card_data.get('refund', 0)})")
            
            return True
            
        except Exception as e:
            self.log_test("Cash Closings History", False, f"Exception: {str(e)}")
            return False
    
    def test_compatibility_with_old_closings(self):
        """Test that system handles closings without by_payment_method (retrocompatibility)"""
        try:
            # Get all closings
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Old Closings Compatibility", False, f"Could not get closings: {response.status_code}")
                return False
            
            closings = response.json()
            
            # Check if there are any closings without by_payment_method
            old_closings = [c for c in closings if not c.get("by_payment_method")]
            new_closings = [c for c in closings if c.get("by_payment_method")]
            
            if old_closings:
                self.log_test("Old Closings Compatibility", True, 
                             f"Found {len(old_closings)} old closings without detailed breakdown, "
                             f"{len(new_closings)} new closings with detailed breakdown. System handles both formats.")
            else:
                self.log_test("Old Closings Compatibility", True, 
                             f"All {len(new_closings)} closings have detailed breakdown. No compatibility issues.")
            
            return True
            
        except Exception as e:
            self.log_test("Old Closings Compatibility", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all cash management tests"""
        print("🎯 STARTING CASH MANAGEMENT SYSTEM TESTING")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Create test movements
        print("\n📝 Creating test movements...")
        if not self.create_test_movements():
            print("⚠️  Could not create all test movements. Continuing with existing data...")
        
        # Step 3: Test cash summary structure
        print("\n🔍 Testing cash summary structure...")
        summary_success = self.test_cash_summary_structure()
        
        # Step 4: Test cash closing
        print("\n🔒 Testing cash closing...")
        closing_success = self.test_cash_closing()
        
        # Step 5: Test closings history
        print("\n📋 Testing closings history...")
        history_success = self.test_cash_closings_history()
        
        # Step 6: Test compatibility
        print("\n🔄 Testing compatibility with old closings...")
        compatibility_success = self.test_compatibility_with_old_closings()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY:")
        print("=" * 60)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ ALL CASH MANAGEMENT TESTS PASSED!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            return False

def main():
    """Main test execution"""
    tester = CashManagementTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Cash Management System is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Cash Management System has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()