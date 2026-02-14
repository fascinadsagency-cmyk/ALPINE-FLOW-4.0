#!/usr/bin/env python3
"""
Comprehensive Multi-Tenant Isolation Test
Testing complete data isolation between stores as specified in review request.

Test Credentials:
- Store 1 (principal): testcaja / test1234 (store_id: 1)
- Store 3 (nueva vacía): tienda3_admin / test789 (store_id: 3)
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://skiflow-ui-refresh.preview.emergentagent.com/api"

class MultiTenantTester:
    def __init__(self):
        self.store1_token = None
        self.store3_token = None
        self.store1_headers = {}
        self.store3_headers = {}
        self.test_results = []
        self.store3_initial_sources = 0
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def authenticate_store1(self):
        """Authenticate with Store 1 (testcaja/test1234)"""
        try:
            login_data = {
                "username": "testcaja",
                "password": "test1234"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.store1_token = data["access_token"]
                self.store1_headers = {"Authorization": f"Bearer {self.store1_token}"}
                self.log_test("Store 1 Authentication", True, f"Logged in as {login_data['username']} (Store 1)")
                return True
            else:
                self.log_test("Store 1 Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Store 1 Authentication", False, f"Exception: {str(e)}")
            return False
    
    def authenticate_store3(self):
        """Authenticate with Store 3 (tienda3_admin/test789)"""
        try:
            login_data = {
                "username": "tienda3_admin",
                "password": "test789"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.store3_token = data["access_token"]
                self.store3_headers = {"Authorization": f"Bearer {self.store3_token}"}
                self.log_test("Store 3 Authentication", True, f"Logged in as {login_data['username']} (Store 3)")
                return True
            else:
                self.log_test("Store 3 Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_empty_data(self):
        """Test 1-7: Verify Store 3 has empty data for all collections"""
        endpoints_expected = [
            ("/packs", 0, "packs"),
            ("/tariffs", 0, "tarifas"),
            ("/item-types", 0, "tipos personalizados"),
            ("/customers", 0, "clientes"),
            ("/items", 0, "artículos")
        ]
        
        all_passed = True
        
        # First get the current count of sources to establish baseline
        try:
            response = requests.get(f"{BACKEND_URL}/sources", headers=self.store3_headers)
            if response.status_code == 200:
                sources_data = response.json()
                self.store3_initial_sources = len(sources_data)
                self.log_test("Store 3 Initial Sources Count", True, 
                            f"Store 3 has {self.store3_initial_sources} existing sources")
            else:
                self.store3_initial_sources = 0
                self.log_test("Store 3 Initial Sources Count", False, 
                            f"Could not get sources: {response.status_code}")
        except Exception as e:
            self.store3_initial_sources = 0
            self.log_test("Store 3 Initial Sources Count", False, f"Exception: {str(e)}")
        
        for endpoint, expected_count, description in endpoints_expected:
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=self.store3_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    actual_count = len(data) if isinstance(data, list) else 0
                    
                    if actual_count == expected_count:
                        self.log_test(f"Store 3 Empty {description.title()}", True, 
                                    f"GET {endpoint} returns {actual_count} {description} (expected)")
                    else:
                        self.log_test(f"Store 3 Empty {description.title()}", False, 
                                    f"GET {endpoint} returns {actual_count} {description}, expected {expected_count}")
                        all_passed = False
                else:
                    self.log_test(f"Store 3 Empty {description.title()}", False, 
                                f"GET {endpoint} failed: {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Store 3 Empty {description.title()}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_store1_existing_data(self):
        """Test 8-11: Verify Store 1 has existing data"""
        endpoints_expected = [
            ("/packs", 7, "packs"),
            ("/sources", 9, "proveedores"),
            ("/tariffs", 13, "tarifas")
        ]
        
        all_passed = True
        
        for endpoint, expected_count, description in endpoints_expected:
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=self.store1_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    actual_count = len(data) if isinstance(data, list) else 0
                    
                    if actual_count == expected_count:
                        self.log_test(f"Store 1 Existing {description.title()}", True, 
                                    f"GET {endpoint} returns {actual_count} {description} (expected)")
                    else:
                        self.log_test(f"Store 1 Existing {description.title()}", False, 
                                    f"GET {endpoint} returns {actual_count} {description}, expected {expected_count}")
                        all_passed = False
                else:
                    self.log_test(f"Store 1 Existing {description.title()}", False, 
                                f"GET {endpoint} failed: {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Store 1 Existing {description.title()}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_store3_create_provider(self):
        """Test 12: Create provider in Store 3"""
        try:
            # Use a unique name with timestamp to avoid conflicts
            import time
            timestamp = int(time.time())
            
            provider_data = {
                "name": f"Proveedor Test Store 3 - {timestamp}",
                "discount_percent": 15.0,
                "commission_percent": 5.0,
                "contact_info": "test@store3.com",
                "notes": "Proveedor creado para test de aislamiento"
            }
            
            response = requests.post(f"{BACKEND_URL}/sources", json=provider_data, headers=self.store3_headers)
            
            if response.status_code in [200, 201]:
                created_provider = response.json()
                self.store3_provider_id = created_provider.get("id")
                self.log_test("Store 3 Create Provider", True, 
                            f"Provider created successfully: {created_provider.get('name')}")
                return True
            else:
                self.log_test("Store 3 Create Provider", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Create Provider", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_provider_isolation(self):
        """Test 13: Verify Store 3 provider is not visible to Store 1"""
        try:
            # Check Store 3 can see the provider
            response3 = requests.get(f"{BACKEND_URL}/sources", headers=self.store3_headers)
            
            if response3.status_code == 200:
                store3_providers = response3.json()
                store3_count = len(store3_providers)
                expected_count = self.store3_initial_sources + 1  # Initial + newly created
                
                if store3_count == expected_count:
                    self.log_test("Store 3 Provider Visibility", True, 
                                f"Store 3 sees {store3_count} providers (expected {expected_count})")
                else:
                    self.log_test("Store 3 Provider Visibility", False, 
                                f"Store 3 sees {store3_count} providers, expected {expected_count}")
                    return False
            else:
                self.log_test("Store 3 Provider Visibility", False, 
                            f"Could not get Store 3 providers: {response3.status_code}")
                return False
            
            # Check Store 1 still sees only its providers (should be 9)
            response1 = requests.get(f"{BACKEND_URL}/sources", headers=self.store1_headers)
            
            if response1.status_code == 200:
                store1_providers = response1.json()
                store1_count = len(store1_providers)
                
                if store1_count == 9:
                    self.log_test("Store 1 Provider Isolation", True, 
                                f"Store 1 still sees 9 providers (isolation working)")
                    return True
                else:
                    self.log_test("Store 1 Provider Isolation", False, 
                                f"Store 1 sees {store1_count} providers, expected 9 (isolation failed)")
                    return False
            else:
                self.log_test("Store 1 Provider Isolation", False, 
                            f"Could not get Store 1 providers: {response1.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Provider Isolation", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_create_pack(self):
        """Test 14: Create pack in Store 3"""
        try:
            pack_data = {
                "name": "Pack Test Store 3",
                "description": "Pack de prueba para Store 3",
                "items": ["ski", "boots"],
                "day_1": 50.0,
                "day_2": 45.0,
                "day_3": 40.0,
                "day_4": 38.0,
                "day_5": 36.0,
                "day_6": 34.0,
                "day_7": 32.0,
                "day_8": 30.0,
                "day_9": 28.0,
                "day_10": 26.0,
                "day_11_plus": 25.0
            }
            
            response = requests.post(f"{BACKEND_URL}/packs", json=pack_data, headers=self.store3_headers)
            
            if response.status_code in [200, 201]:
                created_pack = response.json()
                self.store3_pack_id = created_pack.get("id")
                self.log_test("Store 3 Create Pack", True, 
                            f"Pack created successfully: {created_pack.get('name')}")
                return True
            else:
                self.log_test("Store 3 Create Pack", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Create Pack", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_pack_isolation(self):
        """Test 15: Verify Store 3 pack is not visible to Store 1"""
        try:
            # Check Store 3 can see the pack
            response3 = requests.get(f"{BACKEND_URL}/packs", headers=self.store3_headers)
            
            if response3.status_code == 200:
                store3_packs = response3.json()
                store3_count = len(store3_packs)
                
                if store3_count == 1:
                    self.log_test("Store 3 Pack Visibility", True, 
                                f"Store 3 sees 1 pack (its own)")
                else:
                    self.log_test("Store 3 Pack Visibility", False, 
                                f"Store 3 sees {store3_count} packs, expected 1")
                    return False
            else:
                self.log_test("Store 3 Pack Visibility", False, 
                            f"Could not get Store 3 packs: {response3.status_code}")
                return False
            
            # Check Store 1 still sees only its packs (should be 7)
            response1 = requests.get(f"{BACKEND_URL}/packs", headers=self.store1_headers)
            
            if response1.status_code == 200:
                store1_packs = response1.json()
                store1_count = len(store1_packs)
                
                if store1_count == 7:
                    self.log_test("Store 1 Pack Isolation", True, 
                                f"Store 1 still sees 7 packs (isolation working)")
                    return True
                else:
                    self.log_test("Store 1 Pack Isolation", False, 
                                f"Store 1 sees {store1_count} packs, expected 7 (isolation failed)")
                    return False
            else:
                self.log_test("Store 1 Pack Isolation", False, 
                            f"Could not get Store 1 packs: {response1.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Pack Isolation", False, f"Exception: {str(e)}")
            return False
    
    def test_store1_functionality_regression(self):
        """Test 16: Verify Store 1 functionality still works (no regressions)"""
        endpoints_to_test = [
            ("/dashboard", "dashboard statistics"),
            ("/rentals?status=active", "active rentals")
        ]
        
        all_passed = True
        
        for endpoint, description in endpoints_to_test:
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=self.store1_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Store 1 {description.title()}", True, 
                                f"GET {endpoint} working correctly")
                else:
                    self.log_test(f"Store 1 {description.title()}", False, 
                                f"GET {endpoint} failed: {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Store 1 {description.title()}", False, f"Exception: {str(e)}")
                all_passed = False
        
        # Test customer creation in Store 1
        try:
            customer_data = {
                "dni": "87654321X",
                "name": "Cliente Test Store 1",
                "phone": "666111222",
                "email": "test@store1.com",
                "address": "Calle Test 456",
                "city": "Madrid"
            }
            
            response = requests.post(f"{BACKEND_URL}/customers", json=customer_data, headers=self.store1_headers)
            
            if response.status_code in [200, 201]:
                self.log_test("Store 1 Customer Creation", True, "Customer created successfully in Store 1")
            elif response.status_code == 400 and "already exists" in response.text:
                self.log_test("Store 1 Customer Creation", True, "Customer already exists in Store 1 (expected)")
            else:
                self.log_test("Store 1 Customer Creation", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                all_passed = False
                
        except Exception as e:
            self.log_test("Store 1 Customer Creation", False, f"Exception: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all multi-tenant isolation tests"""
        print("🎯 STARTING MULTI-TENANT ISOLATION TESTING")
        print("=" * 70)
        
        # Step 1: Authentication for both stores
        print("\n🔐 Authenticating with both stores...")
        if not self.authenticate_store1():
            print("❌ Store 1 authentication failed. Cannot continue tests.")
            return False
        
        if not self.authenticate_store3():
            print("❌ Store 3 authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Test Store 3 empty data (Tests 1-7)
        print("\n🏪 Testing Store 3 empty data isolation...")
        store3_empty = self.test_store3_empty_data()
        
        # Step 3: Test Store 1 existing data (Tests 8-11)
        print("\n🏪 Testing Store 1 existing data...")
        store1_existing = self.test_store1_existing_data()
        
        # Step 4: Test Store 3 provider creation and isolation (Tests 12-13)
        print("\n👥 Testing provider creation and isolation...")
        store3_provider_created = self.test_store3_create_provider()
        if store3_provider_created:
            provider_isolation = self.test_store3_provider_isolation()
        else:
            provider_isolation = False
        
        # Step 5: Test Store 3 pack creation and isolation (Tests 14-15)
        print("\n📦 Testing pack creation and isolation...")
        store3_pack_created = self.test_store3_create_pack()
        if store3_pack_created:
            pack_isolation = self.test_store3_pack_isolation()
        else:
            pack_isolation = False
        
        # Step 6: Test Store 1 functionality regression (Test 16)
        print("\n🔄 Testing Store 1 functionality (no regressions)...")
        store1_regression = self.test_store1_functionality_regression()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 MULTI-TENANT ISOLATION TEST RESULTS:")
        print("=" * 70)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        # Critical isolation checks
        critical_tests = [
            store3_empty,
            store1_existing,
            provider_isolation,
            pack_isolation,
            store1_regression
        ]
        
        critical_passed = sum(critical_tests)
        
        if critical_passed == len(critical_tests):
            print("✅ ALL CRITICAL MULTI-TENANT ISOLATION TESTS PASSED!")
            print("🎉 Data isolation is working correctly between stores!")
            return True
        else:
            print("❌ CRITICAL MULTI-TENANT ISOLATION ISSUES FOUND!")
            print("💥 Data isolation is NOT working correctly!")
            return False

def main():
    """Main test execution"""
    tester = MultiTenantTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Multi-tenant isolation is working correctly!")
        print("✅ Store 1 and Store 3 data are properly isolated")
        print("✅ No data leakage between stores detected")
        print("✅ All functionality working without regressions")
        sys.exit(0)
    else:
        print("\n💥 Multi-tenant isolation has CRITICAL issues!")
        print("❌ Data isolation failure detected")
        print("❌ Immediate attention required")
        sys.exit(1)

if __name__ == "__main__":
    main()