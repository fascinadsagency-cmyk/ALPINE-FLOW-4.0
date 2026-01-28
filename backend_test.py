#!/usr/bin/env python3
"""
AlpineFlow Backend API Testing Suite
Tests all API endpoints for the ski/snowboard rental management system
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class AlpineFlowAPITester:
    def __init__(self, base_url: str = "https://skitrack-manager.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_customer_id = None
        self.test_item_ids = []
        self.test_rental_id = None
        self.generated_barcodes = []

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

    def test_health_check(self):
        """Test API health endpoint"""
        success, data, status = self.make_request('GET', 'health')
        self.log_test("Health Check", success and status == 200, 
                     f"Status: {status}" if not success else "", data)
        return success

    def test_login(self, username: str = "admin", password: str = "admin123"):
        """Test user login"""
        login_data = {"username": username, "password": password}
        success, data, status = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.headers['Authorization'] = f'Bearer {self.token}'
            self.log_test("Login", True, f"User: {data.get('user', {}).get('username', 'unknown')}")
            return True
        else:
            self.log_test("Login", False, f"Status: {status}, Response: {data}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, data, status = self.make_request('GET', 'dashboard')
        
        if success:
            stats = data.get('stats', {})
            inventory = stats.get('inventory', {})
            available_items = inventory.get('available', 0)
            
            self.log_test("Dashboard Stats", True, 
                         f"Available items: {available_items}, Total: {inventory.get('total', 0)}")
            return True, available_items
        else:
            self.log_test("Dashboard Stats", False, f"Status: {status}")
            return False, 0

    def test_inventory_stats(self):
        """Test inventory statistics"""
        success, data, status = self.make_request('GET', 'items/stats')
        
        if success:
            available = data.get('available', 0)
            total = data.get('total', 0)
            self.log_test("Inventory Stats", True, 
                         f"Available: {available}, Total: {total}")
            return True, data
        else:
            self.log_test("Inventory Stats", False, f"Status: {status}")
            return False, {}

    def test_get_items(self):
        """Test getting inventory items"""
        success, data, status = self.make_request('GET', 'items')
        
        if success and isinstance(data, list):
            self.log_test("Get Items", True, f"Found {len(data)} items")
            return True, data
        else:
            self.log_test("Get Items", False, f"Status: {status}")
            return False, []

    def test_generate_barcodes(self, prefix: str = "SKI", count: int = 3):
        """Test barcode generation"""
        barcode_data = {"prefix": prefix, "count": count}
        success, data, status = self.make_request('POST', 'items/generate-barcodes', barcode_data)
        
        if success and 'barcodes' in data:
            self.generated_barcodes = data['barcodes']
            self.log_test("Generate Barcodes", True, 
                         f"Generated {len(self.generated_barcodes)} codes with prefix {prefix}")
            return True, self.generated_barcodes
        else:
            self.log_test("Generate Barcodes", False, f"Status: {status}")
            return False, []

    def test_create_item(self, barcode: str = None):
        """Test creating a new inventory item"""
        if not barcode and self.generated_barcodes:
            barcode = self.generated_barcodes[0]
        elif not barcode:
            barcode = f"TEST{datetime.now().strftime('%H%M%S')}"
        
        item_data = {
            "barcode": barcode,
            "item_type": "ski",
            "brand": "Test Brand",
            "model": "Test Model",
            "size": "170",
            "purchase_price": 350.0,
            "purchase_date": "2024-01-15",
            "location": "Test Location",
            "maintenance_interval": 30
        }
        
        success, data, status = self.make_request('POST', 'items', item_data)
        
        if success and 'id' in data:
            self.test_item_ids.append(data['id'])
            self.log_test("Create Item", True, f"Created item with barcode: {barcode}")
            return True, data
        else:
            self.log_test("Create Item", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_get_tariffs(self):
        """Test getting tariff information"""
        success, data, status = self.make_request('GET', 'tariffs')
        
        if success:
            self.log_test("Get Tariffs", True, f"Found {len(data)} tariff configurations")
            return True, data
        else:
            self.log_test("Get Tariffs", False, f"Status: {status}")
            return False, []

    def test_create_tariff(self):
        """Test creating tariff configuration"""
        tariff_data = {
            "item_type": "ski",
            "days_1": 25.0,
            "days_2_3": 20.0,
            "days_4_7": 15.0,
            "week": 100.0,
            "season": 500.0
        }
        
        success, data, status = self.make_request('POST', 'tariffs', tariff_data)
        
        if success:
            self.log_test("Create/Update Tariff", True, f"Configured tariff for {tariff_data['item_type']}")
            return True, data
        else:
            self.log_test("Create/Update Tariff", False, f"Status: {status}")
            return False, {}

    def test_create_customer(self):
        """Test creating a new customer"""
        timestamp = datetime.now().strftime('%H%M%S')
        customer_data = {
            "dni": f"TEST{timestamp}",
            "name": f"Test Customer {timestamp}",
            "phone": "123456789",
            "address": "Test Address",
            "city": "Test City"
        }
        
        success, data, status = self.make_request('POST', 'customers', customer_data)
        
        if success and 'id' in data:
            self.test_customer_id = data['id']
            self.log_test("Create Customer", True, f"Created customer: {customer_data['name']}")
            return True, data
        else:
            self.log_test("Create Customer", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_search_customer(self, search_term: str = None):
        """Test customer search functionality"""
        if not search_term and self.test_customer_id:
            # Get the created customer first
            success, customer_data, status = self.make_request('GET', f'customers/{self.test_customer_id}')
            if success:
                search_term = customer_data.get('dni', 'TEST')
        
        if not search_term:
            search_term = "TEST"
        
        success, data, status = self.make_request('GET', 'customers', params={'search': search_term})
        
        if success:
            self.log_test("Search Customer", True, f"Found {len(data)} customers for '{search_term}'")
            return True, data
        else:
            self.log_test("Search Customer", False, f"Status: {status}")
            return False, []

    def test_create_rental(self):
        """Test creating a rental"""
        if not self.test_customer_id:
            self.log_test("Create Rental", False, "No test customer available")
            return False, {}
        
        if not self.test_item_ids:
            self.log_test("Create Rental", False, "No test items available")
            return False, {}
        
        # Get item details
        success, item_data, status = self.make_request('GET', f'items')
        if not success:
            self.log_test("Create Rental", False, "Could not fetch items")
            return False, {}
        
        # Find an available item
        available_item = None
        for item in item_data:
            if item.get('status') == 'available':
                available_item = item
                break
        
        if not available_item:
            self.log_test("Create Rental", False, "No available items found")
            return False, {}
        
        start_date = datetime.now().strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        
        rental_data = {
            "customer_id": self.test_customer_id,
            "start_date": start_date,
            "end_date": end_date,
            "items": [{"barcode": available_item['barcode'], "person_name": ""}],
            "payment_method": "cash",
            "total_amount": 75.0,
            "paid_amount": 75.0,
            "deposit": 50.0,
            "notes": "Test rental"
        }
        
        success, data, status = self.make_request('POST', 'rentals', rental_data)
        
        if success and 'id' in data:
            self.test_rental_id = data['id']
            self.log_test("Create Rental", True, f"Created rental for {data.get('customer_name', 'customer')}")
            return True, data
        else:
            self.log_test("Create Rental", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_get_rental_by_barcode(self):
        """Test finding rental by barcode"""
        if not self.test_rental_id:
            self.log_test("Get Rental by Barcode", False, "No test rental available")
            return False, {}
        
        # Get rental details first
        success, rental_data, status = self.make_request('GET', f'rentals/{self.test_rental_id}')
        if not success or not rental_data.get('items'):
            self.log_test("Get Rental by Barcode", False, "Could not get rental details")
            return False, {}
        
        barcode = rental_data['items'][0]['barcode']
        success, data, status = self.make_request('GET', f'rentals/barcode/{barcode}')
        
        if success:
            self.log_test("Get Rental by Barcode", True, f"Found rental for barcode: {barcode}")
            return True, data
        else:
            self.log_test("Get Rental by Barcode", False, f"Status: {status}")
            return False, {}

    def test_process_return(self):
        """Test processing a return"""
        if not self.test_rental_id:
            self.log_test("Process Return", False, "No test rental available")
            return False, {}
        
        # Get rental details
        success, rental_data, status = self.make_request('GET', f'rentals/{self.test_rental_id}')
        if not success or not rental_data.get('items'):
            self.log_test("Process Return", False, "Could not get rental details")
            return False, {}
        
        barcodes = [item['barcode'] for item in rental_data['items']]
        return_data = {"barcodes": barcodes}
        
        success, data, status = self.make_request('POST', f'rentals/{self.test_rental_id}/return', return_data)
        
        if success:
            self.log_test("Process Return", True, f"Processed return for {len(barcodes)} items")
            return True, data
        else:
            self.log_test("Process Return", False, f"Status: {status}")
            return False, {}

    def test_daily_report(self):
        """Test daily report generation"""
        today = datetime.now().strftime('%Y-%m-%d')
        success, data, status = self.make_request('GET', 'reports/daily', params={'date': today})
        
        if success:
            self.log_test("Daily Report", True, 
                         f"Revenue: €{data.get('total_revenue', 0)}, Rentals: {data.get('new_rentals', 0)}")
            return True, data
        else:
            self.log_test("Daily Report", False, f"Status: {status}")
            return False, {}

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting AlpineFlow API Test Suite")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication
        if not self.test_login():
            print("❌ Login failed - stopping tests")
            return False
        
        # Dashboard and stats
        self.test_dashboard_stats()
        self.test_inventory_stats()
        
        # Inventory management
        self.test_get_items()
        self.test_generate_barcodes()
        self.test_create_item()
        
        # Tariff management
        self.test_get_tariffs()
        self.test_create_tariff()
        
        # Customer management
        self.test_create_customer()
        self.test_search_customer()
        
        # Rental flow
        self.test_create_rental()
        self.test_get_rental_by_barcode()
        
        # Return flow
        self.test_process_return()
        
        # Reports
        self.test_daily_report()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = AlpineFlowAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())