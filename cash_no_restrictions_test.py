#!/usr/bin/env python3
"""
🎯 TESTING - SISTEMA DE CAJA SIN RESTRICCIONES HORARIAS

Test comprehensive cash management system without time restrictions.
Validates that multiple closures can be created per day with automatic numbering.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://rental-multitenant.preview.emergentagent.com/api"
TEST_DATE = "2026-01-29"

class CashNoRestrictionsTest:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.created_closures = []  # Track created closures for cleanup
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate with admin2/admin123"""
        try:
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
                self.log_test("Authentication", True, f"Logged in as admin2")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_test_movements_turno1(self):
        """Create movements for turno 1 (morning shift)"""
        try:
            movements = [
                {
                    "movement_type": "income",
                    "amount": 100.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Alquiler Turno Mañana 1",
                    "notes": "Movimiento turno mañana"
                },
                {
                    "movement_type": "income", 
                    "amount": 50.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Alquiler Turno Mañana 2",
                    "notes": "Movimiento turno mañana"
                }
            ]
            
            created_count = 0
            for movement in movements:
                response = requests.post(f"{BACKEND_URL}/cash/movements", json=movement, headers=self.headers)
                if response.status_code in [200, 201]:
                    created_count += 1
                else:
                    print(f"Failed to create movement: {response.status_code} - {response.text}")
            
            self.log_test("Create Turno 1 Movements", created_count == 2, 
                         f"Created {created_count}/2 movements for morning shift (€100 + €50 = €150)")
            return created_count == 2
            
        except Exception as e:
            self.log_test("Create Turno 1 Movements", False, f"Exception: {str(e)}")
            return False
    
    def test_first_closure_no_restrictions(self):
        """Test first closure - should work without restrictions"""
        try:
            # Get current summary
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            if summary_response.status_code != 200:
                self.log_test("First Closure - Get Summary", False, "Could not get summary")
                return False
            
            summary = summary_response.json()
            expected_cash = 150.0  # From our test movements
            
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": expected_cash,
                "card_total": 0.0,
                "expected_cash": expected_cash,
                "expected_card": 0.0,
                "discrepancy_cash": 0.0,
                "discrepancy_card": 0.0,
                "discrepancy_total": 0.0,
                "notes": "Cierre Turno 1 - Mañana (14:00)"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                closing_result = response.json()
                closure_number = closing_result.get("closure_number", 0)
                closing_id = closing_result.get("id")
                
                if closing_id:
                    self.created_closures.append(closing_id)
                
                if closure_number == 1:
                    self.log_test("First Closure Success", True, 
                                 f"First closure created successfully with closure_number: {closure_number}, ID: {closing_id}")
                    return True
                else:
                    self.log_test("First Closure Success", False, 
                                 f"Expected closure_number: 1, got: {closure_number}")
                    return False
            else:
                self.log_test("First Closure Success", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("First Closure Success", False, f"Exception: {str(e)}")
            return False
    
    def create_test_movements_turno2(self):
        """Create movements for turno 2 (afternoon shift)"""
        try:
            movements = [
                {
                    "movement_type": "income",
                    "amount": 80.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Alquiler Turno Tarde 1",
                    "notes": "Movimiento turno tarde"
                },
                {
                    "movement_type": "expense",
                    "amount": 20.0,
                    "payment_method": "cash",
                    "category": "maintenance",
                    "concept": "Gasto Turno Tarde",
                    "notes": "Gasto turno tarde"
                }
            ]
            
            created_count = 0
            for movement in movements:
                response = requests.post(f"{BACKEND_URL}/cash/movements", json=movement, headers=self.headers)
                if response.status_code in [200, 201]:
                    created_count += 1
                else:
                    print(f"Failed to create movement: {response.status_code} - {response.text}")
            
            self.log_test("Create Turno 2 Movements", created_count == 2, 
                         f"Created {created_count}/2 movements for afternoon shift (€80 income - €20 expense = €60 net)")
            return created_count == 2
            
        except Exception as e:
            self.log_test("Create Turno 2 Movements", False, f"Exception: {str(e)}")
            return False
    
    def test_second_closure_same_date(self):
        """Test second closure on same date - should NOT be rejected"""
        try:
            # Get current summary (should include new movements)
            summary_response = requests.get(f"{BACKEND_URL}/cash/summary?date={TEST_DATE}", headers=self.headers)
            if summary_response.status_code != 200:
                self.log_test("Second Closure - Get Summary", False, "Could not get summary")
                return False
            
            summary = summary_response.json()
            # Total should be accumulated: 150 (turno1) + 80 - 20 (turno2) = 210
            expected_total = 210.0
            
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": expected_total,
                "card_total": 0.0,
                "expected_cash": expected_total,
                "expected_card": 0.0,
                "discrepancy_cash": 0.0,
                "discrepancy_card": 0.0,
                "discrepancy_total": 0.0,
                "notes": "Cierre Turno 2 - Tarde (20:00)"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                closing_result = response.json()
                closure_number = closing_result.get("closure_number", 0)
                closing_id = closing_result.get("id")
                
                if closing_id:
                    self.created_closures.append(closing_id)
                
                if closure_number == 2:
                    self.log_test("Second Closure Same Date", True, 
                                 f"✅ SUCCESS: Second closure created on same date with closure_number: {closure_number}, ID: {closing_id}")
                    return True
                else:
                    self.log_test("Second Closure Same Date", False, 
                                 f"Expected closure_number: 2, got: {closure_number}")
                    return False
            else:
                # Check if it's the old restriction error
                if response.status_code == 400 and "already closed" in response.text.lower():
                    self.log_test("Second Closure Same Date", False, 
                                 f"❌ RESTRICTION STILL EXISTS: {response.text}")
                    return False
                else:
                    self.log_test("Second Closure Same Date", False, 
                                 f"Status: {response.status_code}, Response: {response.text}")
                    return False
                
        except Exception as e:
            self.log_test("Second Closure Same Date", False, f"Exception: {str(e)}")
            return False
    
    def test_closure_numbering_system(self):
        """Test that closure numbering increments correctly"""
        try:
            # Get all closings for our test date
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Closure Numbering System", False, f"Could not get closings: {response.status_code}")
                return False
            
            closings = response.json()
            
            # Filter closings for our test date
            test_date_closings = [c for c in closings if c.get("date") == TEST_DATE]
            
            if len(test_date_closings) < 2:
                self.log_test("Closure Numbering System", False, 
                             f"Expected at least 2 closings for {TEST_DATE}, found: {len(test_date_closings)}")
                return False
            
            # Check closure numbers
            closure_numbers = [c.get("closure_number", 0) for c in test_date_closings]
            closure_numbers.sort()
            
            expected_numbers = list(range(1, len(test_date_closings) + 1))
            
            if closure_numbers[:len(expected_numbers)] == expected_numbers:
                self.log_test("Closure Numbering System", True, 
                             f"Closure numbers correct: {closure_numbers[:len(expected_numbers)]} for {len(test_date_closings)} closings")
                return True
            else:
                self.log_test("Closure Numbering System", False, 
                             f"Expected numbers: {expected_numbers}, got: {closure_numbers}")
                return False
                
        except Exception as e:
            self.log_test("Closure Numbering System", False, f"Exception: {str(e)}")
            return False
    
    def test_closings_history_multiple_turns(self):
        """Test that history shows all closures with their turn numbers"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Closings History Multiple Turns", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            
            # Filter for our test date
            test_closings = [c for c in closings if c.get("date") == TEST_DATE]
            
            if len(test_closings) < 2:
                self.log_test("Closings History Multiple Turns", False, 
                             f"Expected at least 2 closings for {TEST_DATE}, found: {len(test_closings)}")
                return False
            
            # Verify each closing has required fields
            required_fields = ["id", "date", "closure_number", "total_income", "total_expense", 
                             "total_refunds", "closed_by", "closed_at"]
            
            all_valid = True
            for closing in test_closings:
                missing_fields = [field for field in required_fields if field not in closing]
                if missing_fields:
                    self.log_test("Closings History Structure", False, 
                                 f"Closing {closing.get('id', 'unknown')} missing fields: {missing_fields}")
                    all_valid = False
            
            if all_valid:
                closure_info = [(c.get("closure_number"), c.get("notes", "")) for c in test_closings]
                self.log_test("Closings History Multiple Turns", True, 
                             f"Found {len(test_closings)} closings for {TEST_DATE} with complete structure. "
                             f"Closure info: {closure_info}")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Closings History Multiple Turns", False, f"Exception: {str(e)}")
            return False
    
    def test_revert_specific_closure(self):
        """Test reverting a specific closure by ID without affecting others"""
        try:
            if len(self.created_closures) < 2:
                self.log_test("Revert Specific Closure", False, "Need at least 2 closures to test reversion")
                return False
            
            # Get closings before deletion
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if response.status_code != 200:
                self.log_test("Revert Specific Closure - Get Before", False, "Could not get closings")
                return False
            
            closings_before = response.json()
            test_closings_before = [c for c in closings_before if c.get("date") == TEST_DATE]
            
            # Delete the first closure we created
            closure_to_delete = self.created_closures[0]
            delete_response = requests.delete(f"{BACKEND_URL}/cash/closings/{closure_to_delete}", headers=self.headers)
            
            if delete_response.status_code != 200:
                self.log_test("Revert Specific Closure", False, 
                             f"Delete failed: {delete_response.status_code} - {delete_response.text}")
                return False
            
            # Get closings after deletion
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if response.status_code != 200:
                self.log_test("Revert Specific Closure - Get After", False, "Could not get closings after deletion")
                return False
            
            closings_after = response.json()
            test_closings_after = [c for c in closings_after if c.get("date") == TEST_DATE]
            
            # Verify one less closing exists
            if len(test_closings_after) == len(test_closings_before) - 1:
                # Verify the specific closure was deleted
                remaining_ids = [c.get("id") for c in test_closings_after]
                if closure_to_delete not in remaining_ids:
                    self.log_test("Revert Specific Closure", True, 
                                 f"✅ SUCCESS: Specific closure {closure_to_delete} deleted. "
                                 f"Closings count: {len(test_closings_before)} → {len(test_closings_after)}")
                    return True
                else:
                    self.log_test("Revert Specific Closure", False, "Closure still exists after deletion")
                    return False
            else:
                self.log_test("Revert Specific Closure", False, 
                             f"Expected {len(test_closings_before) - 1} closings, got {len(test_closings_after)}")
                return False
                
        except Exception as e:
            self.log_test("Revert Specific Closure", False, f"Exception: {str(e)}")
            return False
    
    def test_complete_data_structure(self):
        """Test that closures contain all required fields"""
        try:
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            
            if response.status_code != 200:
                self.log_test("Complete Data Structure", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            test_closings = [c for c in closings if c.get("date") == TEST_DATE]
            
            if not test_closings:
                self.log_test("Complete Data Structure", False, f"No closings found for {TEST_DATE}")
                return False
            
            # Check all required fields as specified in requirements
            required_fields = [
                "id", "date", "closure_number",
                "total_income", "total_expense", "total_refunds",
                "by_payment_method", "movements_count",
                "closed_by", "closed_at",
                "discrepancy_cash", "discrepancy_card", "discrepancy_total"
            ]
            
            all_valid = True
            for closing in test_closings:
                missing_fields = [field for field in required_fields if field not in closing]
                if missing_fields:
                    self.log_test("Complete Data Structure", False, 
                                 f"Closing {closing.get('closure_number', '?')} missing: {missing_fields}")
                    all_valid = False
                    continue
                
                # Check by_payment_method structure
                by_payment = closing.get("by_payment_method", {})
                if not isinstance(by_payment, dict):
                    self.log_test("Complete Data Structure", False, 
                                 f"Closure {closing.get('closure_number', '?')} has invalid by_payment_method")
                    all_valid = False
                    continue
                
                # Check that payment methods have required keys
                for method in ["cash", "card"]:
                    if method in by_payment:
                        method_data = by_payment[method]
                        required_method_keys = ["income", "expense", "refund"]
                        missing_method_keys = [key for key in required_method_keys if key not in method_data]
                        if missing_method_keys:
                            self.log_test("Complete Data Structure", False, 
                                         f"Closure {closing.get('closure_number', '?')} method {method} missing: {missing_method_keys}")
                            all_valid = False
            
            if all_valid:
                self.log_test("Complete Data Structure", True, 
                             f"All {len(test_closings)} closings have complete data structure with all required fields")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Complete Data Structure", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all no-restrictions cash management tests"""
        print("🎯 TESTING - SISTEMA DE CAJA SIN RESTRICCIONES HORARIAS")
        print("=" * 70)
        print(f"📅 Test Date: {TEST_DATE}")
        print(f"🔗 Backend URL: {BACKEND_URL}")
        print("=" * 70)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Create movements for turno 1 (morning)
        print("\n📝 Creating movements for Turno 1 (Morning Shift)...")
        if not self.create_test_movements_turno1():
            print("⚠️  Could not create turno 1 movements. Continuing...")
        
        # Step 3: Test first closure (should work)
        print("\n🔒 Testing First Closure (Turno 1)...")
        first_closure_success = self.test_first_closure_no_restrictions()
        
        # Step 4: Create movements for turno 2 (afternoon)
        print("\n📝 Creating movements for Turno 2 (Afternoon Shift)...")
        if not self.create_test_movements_turno2():
            print("⚠️  Could not create turno 2 movements. Continuing...")
        
        # Step 5: Test second closure on same date (CRITICAL TEST)
        print("\n🔒 Testing Second Closure Same Date (CRITICAL - No Restrictions)...")
        second_closure_success = self.test_second_closure_same_date()
        
        # Step 6: Test closure numbering system
        print("\n🔢 Testing Closure Numbering System...")
        numbering_success = self.test_closure_numbering_system()
        
        # Step 7: Test closings history with multiple turns
        print("\n📋 Testing Closings History with Multiple Turns...")
        history_success = self.test_closings_history_multiple_turns()
        
        # Step 8: Test complete data structure
        print("\n📊 Testing Complete Data Structure...")
        structure_success = self.test_complete_data_structure()
        
        # Step 9: Test revert specific closure
        print("\n🔄 Testing Revert Specific Closure...")
        revert_success = self.test_revert_specific_closure()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY:")
        print("=" * 70)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        # Critical success criteria
        critical_tests = [
            second_closure_success,  # Most important - no restrictions
            numbering_success,       # Automatic numbering
            revert_success,         # Specific ID deletion
            structure_success       # Complete data structure
        ]
        
        critical_passed = sum(critical_tests)
        
        if passed_tests == total_tests and critical_passed == len(critical_tests):
            print("✅ ALL TESTS PASSED - SISTEMA SIN RESTRICCIONES HORARIAS WORKING!")
            print("🎉 Multiple closures per day are now supported with automatic numbering!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            if not second_closure_success:
                print("🚨 CRITICAL: Time restrictions still exist - multiple closures blocked!")
            return False

def main():
    """Main test execution"""
    tester = CashNoRestrictionsTest()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Sistema de Caja Sin Restricciones Horarias is working correctly!")
        print("✅ Multiple closures per day supported")
        print("✅ Automatic closure numbering working")
        print("✅ Specific closure reversion working")
        print("✅ Complete data structure validated")
        sys.exit(0)
    else:
        print("\n💥 Sistema de Caja has issues that need attention!")
        print("❌ Check failed tests above for details")
        sys.exit(1)

if __name__ == "__main__":
    main()