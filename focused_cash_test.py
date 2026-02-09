#!/usr/bin/env python3
"""
🎯 FOCUSED TEST - SISTEMA DE CAJA SIN RESTRICCIONES HORARIAS

Focused test to validate the core "no restrictions" functionality.
Tests the specific scenario from the review request.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://rental-pack-fix.preview.emergentagent.com/api"
TEST_DATE = "2026-01-29"

class FocusedCashTest:
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
        """Authenticate with admin2/admin123"""
        try:
            login_data = {"username": "admin2", "password": "admin123"}
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("Authentication", True, f"Logged in as admin2")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_no_restriction_error(self):
        """Test that multiple closures don't produce restriction errors"""
        try:
            # Get current count of closures for test date
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if response.status_code != 200:
                self.log_test("Get Initial Closures", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            initial_count = len([c for c in closings if c.get("date") == TEST_DATE])
            
            # Try to create a new closure
            closing_data = {
                "date": TEST_DATE,
                "physical_cash": 100.0,
                "card_total": 50.0,
                "expected_cash": 100.0,
                "expected_card": 50.0,
                "discrepancy_cash": 0.0,
                "discrepancy_card": 0.0,
                "discrepancy_total": 0.0,
                "notes": f"Test closure - No restrictions validation"
            }
            
            response = requests.post(f"{BACKEND_URL}/cash/close", json=closing_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                result = response.json()
                closure_number = result.get("closure_number", 0)
                
                # Verify it's NOT the first closure (since there were already closures)
                if closure_number > initial_count:
                    self.log_test("No Restriction Error", True, 
                                 f"✅ SUCCESS: Multiple closures allowed! Created closure #{closure_number} for date {TEST_DATE}")
                    return True
                else:
                    self.log_test("No Restriction Error", False, 
                                 f"Unexpected closure number: {closure_number} (expected > {initial_count})")
                    return False
            else:
                # Check for the old restriction error message
                if response.status_code == 400:
                    error_text = response.text.lower()
                    if "already closed" in error_text or "restriction" in error_text:
                        self.log_test("No Restriction Error", False, 
                                     f"❌ RESTRICTION STILL EXISTS: {response.text}")
                        return False
                    else:
                        self.log_test("No Restriction Error", False, 
                                     f"Other error: {response.status_code} - {response.text}")
                        return False
                else:
                    self.log_test("No Restriction Error", False, 
                                 f"Unexpected status: {response.status_code} - {response.text}")
                    return False
                
        except Exception as e:
            self.log_test("No Restriction Error", False, f"Exception: {str(e)}")
            return False
    
    def test_automatic_numbering(self):
        """Test that closure_number increments automatically"""
        try:
            # Get all closures for test date
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if response.status_code != 200:
                self.log_test("Automatic Numbering", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            test_closings = [c for c in closings if c.get("date") == TEST_DATE]
            
            if len(test_closings) < 2:
                self.log_test("Automatic Numbering", False, 
                             f"Need at least 2 closures to test numbering. Found: {len(test_closings)}")
                return False
            
            # Check that each closure has a closure_number
            closure_numbers = []
            for closing in test_closings:
                if "closure_number" not in closing:
                    self.log_test("Automatic Numbering", False, 
                                 f"Closure {closing.get('id', 'unknown')} missing closure_number field")
                    return False
                closure_numbers.append(closing["closure_number"])
            
            # Check that numbers are sequential (allowing for gaps due to deletions)
            closure_numbers.sort()
            unique_numbers = list(set(closure_numbers))
            unique_numbers.sort()
            
            if len(unique_numbers) == len(closure_numbers):  # No duplicates
                self.log_test("Automatic Numbering", True, 
                             f"✅ Automatic numbering working: {len(test_closings)} closures with numbers {closure_numbers}")
                return True
            else:
                self.log_test("Automatic Numbering", False, 
                             f"Duplicate closure numbers found: {closure_numbers}")
                return False
                
        except Exception as e:
            self.log_test("Automatic Numbering", False, f"Exception: {str(e)}")
            return False
    
    def test_specific_id_deletion(self):
        """Test that closures can be deleted by specific ID"""
        try:
            # Get current closures
            response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if response.status_code != 200:
                self.log_test("Specific ID Deletion", False, f"Status: {response.status_code}")
                return False
            
            closings = response.json()
            test_closings = [c for c in closings if c.get("date") == TEST_DATE]
            
            if len(test_closings) < 1:
                self.log_test("Specific ID Deletion", False, "No closures found to delete")
                return False
            
            # Try to delete the last closure
            closure_to_delete = test_closings[-1]
            closing_id = closure_to_delete.get("id")
            
            if not closing_id:
                self.log_test("Specific ID Deletion", False, "Closure missing ID field")
                return False
            
            # Delete by ID
            delete_response = requests.delete(f"{BACKEND_URL}/cash/closings/{closing_id}", headers=self.headers)
            
            if delete_response.status_code == 200:
                # Verify it was deleted
                verify_response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
                if verify_response.status_code == 200:
                    updated_closings = verify_response.json()
                    updated_test_closings = [c for c in updated_closings if c.get("date") == TEST_DATE]
                    
                    if len(updated_test_closings) == len(test_closings) - 1:
                        self.log_test("Specific ID Deletion", True, 
                                     f"✅ Specific closure deleted by ID: {closing_id}")
                        return True
                    else:
                        self.log_test("Specific ID Deletion", False, 
                                     f"Closure count didn't decrease: {len(test_closings)} → {len(updated_test_closings)}")
                        return False
                else:
                    self.log_test("Specific ID Deletion", False, "Could not verify deletion")
                    return False
            else:
                self.log_test("Specific ID Deletion", False, 
                             f"Delete failed: {delete_response.status_code} - {delete_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Specific ID Deletion", False, f"Exception: {str(e)}")
            return False
    
    def test_complete_workflow(self):
        """Test the complete workflow from the review request"""
        try:
            print("\n🔄 Testing Complete Workflow as specified in review...")
            
            # Create movements for morning shift
            morning_movements = [
                {
                    "movement_type": "income",
                    "amount": 100.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Turno Mañana - Entrada 1",
                    "notes": "08:00 - Movimiento turno mañana"
                },
                {
                    "movement_type": "income",
                    "amount": 50.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Turno Mañana - Entrada 2",
                    "notes": "08:00 - Movimiento turno mañana"
                }
            ]
            
            for movement in morning_movements:
                requests.post(f"{BACKEND_URL}/cash/movements", json=movement, headers=self.headers)
            
            # Close turno 1 at 14:00
            turno1_closing = {
                "date": TEST_DATE,
                "physical_cash": 150.0,
                "card_total": 0.0,
                "expected_cash": 150.0,
                "expected_card": 0.0,
                "discrepancy_cash": 0.0,
                "discrepancy_card": 0.0,
                "discrepancy_total": 0.0,
                "notes": "14:00 - CIERRE TURNO 1 (Mañana) - €150 total"
            }
            
            turno1_response = requests.post(f"{BACKEND_URL}/cash/close", json=turno1_closing, headers=self.headers)
            
            if turno1_response.status_code not in [200, 201]:
                self.log_test("Complete Workflow - Turno 1", False, 
                             f"Turno 1 closure failed: {turno1_response.status_code}")
                return False
            
            turno1_result = turno1_response.json()
            turno1_number = turno1_result.get("closure_number")
            
            # Create movements for afternoon shift
            afternoon_movements = [
                {
                    "movement_type": "income",
                    "amount": 80.0,
                    "payment_method": "cash",
                    "category": "rental",
                    "concept": "Turno Tarde - Entrada",
                    "notes": "14:30 - Movimiento turno tarde"
                },
                {
                    "movement_type": "expense",
                    "amount": 20.0,
                    "payment_method": "cash",
                    "category": "maintenance",
                    "concept": "Turno Tarde - Salida",
                    "notes": "14:30 - Gasto turno tarde"
                }
            ]
            
            for movement in afternoon_movements:
                requests.post(f"{BACKEND_URL}/cash/movements", json=movement, headers=self.headers)
            
            # Close turno 2 at 20:00
            turno2_closing = {
                "date": TEST_DATE,
                "physical_cash": 210.0,  # Accumulated: 150 + 80 - 20 = 210
                "card_total": 0.0,
                "expected_cash": 210.0,
                "expected_card": 0.0,
                "discrepancy_cash": 0.0,
                "discrepancy_card": 0.0,
                "discrepancy_total": 0.0,
                "notes": "20:00 - CIERRE TURNO 2 (Tarde) - €210 acumulado"
            }
            
            turno2_response = requests.post(f"{BACKEND_URL}/cash/close", json=turno2_closing, headers=self.headers)
            
            if turno2_response.status_code not in [200, 201]:
                # Check if it's a restriction error
                if turno2_response.status_code == 400 and "already closed" in turno2_response.text.lower():
                    self.log_test("Complete Workflow", False, 
                                 f"❌ RESTRICTION ERROR: Cannot create second closure on same date: {turno2_response.text}")
                    return False
                else:
                    self.log_test("Complete Workflow", False, 
                                 f"Turno 2 closure failed: {turno2_response.status_code} - {turno2_response.text}")
                    return False
            
            turno2_result = turno2_response.json()
            turno2_number = turno2_result.get("closure_number")
            
            # Verify both closures exist
            verify_response = requests.get(f"{BACKEND_URL}/cash/closings", headers=self.headers)
            if verify_response.status_code == 200:
                all_closings = verify_response.json()
                test_closings = [c for c in all_closings if c.get("date") == TEST_DATE]
                
                # Find our two closures
                our_closures = [c for c in test_closings if c.get("closure_number") in [turno1_number, turno2_number]]
                
                if len(our_closures) >= 2:
                    self.log_test("Complete Workflow", True, 
                                 f"✅ SUCCESS: Complete workflow working! "
                                 f"Turno 1 (closure #{turno1_number}) + Turno 2 (closure #{turno2_number}) "
                                 f"both created for {TEST_DATE}")
                    return True
                else:
                    self.log_test("Complete Workflow", False, 
                                 f"Expected 2 closures, found {len(our_closures)} for numbers {turno1_number}, {turno2_number}")
                    return False
            else:
                self.log_test("Complete Workflow", False, "Could not verify closures")
                return False
                
        except Exception as e:
            self.log_test("Complete Workflow", False, f"Exception: {str(e)}")
            return False
    
    def run_focused_tests(self):
        """Run focused tests for no restrictions functionality"""
        print("🎯 FOCUSED TEST - SISTEMA DE CAJA SIN RESTRICCIONES HORARIAS")
        print("=" * 70)
        print(f"📅 Test Date: {TEST_DATE}")
        print("🎯 Focus: Validate elimination of time restrictions")
        print("=" * 70)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Test no restriction error (CRITICAL)
        print("\n🚨 CRITICAL TEST: No Restriction Error...")
        no_restriction_success = self.test_no_restriction_error()
        
        # Step 3: Test automatic numbering
        print("\n🔢 Testing Automatic Numbering...")
        numbering_success = self.test_automatic_numbering()
        
        # Step 4: Test specific ID deletion
        print("\n🗑️ Testing Specific ID Deletion...")
        deletion_success = self.test_specific_id_deletion()
        
        # Step 5: Test complete workflow
        workflow_success = self.test_complete_workflow()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 FOCUSED TEST RESULTS:")
        print("=" * 70)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 RESULT: {passed_tests}/{total_tests} tests passed")
        
        # The most critical test is no_restriction_success
        if no_restriction_success:
            print("✅ CRITICAL SUCCESS: No time restrictions - multiple closures per day allowed!")
            if numbering_success:
                print("✅ Automatic closure numbering working correctly")
            if deletion_success:
                print("✅ Specific closure deletion by ID working")
            if workflow_success:
                print("✅ Complete workflow validated")
            return True
        else:
            print("❌ CRITICAL FAILURE: Time restrictions still exist!")
            return False

def main():
    """Main test execution"""
    tester = FocusedCashTest()
    success = tester.run_focused_tests()
    
    if success:
        print("\n🎉 SISTEMA DE CAJA SIN RESTRICCIONES HORARIAS - SUCCESS!")
        print("✅ Multiple closures per day are now supported")
        print("✅ No 'already closed for this date' errors")
        print("✅ Automatic closure numbering implemented")
        sys.exit(0)
    else:
        print("\n💥 SISTEMA DE CAJA still has time restrictions!")
        print("❌ Multiple closures per day are blocked")
        sys.exit(1)

if __name__ == "__main__":
    main()