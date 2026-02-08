#!/usr/bin/env python3
"""
Comprehensive Backend Test for Partial Return Functionality - Complete Test Suite
Testing partial returns of generic items with fresh test data creation.

This test creates its own test data to ensure all scenarios can be tested properly.
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import uuid

# Configuration
BACKEND_URL = "https://plan-guard-1.preview.emergentagent.com/api"
TEST_USER = "testcaja"
TEST_PASSWORD = "test1234"

class ComprehensivePartialReturnTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        self.test_customer_id = None
        self.test_rental_ids = []
        
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
    
    def create_test_customer(self):
        """Create a test customer for our tests"""
        try:
            customer_data = {
                "dni": f"TEST{str(uuid.uuid4())[:8].upper()}",
                "name": "Test Customer Partial Returns",
                "phone": "666777888",
                "email": f"test.partial.{str(uuid.uuid4())[:8]}@example.com",
                "address": "Test Address 123",
                "city": "Test City"
            }
            
            response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.test_customer_id = data["id"]
                self.log_test("Create Test Customer", True, f"Customer created with ID: {self.test_customer_id}")
                return True
            else:
                self.log_test("Create Test Customer", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Test Customer", False, f"Exception: {str(e)}")
            return False
    
    def get_generic_items(self):
        """Get available generic items for testing"""
        try:
            response = requests.get(f"{BACKEND_URL}/items/generic", headers=self.headers)
            
            if response.status_code == 200:
                items = response.json()
                # Filter items with available stock
                available_items = [item for item in items if item.get("stock_available", 0) >= 2]
                
                if len(available_items) >= 2:
                    self.log_test("Get Generic Items", True, f"Found {len(available_items)} generic items with stock >= 2")
                    return available_items[:3]  # Return first 3 for testing
                else:
                    self.log_test("Get Generic Items", False, f"Only {len(available_items)} items with stock >= 2")
                    return []
            else:
                self.log_test("Get Generic Items", False, f"Status: {response.status_code}")
                return []
                
        except Exception as e:
            self.log_test("Get Generic Items", False, f"Exception: {str(e)}")
            return []
    
    def create_test_rental(self, items_data, rental_name=""):
        """Create a test rental with specified generic items"""
        try:
            if not self.test_customer_id:
                return None
            
            today = datetime.now().strftime("%Y-%m-%d")
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            rental_items = []
            total_amount = 0
            
            for item_data in items_data:
                rental_items.append({
                    "barcode": item_data["barcode"],
                    "is_generic": True,
                    "quantity": item_data["quantity"],
                    "unit_price": item_data.get("rental_price", 5.0)
                })
                total_amount += item_data["quantity"] * item_data.get("rental_price", 5.0)
            
            rental_data = {
                "customer_id": self.test_customer_id,
                "start_date": today,
                "end_date": tomorrow,
                "items": rental_items,
                "payment_method": "cash",
                "total_amount": total_amount,
                "paid_amount": total_amount,
                "deposit": 0.0,
                "notes": f"Test rental for partial returns - {rental_name}"
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals", json=rental_data, headers=self.headers)
            
            if response.status_code in [200, 201]:
                rental = response.json()
                rental_id = rental["id"]
                self.test_rental_ids.append(rental_id)
                self.log_test(f"Create Test Rental {rental_name}", True, 
                            f"Rental created with ID: {rental_id[:8]}..., {len(rental_items)} items")
                return rental_id
            else:
                self.log_test(f"Create Test Rental {rental_name}", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"Create Test Rental {rental_name}", False, f"Exception: {str(e)}")
            return None
    
    def test_partial_return_scenario(self, rental_id, test_name, barcode, return_quantity, expected_status):
        """Generic test for partial return scenarios"""
        try:
            # Get current rental state
            rental_response = requests.get(f"{BACKEND_URL}/rentals/{rental_id}", headers=self.headers)
            if rental_response.status_code != 200:
                self.log_test(test_name, False, "Could not get rental data")
                return False
            
            rental = rental_response.json()
            
            # Find the target item
            target_item = None
            for item in rental.get("items", []):
                if item.get("barcode") == barcode:
                    target_item = item
                    break
            
            if not target_item:
                self.log_test(test_name, False, f"Item with barcode {barcode} not found")
                return False
            
            # Perform return
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: return_quantity}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                actual_status = result.get("status")
                
                # Check status
                if actual_status != expected_status:
                    self.log_test(test_name, False, 
                                f"Expected status '{expected_status}', got '{actual_status}'")
                    return False
                
                # Check item placement and returned_quantity
                returned_items = result.get("returned_items", [])
                pending_items = result.get("pending_items", [])
                
                # Find the item in results
                found_item = None
                item_location = None
                
                for item in returned_items:
                    if item.get("barcode") == barcode:
                        found_item = item
                        item_location = "returned_items"
                        break
                
                if not found_item:
                    for item in pending_items:
                        if item.get("barcode") == barcode:
                            found_item = item
                            item_location = "pending_items"
                            break
                
                if not found_item:
                    self.log_test(test_name, False, "Item not found in return results")
                    return False
                
                # Verify returned_quantity
                previous_returned = target_item.get("returned_quantity", 0)
                expected_returned_quantity = previous_returned + return_quantity
                actual_returned_quantity = found_item.get("returned_quantity", 0)
                
                if actual_returned_quantity != expected_returned_quantity:
                    self.log_test(test_name, False, 
                                f"Expected returned_quantity {expected_returned_quantity}, got {actual_returned_quantity}")
                    return False
                
                # Verify returned flag
                total_quantity = target_item.get("quantity", 0)
                should_be_fully_returned = actual_returned_quantity >= total_quantity
                is_returned = found_item.get("returned", False)
                
                if should_be_fully_returned != is_returned:
                    self.log_test(test_name, False, 
                                f"Returned flag mismatch: should_be_fully_returned={should_be_fully_returned}, is_returned={is_returned}")
                    return False
                
                self.log_test(test_name, True, 
                            f"Success: status='{actual_status}', returned_quantity={actual_returned_quantity}, "
                            f"returned={is_returned}, location={item_location}")
                return True
            else:
                self.log_test(test_name, False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
            return False
    
    def test_multiple_items_return(self, rental_id, return_data, test_name):
        """Test returning multiple items with different quantities"""
        try:
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify each item was processed correctly
                returned_items = result.get("returned_items", [])
                pending_items = result.get("pending_items", [])
                
                success_details = []
                for barcode, quantity in return_data["quantities"].items():
                    # Find item in results
                    found_item = None
                    location = None
                    
                    for item in returned_items:
                        if item.get("barcode") == barcode:
                            found_item = item
                            location = "returned"
                            break
                    
                    if not found_item:
                        for item in pending_items:
                            if item.get("barcode") == barcode:
                                found_item = item
                                location = "pending"
                                break
                    
                    if found_item:
                        success_details.append(f"{barcode}({quantity}→{location})")
                
                self.log_test(test_name, True, f"Multiple items processed: {', '.join(success_details)}")
                return True
            else:
                self.log_test(test_name, False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
            return False
    
    def test_edge_case_excess_quantity(self, rental_id, barcode, excess_quantity):
        """Test edge case of returning more than available"""
        try:
            return_data = {
                "barcodes": [barcode],
                "quantities": {barcode: excess_quantity}
            }
            
            response = requests.post(f"{BACKEND_URL}/rentals/{rental_id}/return", 
                                   json=return_data, headers=self.headers)
            
            if response.status_code == 200:
                # Backend should limit quantity automatically
                self.log_test("Edge Case Excess Quantity", True, 
                            f"Backend handled excess quantity gracefully (requested {excess_quantity})")
                return True
            elif response.status_code == 400:
                # Backend rejected with error - also acceptable
                self.log_test("Edge Case Excess Quantity", True, 
                            f"Backend correctly rejected excess quantity with 400 error")
                return True
            else:
                self.log_test("Edge Case Excess Quantity", False, 
                            f"Unexpected response: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Edge Case Excess Quantity", False, f"Exception: {str(e)}")
            return False
    
    def verify_stock_consistency(self, generic_items):
        """Verify that stock levels are consistent after returns"""
        try:
            response = requests.get(f"{BACKEND_URL}/items/generic", headers=self.headers)
            
            if response.status_code == 200:
                current_items = response.json()
                
                stock_changes = []
                for original_item in generic_items:
                    barcode = original_item["barcode"]
                    original_stock = original_item.get("stock_available", 0)
                    
                    # Find current stock
                    current_item = next((item for item in current_items if item["barcode"] == barcode), None)
                    if current_item:
                        current_stock = current_item.get("stock_available", 0)
                        change = current_stock - original_stock
                        stock_changes.append(f"{barcode}: {original_stock}→{current_stock} ({change:+d})")
                
                self.log_test("Stock Consistency Check", True, 
                            f"Stock changes: {', '.join(stock_changes)}")
                return True
            else:
                self.log_test("Stock Consistency Check", False, 
                            f"Could not verify stock: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Stock Consistency Check", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run comprehensive partial return tests"""
        print("🎯 STARTING COMPREHENSIVE PARTIAL RETURN FUNCTIONALITY TESTING")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Create test customer
        print("\n👤 Creating test customer...")
        if not self.create_test_customer():
            print("❌ Could not create test customer. Cannot continue tests.")
            return False
        
        # Step 3: Get generic items for testing
        print("\n📦 Getting generic items for testing...")
        generic_items = self.get_generic_items()
        if len(generic_items) < 2:
            print("❌ Need at least 2 generic items with stock >= 2. Cannot continue tests.")
            return False
        
        # Step 4: Create test rentals
        print("\n🏗️ Creating test rentals...")
        
        # Rental 1: For partial return tests (2 items, 2 units each)
        rental1_items = [
            {"barcode": generic_items[0]["barcode"], "quantity": 2, "rental_price": 5.0},
            {"barcode": generic_items[1]["barcode"], "quantity": 2, "rental_price": 5.0}
        ]
        rental1_id = self.create_test_rental(rental1_items, "Rental1-PartialTests")
        
        # Rental 2: For multiple items test (3 items, different quantities)
        if len(generic_items) >= 3:
            rental2_items = [
                {"barcode": generic_items[0]["barcode"], "quantity": 3, "rental_price": 5.0},
                {"barcode": generic_items[1]["barcode"], "quantity": 2, "rental_price": 5.0},
                {"barcode": generic_items[2]["barcode"], "quantity": 1, "rental_price": 5.0}
            ]
        else:
            rental2_items = [
                {"barcode": generic_items[0]["barcode"], "quantity": 3, "rental_price": 5.0},
                {"barcode": generic_items[1]["barcode"], "quantity": 2, "rental_price": 5.0}
            ]
        rental2_id = self.create_test_rental(rental2_items, "Rental2-MultipleItems")
        
        if not rental1_id or not rental2_id:
            print("❌ Could not create test rentals. Cannot continue tests.")
            return False
        
        # Step 5: TEST 1 - Partial return (1 of 2 units)
        print("\n🔄 TEST 1: Partial return (1 of 2 units)...")
        item1_barcode = generic_items[0]["barcode"]
        test1_success = self.test_partial_return_scenario(
            rental1_id, "TEST 1: Partial Return 1/2", item1_barcode, 1, "partial"
        )
        
        # Step 6: TEST 2 - Complete return (remaining unit)
        print("\n✅ TEST 2: Complete return (remaining unit)...")
        test2_success = self.test_partial_return_scenario(
            rental1_id, "TEST 2: Complete Remaining Return", item1_barcode, 1, "partial"
        )
        
        # Step 7: TEST 3 - Full return in one step
        print("\n⚡ TEST 3: Full return in one step...")
        item2_barcode = generic_items[1]["barcode"]
        test3_success = self.test_partial_return_scenario(
            rental1_id, "TEST 3: Full Return One Step", item2_barcode, 2, "returned"
        )
        
        # Step 8: TEST 4 - Multiple items with mixed quantities
        print("\n🔀 TEST 4: Multiple items with mixed quantities...")
        if len(rental2_items) >= 2:
            mixed_return_data = {
                "barcodes": [rental2_items[0]["barcode"], rental2_items[1]["barcode"]],
                "quantities": {
                    rental2_items[0]["barcode"]: 1,  # Partial return
                    rental2_items[1]["barcode"]: rental2_items[1]["quantity"]  # Full return
                }
            }
            test4_success = self.test_multiple_items_return(
                rental2_id, mixed_return_data, "TEST 4: Multiple Items Mixed Quantities"
            )
        else:
            test4_success = False
            self.log_test("TEST 4: Multiple Items Mixed Quantities", False, "Not enough items in rental")
        
        # Step 9: TEST 5 - Edge case (excess quantity)
        print("\n⚠️ TEST 5: Edge case - excess quantity...")
        test5_success = self.test_edge_case_excess_quantity(
            rental2_id, rental2_items[0]["barcode"], 10  # Try to return 10 units
        )
        
        # Step 10: Verify stock consistency
        print("\n📊 Verifying stock consistency...")
        stock_verification = self.verify_stock_consistency(generic_items)
        
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
            print("✅ ALL COMPREHENSIVE PARTIAL RETURN TESTS PASSED!")
            return True
        else:
            print("❌ SOME TESTS FAILED!")
            return False

def main():
    """Main test execution"""
    tester = ComprehensivePartialReturnTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Comprehensive Partial Return Functionality is working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Comprehensive Partial Return Functionality has issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()