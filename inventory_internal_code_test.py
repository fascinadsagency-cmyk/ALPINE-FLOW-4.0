#!/usr/bin/env python3
"""
AlpineFlow Inventory Internal Code Testing Suite
Tests the new inventory flow with mandatory "Código Interno" (internal_code) functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class InventoryInternalCodeTester:
    def __init__(self, base_url: str = "https://rental-ui-refresh-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_item_id = None
        timestamp = datetime.now().strftime('%H%M%S')
        self.test_internal_code = f"SKI-{timestamp}"
        self.test_barcode = f"BC-SKI-{timestamp}"

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint}"
        headers = self.headers.copy()
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": "Invalid method"}, 400
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_register_user(self):
        """Test user registration if user doesn't exist"""
        user_data = {
            "username": "admin",
            "password": "admin123",
            "full_name": "Admin"
        }
        
        success, data, status = self.make_request('POST', 'auth/register', user_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.headers['Authorization'] = f'Bearer {self.token}'
            self.log_test("Register User", True, f"User registered: {data.get('user', {}).get('username', 'admin')}")
            return True
        elif status == 400 and "already exists" in str(data):
            # User already exists, try to login
            self.log_test("Register User", True, "User already exists, will proceed to login")
            return True
        else:
            self.log_test("Register User", False, f"Status: {status}, Response: {data}")
            return False

    def test_login(self):
        """Test user login"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.headers['Authorization'] = f'Bearer {self.token}'
            self.log_test("Login", True, f"User: {data.get('user', {}).get('username', 'admin')}")
            return True
        else:
            self.log_test("Login", False, f"Status: {status}, Response: {data}")
            return False

    def test_create_item_with_internal_code(self):
        """Test creating item with internal_code (mandatory field)"""
        item_data = {
            "internal_code": self.test_internal_code,
            "barcode": self.test_barcode,
            "item_type": "ski",
            "brand": "Salomon",
            "model": "X-Max",
            "size": "170",
            "purchase_price": 350.0,
            "purchase_date": "2024-01-15",
            "location": "A1",
            "maintenance_interval": 30,
            "category": "ALTA"
        }
        
        success, data, status = self.make_request('POST', 'items', item_data)
        
        if success and 'id' in data and data.get('internal_code') == self.test_internal_code:
            self.test_item_id = data['id']
            self.log_test("Create Item with Internal Code", True, 
                         f"Created item with internal_code: {self.test_internal_code}")
            return True, data
        else:
            self.log_test("Create Item with Internal Code", False, 
                         f"Status: {status}, Response: {data}")
            return False, {}

    def test_create_item_without_internal_code(self):
        """Test creating item without internal_code (should fail)"""
        item_data = {
            "barcode": "BC-TEST-NO-INTERNAL",
            "item_type": "ski",
            "brand": "Test Brand",
            "model": "Test Model",
            "size": "165",
            "purchase_price": 300.0,
            "purchase_date": "2024-01-15",
            "location": "B1",
            "maintenance_interval": 30,
            "category": "MEDIA"
            # Note: internal_code is missing
        }
        
        success, data, status = self.make_request('POST', 'items', item_data)
        
        # Should fail because internal_code is required
        if not success and (status == 400 or status == 422):
            self.log_test("Create Item without Internal Code", True, 
                         "Correctly prevented creation without internal_code")
            return True, data
        else:
            self.log_test("Create Item without Internal Code", False, 
                         f"Should have failed but got Status: {status}, Response: {data}")
            return False, {}

    def test_create_duplicate_internal_code(self):
        """Test creating item with duplicate internal_code (should fail)"""
        duplicate_item_data = {
            "internal_code": self.test_internal_code,  # Same as first item
            "barcode": "BC-DUPLICATE-TEST",
            "item_type": "snowboard",
            "brand": "Burton",
            "model": "Custom",
            "size": "158",
            "purchase_price": 400.0,
            "purchase_date": "2024-01-16",
            "location": "C1",
            "maintenance_interval": 30,
            "category": "SUPERIOR"
        }
        
        success, data, status = self.make_request('POST', 'items', duplicate_item_data)
        
        # Should fail because internal_code already exists
        if not success and status == 400 and "already exists" in str(data):
            self.log_test("Create Duplicate Internal Code", True, 
                         "Correctly prevented duplicate internal_code")
            return True, data
        else:
            self.log_test("Create Duplicate Internal Code", False, 
                         f"Should have failed but got Status: {status}, Response: {data}")
            return False, {}

    def test_search_by_internal_code(self):
        """Test searching item by internal_code using barcode endpoint"""
        success, data, status = self.make_request('GET', f'items/barcode/{self.test_internal_code}')
        
        if success and data.get('internal_code') == self.test_internal_code:
            self.log_test("Search by Internal Code", True, 
                         f"Found item by internal_code: {self.test_internal_code}")
            return True, data
        else:
            self.log_test("Search by Internal Code", False, 
                         f"Status: {status}, Response: {data}")
            return False, {}

    def test_search_by_barcode(self):
        """Test searching item by barcode using barcode endpoint"""
        success, data, status = self.make_request('GET', f'items/barcode/{self.test_barcode}')
        
        if success and data.get('barcode') == self.test_barcode:
            self.log_test("Search by Barcode", True, 
                         f"Found item by barcode: {self.test_barcode}")
            return True, data
        else:
            self.log_test("Search by Barcode", False, 
                         f"Status: {status}, Response: {data}")
            return False, {}

    def test_list_all_items(self):
        """Test listing all items"""
        success, data, status = self.make_request('GET', 'items')
        
        if success and isinstance(data, list):
            # Check if our test item is in the list
            test_item_found = False
            for item in data:
                if item.get('internal_code') == self.test_internal_code:
                    test_item_found = True
                    break
            
            if test_item_found:
                self.log_test("List All Items", True, 
                             f"Found {len(data)} items (including test item)")
                return True, data
            else:
                self.log_test("List All Items", False, "Test item not found in list")
                return False, {}
        else:
            self.log_test("List All Items", False, f"Status: {status}, Response: {data}")
            return False, []

    def test_search_with_filter_internal_code(self):
        """Test search with filter prioritizing internal_code"""
        success, data, status = self.make_request('GET', 'items', params={'search': self.test_internal_code})
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if the first result matches our internal_code (priority search)
            first_item = data[0]
            if first_item.get('internal_code') == self.test_internal_code:
                self.log_test("Search with Filter (Internal Code Priority)", True, 
                             f"Found {len(data)} items, internal_code prioritized")
                return True, data
            else:
                self.log_test("Search with Filter (Internal Code Priority)", False, 
                             "Internal code not prioritized in search results")
                return False, {}
        else:
            self.log_test("Search with Filter (Internal Code Priority)", False, 
                         f"Status: {status}, Response: {data}")
            return False, []

    def test_search_with_filter_barcode(self):
        """Test search with filter using barcode"""
        success, data, status = self.make_request('GET', 'items', params={'search': self.test_barcode})
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if we find the item by barcode
            item_found = False
            for item in data:
                if item.get('barcode') == self.test_barcode:
                    item_found = True
                    break
            
            if item_found:
                self.log_test("Search with Filter (Barcode)", True, 
                             f"Found {len(data)} items by barcode search")
                return True, data
            else:
                self.log_test("Search with Filter (Barcode)", False, 
                             "Item not found by barcode search")
                return False, {}
        else:
            self.log_test("Search with Filter (Barcode)", False, 
                         f"Status: {status}, Response: {data}")
            return False, []

    def run_inventory_internal_code_tests(self):
        """Run all inventory internal code tests"""
        print("🚀 Starting Inventory Internal Code Tests")
        print("=" * 60)
        
        # 1. User Registration (if needed)
        print("\n1️⃣ Testing User Registration")
        if not self.test_register_user():
            print("❌ Registration failed - trying login")
        
        # 2. Login
        print("\n2️⃣ Testing Login")
        if not self.test_login():
            print("❌ Login failed - stopping tests")
            return False
        
        # 3. Create item with internal_code
        print("\n3️⃣ Testing Create Item with Internal Code")
        success, item_data = self.test_create_item_with_internal_code()
        if not success:
            print("❌ Could not create test item - stopping tests")
            return False
        
        # 4. Validation tests
        print("\n4️⃣ Testing Validations")
        self.test_create_item_without_internal_code()
        self.test_create_duplicate_internal_code()
        
        # 5. Search tests
        print("\n5️⃣ Testing Search Functionality")
        self.test_search_by_internal_code()
        self.test_search_by_barcode()
        self.test_list_all_items()
        
        # 6. Filter search tests
        print("\n6️⃣ Testing Search with Filters")
        self.test_search_with_filter_internal_code()
        self.test_search_with_filter_barcode()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Inventory Internal Code Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All inventory internal code tests passed!")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} tests failed")
            
            # Show failed tests
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
            
            return False

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            'total_tests': self.tests_run,
            'passed_tests': self.tests_passed,
            'failed_tests': self.tests_run - self.tests_passed,
            'success_rate': (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            'results': self.test_results
        }

def main():
    """Main test execution"""
    tester = InventoryInternalCodeTester()
    
    # Run inventory internal code tests
    success = tester.run_inventory_internal_code_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/tmp/inventory_internal_code_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /tmp/inventory_internal_code_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())