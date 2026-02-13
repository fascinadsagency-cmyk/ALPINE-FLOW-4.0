#!/usr/bin/env python3
"""
Cross-Store Data Leak Test - Critical Security Verification
Testing if Store 1 can see Store 3's data and vice versa (the real isolation test)
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://inventory-fixes-1.preview.emergentagent.com/api"

class CrossStoreLeakTester:
    def __init__(self):
        self.store1_token = None
        self.store3_token = None
        self.store1_headers = {}
        self.store3_headers = {}
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate_both_stores(self):
        """Authenticate with both stores"""
        try:
            # Store 1
            login_data = {"username": "testcaja", "password": "test1234"}
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                self.store1_token = response.json()["access_token"]
                self.store1_headers = {"Authorization": f"Bearer {self.store1_token}"}
                self.log_test("Store 1 Authentication", True, "testcaja logged in")
            else:
                self.log_test("Store 1 Authentication", False, f"Status: {response.status_code}")
                return False
            
            # Store 3
            login_data = {"username": "tienda3_admin", "password": "test789"}
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                self.store3_token = response.json()["access_token"]
                self.store3_headers = {"Authorization": f"Bearer {self.store3_token}"}
                self.log_test("Store 3 Authentication", True, "tienda3_admin logged in")
            else:
                self.log_test("Store 3 Authentication", False, f"Status: {response.status_code}")
                return False
            
            return True
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def get_store_data(self, headers, store_name):
        """Get all data for a store"""
        data = {}
        endpoints = ["packs", "sources", "tariffs", "customers", "items"]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{BACKEND_URL}/{endpoint}", headers=headers)
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list):
                        data[endpoint] = result
                    elif isinstance(result, dict) and endpoint in result:
                        data[endpoint] = result[endpoint]
                    else:
                        data[endpoint] = result
                else:
                    data[endpoint] = []
            except:
                data[endpoint] = []
        
        return data
    
    def test_cross_store_isolation(self):
        """Test that Store 1 cannot see Store 3 data and vice versa"""
        try:
            # Get data from both stores
            store1_data = self.get_store_data(self.store1_headers, "Store 1")
            store3_data = self.get_store_data(self.store3_headers, "Store 3")
            
            print(f"\n📊 DATA COUNTS:")
            print(f"Store 1: packs={len(store1_data['packs'])}, sources={len(store1_data['sources'])}, customers={len(store1_data['customers'])}")
            print(f"Store 3: packs={len(store3_data['packs'])}, sources={len(store3_data['sources'])}, customers={len(store3_data['customers'])}")
            
            # Check for data overlap (this would indicate a leak)
            leaks_found = []
            
            # Check if Store 1 can see Store 3's packs
            store1_pack_ids = set(pack.get('id', '') for pack in store1_data['packs'])
            store3_pack_ids = set(pack.get('id', '') for pack in store3_data['packs'])
            pack_overlap = store1_pack_ids.intersection(store3_pack_ids)
            if pack_overlap:
                leaks_found.append(f"Pack overlap: {len(pack_overlap)} shared IDs")
            
            # Check if Store 1 can see Store 3's sources
            store1_source_ids = set(source.get('id', '') for source in store1_data['sources'])
            store3_source_ids = set(source.get('id', '') for source in store3_data['sources'])
            source_overlap = store1_source_ids.intersection(store3_source_ids)
            if source_overlap:
                leaks_found.append(f"Source overlap: {len(source_overlap)} shared IDs")
            
            # Check if Store 1 can see Store 3's customers
            store1_customer_ids = set(customer.get('id', '') for customer in store1_data['customers'])
            store3_customer_ids = set(customer.get('id', '') for customer in store3_data['customers'])
            customer_overlap = store1_customer_ids.intersection(store3_customer_ids)
            if customer_overlap:
                leaks_found.append(f"Customer overlap: {len(customer_overlap)} shared IDs")
            
            if leaks_found:
                self.log_test("Cross-Store Data Isolation", False, 
                            f"CRITICAL DATA LEAKS DETECTED: {', '.join(leaks_found)}")
                return False
            else:
                self.log_test("Cross-Store Data Isolation", True, 
                            f"No data overlap detected - stores are properly isolated")
                return True
                
        except Exception as e:
            self.log_test("Cross-Store Data Isolation", False, f"Exception: {str(e)}")
            return False
    
    def test_create_unique_data_in_store3(self):
        """Create unique data in Store 3 and verify Store 1 cannot see it"""
        try:
            # Create a unique provider in Store 3
            unique_id = str(datetime.now().timestamp()).replace('.', '')
            provider_data = {
                "name": f"LEAK_TEST_PROVIDER_{unique_id}",
                "discount_percent": 15.0,
                "commission_percent": 5.0
            }
            
            response = requests.post(f"{BACKEND_URL}/sources", json=provider_data, headers=self.store3_headers)
            if response.status_code not in [200, 201]:
                self.log_test("Create Unique Data Store 3", False, f"Could not create provider: {response.status_code}")
                return False
            
            created_provider = response.json()
            provider_id = created_provider["id"]
            
            # Verify Store 3 can see it
            store3_sources = requests.get(f"{BACKEND_URL}/sources", headers=self.store3_headers).json()
            store3_has_provider = any(s.get('id') == provider_id for s in store3_sources)
            
            if not store3_has_provider:
                self.log_test("Create Unique Data Store 3", False, "Store 3 cannot see its own created provider")
                return False
            
            # CRITICAL TEST: Verify Store 1 CANNOT see it
            store1_sources = requests.get(f"{BACKEND_URL}/sources", headers=self.store1_headers).json()
            store1_has_provider = any(s.get('id') == provider_id for s in store1_sources)
            
            if store1_has_provider:
                self.log_test("Create Unique Data Store 3", False, 
                            f"CRITICAL LEAK: Store 1 can see Store 3's provider {provider_id}")
                return False
            else:
                self.log_test("Create Unique Data Store 3", True, 
                            f"Store 3 created provider {provider_id}, Store 1 cannot see it (isolation working)")
                return True
                
        except Exception as e:
            self.log_test("Create Unique Data Store 3", False, f"Exception: {str(e)}")
            return False
    
    def test_create_unique_data_in_store1(self):
        """Create unique data in Store 1 and verify Store 3 cannot see it"""
        try:
            # Create a unique customer in Store 1
            unique_id = str(datetime.now().timestamp()).replace('.', '')
            customer_data = {
                "dni": f"LEAK{unique_id}X",
                "name": f"LEAK_TEST_CUSTOMER_{unique_id}",
                "phone": "999888777",
                "email": f"leak_test_{unique_id}@test.com",
                "address": "Test Address",
                "city": "Test City"
            }
            
            response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.store1_headers)
            if response.status_code not in [200, 201]:
                self.log_test("Create Unique Data Store 1", False, f"Could not create customer: {response.status_code}")
                return False
            
            created_customer = response.json()
            customer_id = created_customer["id"]
            customer_dni = created_customer["dni"]
            
            # Verify Store 1 can see it by ID (more reliable than list search for large datasets)
            store1_get_response = requests.get(f"{BACKEND_URL}/customers/{customer_id}", headers=self.store1_headers)
            store1_has_customer = store1_get_response.status_code == 200
            
            if not store1_has_customer:
                self.log_test("Create Unique Data Store 1", False, "Store 1 cannot see its own created customer by ID")
                return False
            
            # CRITICAL TEST: Verify Store 3 CANNOT see it by ID
            store3_get_response = requests.get(f"{BACKEND_URL}/customers/{customer_id}", headers=self.store3_headers)
            store3_has_customer = store3_get_response.status_code == 200
            
            # Also test by DNI
            store3_dni_response = requests.get(f"{BACKEND_URL}/customers/dni/{customer_dni}", headers=self.store3_headers)
            store3_has_customer_by_dni = store3_dni_response.status_code == 200
            
            if store3_has_customer or store3_has_customer_by_dni:
                self.log_test("Create Unique Data Store 1", False, 
                            f"CRITICAL LEAK: Store 3 can see Store 1's customer {customer_id} (by ID: {store3_has_customer}, by DNI: {store3_has_customer_by_dni})")
                return False
            else:
                self.log_test("Create Unique Data Store 1", True, 
                            f"Store 1 created customer {customer_id}, Store 3 cannot see it by ID or DNI (isolation working)")
                return True
                
        except Exception as e:
            self.log_test("Create Unique Data Store 1", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all cross-store leak tests"""
        print("🔍 STARTING CROSS-STORE DATA LEAK TEST - CRITICAL SECURITY VERIFICATION")
        print("Testing if stores can see each other's data (the real isolation test)")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate_both_stores():
            print("❌ Authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Test existing data isolation
        print("\n🔒 Testing existing data isolation...")
        existing_isolation = self.test_cross_store_isolation()
        
        # Step 3: Test creating new data in Store 3
        print("\n📝 Testing Store 3 → Store 1 isolation (create in Store 3, verify Store 1 can't see)...")
        store3_isolation = self.test_create_unique_data_in_store3()
        
        # Step 4: Test creating new data in Store 1
        print("\n📝 Testing Store 1 → Store 3 isolation (create in Store 1, verify Store 3 can't see)...")
        store1_isolation = self.test_create_unique_data_in_store1()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 CROSS-STORE DATA LEAK TEST RESULTS:")
        print("=" * 80)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ MULTI-TENANT ISOLATION IS SECURE!")
            print("🔒 NO CROSS-STORE DATA LEAKS DETECTED")
            return True
        else:
            print("❌ CRITICAL SECURITY BREACH: CROSS-STORE DATA LEAKS DETECTED!")
            print("🚨 IMMEDIATE ACTION REQUIRED!")
            return False

def main():
    """Main test execution"""
    tester = CrossStoreLeakTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Multi-tenant isolation is secure - no cross-store data leaks!")
        sys.exit(0)
    else:
        print("\n💥 CRITICAL SECURITY BREACH: Cross-store data leaks detected!")
        sys.exit(1)

if __name__ == "__main__":
    main()