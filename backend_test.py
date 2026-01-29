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
    def __init__(self, base_url: str = "https://skiboard-hub.preview.emergentagent.com"):
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
        self.test_source_id = None
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

    # ==================== FASE 1 FUNCTIONALITY TESTS ====================
    
    def test_edit_item(self):
        """Test editing an existing item (PUT /api/items/{item_id})"""
        if not self.test_item_ids:
            self.log_test("Edit Item", False, "No test items available")
            return False, {}
        
        item_id = self.test_item_ids[0]
        
        # Updated item data
        updated_data = {
            "barcode": f"EDITED{datetime.now().strftime('%H%M%S')}",
            "item_type": "ski",
            "brand": "Updated Brand",
            "model": "Updated Model",
            "size": "175",
            "purchase_price": 400.0,
            "purchase_date": "2024-01-20",
            "location": "Updated Location",
            "maintenance_interval": 45
        }
        
        success, data, status = self.make_request('PUT', f'items/{item_id}', updated_data)
        
        if success and data.get('brand') == 'Updated Brand':
            self.log_test("Edit Item", True, f"Successfully updated item {item_id}")
            return True, data
        else:
            self.log_test("Edit Item", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_delete_rented_item(self):
        """Test deleting a rented item (should fail)"""
        # First create a rental to have a rented item
        if not self.test_rental_id:
            self.log_test("Delete Rented Item", False, "No active rental available")
            return False, {}
        
        # Get rental details to find rented item
        success, rental_data, status = self.make_request('GET', f'rentals/{self.test_rental_id}')
        if not success or not rental_data.get('items'):
            self.log_test("Delete Rented Item", False, "Could not get rental details")
            return False, {}
        
        # Find the rented item ID
        rented_barcode = rental_data['items'][0]['barcode']
        success, items, status = self.make_request('GET', 'items')
        if not success:
            self.log_test("Delete Rented Item", False, "Could not fetch items")
            return False, {}
        
        rented_item_id = None
        for item in items:
            if item['barcode'] == rented_barcode and item['status'] == 'rented':
                rented_item_id = item['id']
                break
        
        if not rented_item_id:
            self.log_test("Delete Rented Item", False, "Could not find rented item")
            return False, {}
        
        # Try to delete the rented item (should fail)
        success, data, status = self.make_request('DELETE', f'items/{rented_item_id}')
        
        if not success and status == 400:
            self.log_test("Delete Rented Item", True, "Correctly prevented deletion of rented item")
            return True, data
        else:
            self.log_test("Delete Rented Item", False, f"Should have failed but got Status: {status}")
            return False, {}

    def test_delete_available_item(self):
        """Test deleting an available item (should succeed and set to retired)"""
        # Create a new item specifically for deletion
        barcode = f"DELETE{datetime.now().strftime('%H%M%S')}"
        item_data = {
            "barcode": barcode,
            "item_type": "helmet",
            "brand": "Delete Test",
            "model": "Test Model",
            "size": "M",
            "purchase_price": 50.0,
            "purchase_date": "2024-01-15",
            "location": "Test Location",
            "maintenance_interval": 30
        }
        
        success, created_item, status = self.make_request('POST', 'items', item_data)
        if not success:
            self.log_test("Delete Available Item", False, "Could not create test item")
            return False, {}
        
        item_id = created_item['id']
        
        # Delete the item
        success, data, status = self.make_request('DELETE', f'items/{item_id}')
        
        if success:
            # Verify item is retired
            success_check, item_check, status_check = self.make_request('GET', f'items/barcode/{barcode}')
            if success_check and item_check.get('status') == 'retired':
                self.log_test("Delete Available Item", True, f"Item {barcode} successfully retired")
                return True, data
            else:
                self.log_test("Delete Available Item", False, "Item not properly retired")
                return False, {}
        else:
            self.log_test("Delete Available Item", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_pending_returns(self):
        """Test pending returns endpoint (GET /api/rentals/pending/returns)"""
        success, data, status = self.make_request('GET', 'rentals/pending/returns')
        
        if success and 'today' in data and 'other_days' in data:
            today_count = len(data.get('today', []))
            other_count = len(data.get('other_days', []))
            
            # Check if we have overdue items
            overdue_count = 0
            for rental in data.get('other_days', []):
                if rental.get('days_overdue', 0) > 0:
                    overdue_count += 1
            
            self.log_test("Pending Returns", True, 
                         f"Today: {today_count}, Other days: {other_count}, Overdue: {overdue_count}")
            return True, data
        else:
            self.log_test("Pending Returns", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_update_rental_days(self):
        """Test updating rental days (PATCH /api/rentals/{rental_id}/days)"""
        if not self.test_rental_id:
            self.log_test("Update Rental Days", False, "No test rental available")
            return False, {}
        
        # Get current rental details
        success, rental_data, status = self.make_request('GET', f'rentals/{self.test_rental_id}')
        if not success:
            self.log_test("Update Rental Days", False, "Could not get rental details")
            return False, {}
        
        current_days = rental_data.get('days', 3)
        new_days = current_days + 2
        new_total = 150.0
        
        update_data = {
            "days": new_days,
            "new_total": new_total
        }
        
        success, data, status = self.make_request('PATCH', f'rentals/{self.test_rental_id}/days', update_data)
        
        if success and data.get('days') == new_days and data.get('total_amount') == new_total:
            self.log_test("Update Rental Days", True, 
                         f"Updated rental from {current_days} to {new_days} days, total: €{new_total}")
            return True, data
        else:
            self.log_test("Update Rental Days", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_update_returned_rental_days(self):
        """Test updating days on a returned rental (should fail)"""
        # First process return to have a returned rental
        if not self.test_rental_id:
            self.log_test("Update Returned Rental Days", False, "No test rental available")
            return False, {}
        
        # Process return first
        success, rental_data, status = self.make_request('GET', f'rentals/{self.test_rental_id}')
        if success and rental_data.get('items'):
            barcodes = [item['barcode'] for item in rental_data['items']]
            return_data = {"barcodes": barcodes}
            self.make_request('POST', f'rentals/{self.test_rental_id}/return', return_data)
        
        # Now try to update days (should fail)
        update_data = {"days": 10, "new_total": 200.0}
        success, data, status = self.make_request('PATCH', f'rentals/{self.test_rental_id}/days', update_data)
        
        if not success and status == 400:
            self.log_test("Update Returned Rental Days", True, "Correctly prevented updating closed rental")
            return True, data
        else:
            self.log_test("Update Returned Rental Days", False, f"Should have failed but got Status: {status}")
            return False, {}

    def test_create_provider_source(self):
        """Test creating a provider/source with discount (POST /api/sources)"""
        timestamp = datetime.now().strftime('%H%M%S')
        source_data = {
            "name": f"Hotel Test {timestamp}",
            "is_favorite": False,
            "discount_percent": 15.0,
            "commission_percent": 5.0,
            "contact_person": "Test Contact",
            "email": "test@hotel.com",
            "phone": "123456789",
            "notes": "Test provider for FASE 1",
            "active": True
        }
        
        success, data, status = self.make_request('POST', 'sources', source_data)
        
        if success and 'id' in data:
            self.test_source_id = data['id']
            self.log_test("Create Provider Source", True, 
                         f"Created provider '{source_data['name']}' with {source_data['discount_percent']}% discount")
            return True, data
        else:
            self.log_test("Create Provider Source", False, f"Status: {status}, Response: {data}")
            return False, {}

    def test_get_sources(self):
        """Test getting all sources/providers (GET /api/sources)"""
        success, data, status = self.make_request('GET', 'sources')
        
        if success and isinstance(data, list):
            # Check if our test source exists
            test_source_found = False
            if hasattr(self, 'test_source_id'):
                for source in data:
                    if source.get('id') == self.test_source_id:
                        test_source_found = True
                        break
            
            self.log_test("Get Sources", True, 
                         f"Found {len(data)} sources" + (" (including test source)" if test_source_found else ""))
            return True, data
        else:
            self.log_test("Get Sources", False, f"Status: {status}")
            return False, []

    def test_update_provider_discount(self):
        """Test updating provider discount (PUT /api/sources/{source_id})"""
        if not hasattr(self, 'test_source_id'):
            self.log_test("Update Provider Discount", False, "No test source available")
            return False, {}
        
        # Update the provider with new discount
        updated_data = {
            "name": f"Hotel Test Updated {datetime.now().strftime('%H%M%S')}",
            "is_favorite": True,
            "discount_percent": 20.0,  # Changed from 15% to 20%
            "commission_percent": 7.0,  # Changed from 5% to 7%
            "contact_person": "Updated Contact",
            "email": "updated@hotel.com",
            "phone": "987654321",
            "notes": "Updated test provider",
            "active": True
        }
        
        success, data, status = self.make_request('PUT', f'sources/{self.test_source_id}', updated_data)
        
        if success and data.get('discount_percent') == 20.0:
            self.log_test("Update Provider Discount", True, 
                         f"Updated provider discount to {data.get('discount_percent')}%")
            return True, data
        else:
            self.log_test("Update Provider Discount", False, f"Status: {status}, Response: {data}")
            return False, {}

    def run_fase1_tests(self):
        """Run FASE 1 specific functionality tests"""
        print("🚀 Starting FASE 1 Functionality Tests")
        print("=" * 50)
        
        # Basic connectivity and auth
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        if not self.test_login():
            print("❌ Login failed - stopping tests")
            return False
        
        # Setup test data
        print("\n📋 Setting up test data...")
        self.test_generate_barcodes()
        self.test_create_item()
        self.test_create_customer()
        self.test_create_rental()
        
        print("\n🧪 Running FASE 1 Tests...")
        
        # 1. TEST EDIT/DELETE ITEMS IN INVENTORY
        print("\n1️⃣ Testing Edit/Delete Items in Inventory")
        success, items = self.test_get_items()
        if success:
            self.test_edit_item()
            self.test_delete_rented_item()
            self.test_delete_available_item()
        
        # 2. TEST PENDING RETURNS ENDPOINT
        print("\n2️⃣ Testing Pending Returns Endpoint")
        self.test_pending_returns()
        
        # 3. TEST UPDATE RENTAL DAYS
        print("\n3️⃣ Testing Update Rental Days")
        self.test_update_rental_days()
        self.test_update_returned_rental_days()
        
        # 4. TEST PROVIDER DISCOUNT
        print("\n4️⃣ Testing Provider Discount Management")
        self.test_create_provider_source()
        self.test_get_sources()
        self.test_update_provider_discount()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 FASE 1 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All FASE 1 tests passed!")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} FASE 1 tests failed")
            
            # Show failed tests
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
            
            return False

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
    
    # Run FASE 1 specific tests as requested
    success = tester.run_fase1_tests()
    
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