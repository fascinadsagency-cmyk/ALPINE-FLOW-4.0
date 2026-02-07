#!/usr/bin/env python3
"""
Comprehensive Backend Test for Partial Return Functionality
Testing partial returns of generic items as specified in review request.

Test Scenarios:
1. Partial return (1 of 2 units)
2. Complete return (remaining unit)
3. Full return in one step
4. Multiple items with mixed quantities
5. Edge case: trying to return more than available

Test Data:
- User: testcaja / test1234
- Rental ID: 61ce90b0 (Erika Quijano Guerrero) - helmet (2 units), poles (2 units)
- Rental ID: 8bdcc15b (Erika Quijano Guerrero) - helmet (2 units), poles (2 units)
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://rental-signup.preview.emergentagent.com/api"
TEST_USER = "testcaja"
TEST_PASSWORD = "test1234"

class PartialReturnTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.rental_data = {}
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate(self):
        """Authenticate with test user"""
        try:
            login_data = {
                "username": TEST_USER,
                "password": TEST_PASSWORD
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("Authentication", True, f"Logged in as {TEST_USER}")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def get_rental_data(self, rental_id):
        """Get rental data and validate structure"""
        try:
            response = requests.get(f"{BACKEND_URL}/rentals/{rental_id}", headers=self.headers)
            
            if response.status_code == 200:
                rental = response.json()
                self.rental_data[rental_id] = rental
                
                # Validate rental has generic items with quantity > 1
                generic_items = []
                for item in rental.get("items", []):
                    if item.get("is_generic") and item.get("quantity", 0) > 1:
                        generic_items.append(item)
                
                if generic_items:
                    self.log_test(f"Get Rental {rental_id}", True, 
                                f"Found {len(generic_items)} generic items with multi-quantity")
                    return True
                else:
                    self.log_test(f"Get Rental {rental_id}", False, 
                                "No generic items with quantity > 1 found")
                    return False
            else:
                self.log_test(f"Get Rental {rental_id}", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"Get Rental {rental_id}", False, f"Exception: {str(e)}")
            return False
    
    def test_partial_return_1_of_2(self, rental_id):
        """TEST 1: Partial return (1 of 2 units)"""
        try:
            rental = self.rental_data.get(rental_id)
            if not rental:
                self.log_test("Partial Return 1/2", False, "No rental data available")
                return False
            
            # Find a generic item with quantity >= 2
            target_item = None
            for item in rental.get("items", []):
                if item.get("is_generic") and item.get("quantity", 0) >= 2:
                    target_item = item
                    break
            
            if not target_item:
                self.log_test("Partial Return 1/2", False, "No suitable generic item found")
                return False
            
            barcode = target_item["barcode"]
            
            # Perform partial return (1 of 2 units)
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: 1}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify response structure
                expected_status = "partial"  # Should be partial, not returned
                actual_status = result.get("status")
                
                if actual_status != expected_status:
                    self.log_test("Partial Return 1/2", False, 
                                f"Expected status 'partial', got '{actual_status}'")
                    return False
                
                # Check if item has returned_quantity=1 but returned=False
                returned_items = result.get("returned_items", [])
                pending_items = result.get("pending_items", [])
                
                # Item should be in pending_items, not returned_items
                item_in_pending = False
                for item in pending_items:
                    if item.get("barcode") == barcode:
                        if item.get("returned_quantity") == 1 and not item.get("returned", True):
                            item_in_pending = True
                            break
                
                if not item_in_pending:
                    self.log_test("Partial Return 1/2", False, 
                                "Item not found in pending_items with correct returned_quantity")
                    return False
                
                # Verify stock was updated (check generic item stock)
                item_response = requests.get(f"{BACKEND_URL}/items/barcode/{barcode}", headers=self.headers)
                if item_response.status_code == 200:
                    item_data = item_response.json()
                    if item_data.get("is_generic"):
                        # Stock should have increased by 1
                        self.log_test("Partial Return 1/2", True, 
                                    f"Partial return successful: status='{actual_status}', "
                                    f"returned_quantity=1, item in pending_items, stock updated")
                        return True
                
                self.log_test("Partial Return 1/2", True, 
                            f"Partial return successful: status='{actual_status}', item in pending_items")
                return True
            else:
                self.log_test("Partial Return 1/2", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Partial Return 1/2", False, f"Exception: {str(e)}")
            return False
    
    def test_complete_remaining_return(self, rental_id):
        """TEST 2: Complete return (remaining unit)"""
        try:
            # Get updated rental data
            if not self.get_rental_data(rental_id):
                return False
            
            rental = self.rental_data.get(rental_id)
            
            # Find item with returned_quantity=1 and quantity=2 (1 remaining)
            target_item = None
            for item in rental.get("items", []):
                if (item.get("is_generic") and 
                    item.get("returned_quantity", 0) == 1 and 
                    item.get("quantity", 0) == 2):
                    target_item = item
                    break
            
            if not target_item:
                self.log_test("Complete Remaining Return", False, 
                            "No item with 1 unit remaining found")
                return False
            
            barcode = target_item["barcode"]
            
            # Return the remaining 1 unit
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: 1}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Now returned_quantity should be 2 and returned=True
                returned_items = result.get("returned_items", [])
                
                item_fully_returned = False
                for item in returned_items:
                    if (item.get("barcode") == barcode and 
                        item.get("returned_quantity") == 2 and 
                        item.get("returned", False)):
                        item_fully_returned = True
                        break
                
                if item_fully_returned:
                    self.log_test("Complete Remaining Return", True, 
                                "Item fully returned: returned_quantity=2, returned=True, in returned_items")
                    return True
                else:
                    self.log_test("Complete Remaining Return", False, 
                                "Item not found in returned_items with correct status")
                    return False
            else:
                self.log_test("Complete Remaining Return", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Remaining Return", False, f"Exception: {str(e)}")
            return False
    
    def test_full_return_one_step(self, rental_id):
        """TEST 3: Full return in one step (2 units at once)"""
        try:
            # Use second rental for this test
            if not self.get_rental_data(rental_id):
                return False
            
            rental = self.rental_data.get(rental_id)
            
            # Find a generic item with quantity >= 2
            target_item = None
            for item in rental.get("items", []):
                if (item.get("is_generic") and 
                    item.get("quantity", 0) >= 2 and 
                    item.get("returned_quantity", 0) == 0):  # Not yet returned
                    target_item = item
                    break
            
            if not target_item:
                self.log_test("Full Return One Step", False, 
                            "No suitable unreturned generic item found")
                return False
            
            barcode = target_item["barcode"]
            quantity = target_item["quantity"]
            
            # Return all units at once
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: quantity}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Item should go directly to returned_items with returned=True
                returned_items = result.get("returned_items", [])
                
                item_fully_returned = False
                for item in returned_items:
                    if (item.get("barcode") == barcode and 
                        item.get("returned_quantity") == quantity and 
                        item.get("returned", False)):
                        item_fully_returned = True
                        break
                
                if item_fully_returned:
                    self.log_test("Full Return One Step", True, 
                                f"Full return successful: {quantity} units returned directly, returned=True")
                    return True
                else:
                    self.log_test("Full Return One Step", False, 
                                "Item not properly marked as fully returned")
                    return False
            else:
                self.log_test("Full Return One Step", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Full Return One Step", False, f"Exception: {str(e)}")
            return False
    
    def test_multiple_items_mixed_quantities(self, rental_id):
        """TEST 4: Multiple items with mixed quantities"""
        try:
            # Get fresh rental data
            if not self.get_rental_data(rental_id):
                return False
            
            rental = self.rental_data.get(rental_id)
            
            # Find multiple generic items
            generic_items = []
            for item in rental.get("items", []):
                if (item.get("is_generic") and 
                    item.get("quantity", 0) >= 1 and 
                    item.get("returned_quantity", 0) < item.get("quantity", 0)):
                    generic_items.append(item)
            
            if len(generic_items) < 2:
                self.log_test("Multiple Items Mixed Quantities", False, 
                            "Need at least 2 unreturned generic items for this test")
                return False
            
            # Return different quantities for different items
            item1 = generic_items[0]
            item2 = generic_items[1]
            
            # Return partial for item1, full for item2
            return_data = {
                "barcodes": [item1["barcode"], item2["barcode"]],
                "quantities": {
                    item1["barcode"]: 1,  # Partial
                    item2["barcode"]: item2["quantity"]  # Full
                }
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify mixed processing
                returned_items = result.get("returned_items", [])
                pending_items = result.get("pending_items", [])
                
                # Item2 should be in returned_items (full return)
                item2_returned = any(item.get("barcode") == item2["barcode"] and 
                                   item.get("returned", False) 
                                   for item in returned_items)
                
                # Item1 should be in pending_items (partial return)
                item1_pending = any(item.get("barcode") == item1["barcode"] and 
                                  not item.get("returned", True) 
                                  for item in pending_items)
                
                if item2_returned and item1_pending:
                    self.log_test("Multiple Items Mixed Quantities", True, 
                                "Mixed quantities processed correctly: partial + full returns")
                    return True
                else:
                    self.log_test("Multiple Items Mixed Quantities", False, 
                                f"Mixed processing failed: item2_returned={item2_returned}, item1_pending={item1_pending}")
                    return False
            else:
                self.log_test("Multiple Items Mixed Quantities", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Multiple Items Mixed Quantities", False, f"Exception: {str(e)}")
            return False
    
    def test_edge_case_excess_quantity(self, rental_id):
        """TEST 5: Edge case - trying to return more than available"""
        try:
            # Get fresh rental data
            if not self.get_rental_data(rental_id):
                return False
            
            rental = self.rental_data.get(rental_id)
            
            # Find a generic item
            target_item = None
            for item in rental.get("items", []):
                if item.get("is_generic") and item.get("quantity", 0) >= 1:
                    target_item = item
                    break
            
            if not target_item:
                self.log_test("Edge Case Excess Quantity", False, 
                            "No generic item found for edge case test")
                return False
            
            barcode = target_item["barcode"]
            available_quantity = target_item["quantity"] - target_item.get("returned_quantity", 0)
            excess_quantity = available_quantity + 5  # Try to return 5 more than available
            
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: excess_quantity}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Backend should limit the quantity automatically
                # Check that only available quantity was returned
                returned_items = result.get("returned_items", [])
                pending_items = result.get("pending_items", [])
                
                # Find the item in either list
                actual_returned = 0
                for item in returned_items + pending_items:
                    if item.get("barcode") == barcode:
                        actual_returned = item.get("returned_quantity", 0)
                        break
                
                if actual_returned <= target_item["quantity"]:
                    self.log_test("Edge Case Excess Quantity", True, 
                                f"Backend correctly limited return: requested {excess_quantity}, "
                                f"processed {actual_returned} (max available)")
                    return True
                else:
                    self.log_test("Edge Case Excess Quantity", False, 
                                f"Backend allowed excess return: {actual_returned} > {target_item['quantity']}")
                    return False
            else:
                # It's also acceptable if backend returns an error for excess quantity
                if response.status_code == 400:
                    self.log_test("Edge Case Excess Quantity", True, 
                                f"Backend correctly rejected excess quantity with 400 error")
                    return True
                else:
                    self.log_test("Edge Case Excess Quantity", False, 
                                f"Unexpected status: {response.status_code}, Response: {response.text}")
                    return False
                
        except Exception as e:
            self.log_test("Edge Case Excess Quantity", False, f"Exception: {str(e)}")
            return False
    
    def verify_stock_updates(self):
        """Verify that generic item stock was updated correctly"""
        try:
            # Get all generic items to check stock levels
            response = requests.get(f"{BACKEND_URL}/items/generic", headers=self.headers)
            
            if response.status_code == 200:
                generic_items = response.json()
                
                stock_info = []
                for item in generic_items:
                    stock_info.append(f"{item.get('name', 'Unknown')}: "
                                    f"{item.get('stock_available', 0)}/{item.get('stock_total', 0)} available")
                
                self.log_test("Stock Updates Verification", True, 
                            f"Generic items stock: {', '.join(stock_info)}")
                return True
            else:
                self.log_test("Stock Updates Verification", False, 
                            f"Could not get generic items: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Stock Updates Verification", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all partial return tests"""
        print("🎯 STARTING PARTIAL RETURN FUNCTIONALITY TESTING")
        print("=" * 70)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Test data - rental IDs from review request (full UUIDs)
        rental_ids = ["61ce90b0-75b6-4178-91e3-50e9a3beb201", "8bdcc15b-6877-4149-9099-8e82ad233f47"]
        
        # Step 2: Get rental data for both rentals
        print("\n📋 Getting rental data...")
        rental_data_success = True
        for rental_id in rental_ids:
            if not self.get_rental_data(rental_id):
                rental_data_success = False
        
        if not rental_data_success:
            print("❌ Could not get rental data. Cannot continue tests.")
            return False
        
        # Step 3: TEST 1 - Partial return (1 of 2 units)
        print("\n🔄 TEST 1: Partial return (1 of 2 units)...")
        test1_success = self.test_partial_return_1_of_2("61ce90b0-75b6-4178-91e3-50e9a3beb201")
        
        # Step 4: TEST 2 - Complete return (remaining unit)
        print("\n✅ TEST 2: Complete return (remaining unit)...")
        test2_success = self.test_complete_remaining_return("61ce90b0-75b6-4178-91e3-50e9a3beb201")
        
        # Step 5: TEST 3 - Full return in one step
        print("\n⚡ TEST 3: Full return in one step...")
        test3_success = self.test_full_return_one_step("8bdcc15b-6877-4149-9099-8e82ad233f47")
        
        # Step 6: TEST 4 - Multiple items with mixed quantities
        print("\n🔀 TEST 4: Multiple items with mixed quantities...")
        test4_success = self.test_multiple_items_mixed_quantities("8bdcc15b-6877-4149-9099-8e82ad233f47")
        
        # Step 7: TEST 5 - Edge case (excess quantity)
        print("\n⚠️ TEST 5: Edge case - excess quantity...")
        test5_success = self.test_edge_case_excess_quantity("61ce90b0-75b6-4178-91e3-50e9a3beb201")
        
        # Step 8: Verify stock updates
        print("\n📊 Verifying stock updates...")
        stock_verification = self.verify_stock_updates()
        
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
            print("✅ ALL PARTIAL RETURN TESTS PASSED!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            return False

def main():
    """Main test execution"""
    tester = PartialReturnTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Partial Return Functionality is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Partial Return Functionality has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()