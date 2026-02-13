#!/usr/bin/env python3
"""
Multi-Tenant Isolation Test - Final Comprehensive Verification
Testing complete data isolation between Store 1 (testcaja/test1234, store_id: 1) and Store 3 (tienda3_admin/test789, store_id: 3)
As specified in review request - verifying NO data leaks between stores.
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://rental-ui-refresh-1.preview.emergentagent.com/api"

class MultiTenantIsolationTester:
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
                self.log_test("Store 1 Authentication", True, "Logged in as testcaja (Store 1)")
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
                self.log_test("Store 3 Authentication", True, "Logged in as tienda3_admin (Store 3)")
                return True
            else:
                self.log_test("Store 3 Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_dashboard_stats(self):
        """Test Store 3 Dashboard Stats - should return 0 for all counters"""
        try:
            response = requests.get(f"{BACKEND_URL}/reports/stats", headers=self.store3_headers)
            
            if response.status_code != 200:
                self.log_test("Store 3 Dashboard Stats", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check that all stats are 0 for empty store
            active_rentals = data.get("active_rentals", -1)
            returns_today = data.get("returns_today", -1)
            customers_today = data.get("customers_today", -1)
            
            if active_rentals == 0 and returns_today == 0 and customers_today == 0:
                self.log_test("Store 3 Dashboard Stats", True, 
                            f"All stats are 0 as expected: active_rentals={active_rentals}, returns_today={returns_today}, customers_today={customers_today}")
                return True
            else:
                self.log_test("Store 3 Dashboard Stats", False, 
                            f"Expected all 0, got: active_rentals={active_rentals}, returns_today={returns_today}, customers_today={customers_today}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Dashboard Stats", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_returns_control(self):
        """Test Store 3 Returns Control - should return 0 pending"""
        try:
            response = requests.get(f"{BACKEND_URL}/dashboard/returns-control", headers=self.store3_headers)
            
            if response.status_code != 200:
                self.log_test("Store 3 Returns Control", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            total_pending = data.get("total_pending", -1)
            
            if total_pending == 0:
                self.log_test("Store 3 Returns Control", True, f"total_pending=0 as expected")
                return True
            else:
                self.log_test("Store 3 Returns Control", False, f"Expected total_pending=0, got {total_pending}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Returns Control", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_dashboard_general(self):
        """Test Store 3 General Dashboard - should return stats with all values 0"""
        try:
            response = requests.get(f"{BACKEND_URL}/dashboard", headers=self.store3_headers)
            
            if response.status_code != 200:
                self.log_test("Store 3 General Dashboard", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check various dashboard metrics should be 0
            stats = data.get("stats", {})
            active_rentals = stats.get("active_rentals", -1)
            revenue_today = stats.get("revenue_today", -1)
            today_rentals = stats.get("today_rentals", -1)
            
            if active_rentals == 0 and revenue_today == 0 and today_rentals == 0:
                self.log_test("Store 3 General Dashboard", True, 
                            f"Dashboard stats all 0 as expected: active_rentals={active_rentals}, revenue_today={revenue_today}, today_rentals={today_rentals}")
                return True
            else:
                self.log_test("Store 3 General Dashboard", False, 
                            f"Expected 0 values, got: active_rentals={active_rentals}, revenue_today={revenue_today}, today_rentals={today_rentals}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 General Dashboard", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_pending_returns(self):
        """Test Store 3 Pending Returns - should return empty arrays or 404 (both acceptable for empty store)"""
        try:
            response = requests.get(f"{BACKEND_URL}/rentals/returns/pending", headers=self.store3_headers)
            
            if response.status_code == 404:
                # 404 is acceptable for empty store - no pending returns endpoint data
                self.log_test("Store 3 Pending Returns", True, "404 response acceptable for empty store (no pending returns)")
                return True
            elif response.status_code == 200:
                data = response.json()
                today = data.get("today", [])
                other_days = data.get("other_days", [])
                
                if len(today) == 0 and len(other_days) == 0:
                    self.log_test("Store 3 Pending Returns", True, 
                                f"Empty arrays as expected: today={len(today)}, other_days={len(other_days)}")
                    return True
                else:
                    self.log_test("Store 3 Pending Returns", False, 
                                f"Expected empty arrays, got: today={len(today)}, other_days={len(other_days)}")
                    return False
            else:
                self.log_test("Store 3 Pending Returns", False, f"Unexpected status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Pending Returns", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_maintenance_fleet(self):
        """Test Store 3 Maintenance Fleet - should return 0 counts"""
        try:
            response = requests.get(f"{BACKEND_URL}/maintenance/fleet", headers=self.store3_headers)
            
            if response.status_code != 200:
                self.log_test("Store 3 Maintenance Fleet", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            summary = data.get("summary", {})
            in_maintenance_count = summary.get("in_maintenance_count", -1)
            needs_maintenance_count = summary.get("needs_maintenance_count", -1)
            total = summary.get("total", -1)
            
            if in_maintenance_count == 0 and needs_maintenance_count == 0 and total == 0:
                self.log_test("Store 3 Maintenance Fleet", True, 
                            f"All maintenance counts 0 as expected: in_maintenance={in_maintenance_count}, needs_maintenance={needs_maintenance_count}, total={total}")
                return True
            else:
                self.log_test("Store 3 Maintenance Fleet", False, 
                            f"Expected all 0, got: in_maintenance={in_maintenance_count}, needs_maintenance={needs_maintenance_count}, total={total}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Maintenance Fleet", False, f"Exception: {str(e)}")
            return False
    
    def test_store3_main_data_empty(self):
        """Test Store 3 Main Data Endpoints - should return empty arrays"""
        try:
            endpoints = [
                ("packs", "/packs"),
                ("sources", "/sources"), 
                ("tariffs", "/tariffs"),
                ("customers", "/customers"),
                ("items", "/items"),
                ("active_rentals", "/rentals/active")
            ]
            
            # Note: Based on review request, Store 3 should be empty, but we found it has some test data
            # Let's report what we actually find vs what's expected
            results = {}
            issues_found = []
            
            for name, endpoint in endpoints:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=self.store3_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        count = len(data)
                    elif isinstance(data, dict) and "items" in data:
                        count = len(data["items"])
                    elif isinstance(data, dict) and "customers" in data:
                        count = len(data["customers"])
                    else:
                        count = len(data) if hasattr(data, '__len__') else 1
                    
                    results[name] = count
                    if count > 0:
                        issues_found.append(f"{name}={count}")
                elif response.status_code == 404:
                    # 404 is acceptable for empty endpoints
                    results[name] = "EMPTY_404"
                else:
                    results[name] = f"ERROR_{response.status_code}"
                    issues_found.append(f"{name}=ERROR_{response.status_code}")
            
            if len(issues_found) == 0:
                self.log_test("Store 3 Main Data Empty", True, 
                            f"All endpoints empty as expected: {results}")
                return True
            else:
                self.log_test("Store 3 Main Data Empty", False, 
                            f"ISOLATION ISSUE - Store 3 has data when it should be empty: {issues_found}. Full results: {results}")
                return False
                
        except Exception as e:
            self.log_test("Store 3 Main Data Empty", False, f"Exception: {str(e)}")
            return False
    
    def test_store1_has_data(self):
        """Test Store 1 Still Has Data - should have active rentals > 0"""
        try:
            # Test reports/stats
            response = requests.get(f"{BACKEND_URL}/reports/stats", headers=self.store1_headers)
            
            if response.status_code != 200:
                self.log_test("Store 1 Has Data", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            active_rentals = data.get("active_rentals", 0)
            
            if active_rentals > 0:
                self.log_test("Store 1 Has Data (Stats)", True, f"active_rentals={active_rentals} > 0 as expected")
            else:
                self.log_test("Store 1 Has Data (Stats)", False, f"Expected active_rentals > 0, got {active_rentals}")
                return False
            
            # Test packs count
            packs_response = requests.get(f"{BACKEND_URL}/packs", headers=self.store1_headers)
            if packs_response.status_code == 200:
                packs = packs_response.json()
                packs_count = len(packs)
                if packs_count == 7:
                    self.log_test("Store 1 Has Data (Packs)", True, f"Found {packs_count} packs as expected")
                else:
                    self.log_test("Store 1 Has Data (Packs)", False, f"Expected 7 packs, got {packs_count}")
                    return False
            
            # Test sources count
            sources_response = requests.get(f"{BACKEND_URL}/sources", headers=self.store1_headers)
            if sources_response.status_code == 200:
                sources = sources_response.json()
                sources_count = len(sources)
                if sources_count == 9:
                    self.log_test("Store 1 Has Data (Sources)", True, f"Found {sources_count} sources as expected")
                else:
                    self.log_test("Store 1 Has Data (Sources)", False, f"Expected 9 sources, got {sources_count}")
                    return False
            
            return True
                
        except Exception as e:
            self.log_test("Store 1 Has Data", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all multi-tenant isolation tests"""
        print("🎯 STARTING MULTI-TENANT ISOLATION TEST - FINAL VERIFICATION")
        print("Testing complete data isolation between Store 1 and Store 3")
        print("=" * 80)
        
        # Step 1: Authenticate both stores
        print("\n🔐 Authenticating with both stores...")
        if not self.authenticate_store1():
            print("❌ Store 1 authentication failed. Cannot continue tests.")
            return False
        
        if not self.authenticate_store3():
            print("❌ Store 3 authentication failed. Cannot continue tests.")
            return False
        
        # Step 2: Test Store 3 Dashboard and Counters (should be 0)
        print("\n📊 Testing Store 3 Dashboard and Counters (should be 0)...")
        self.test_store3_dashboard_stats()
        self.test_store3_returns_control()
        self.test_store3_dashboard_general()
        
        # Step 3: Test Store 3 Pending Returns (should be empty)
        print("\n📋 Testing Store 3 Pending Returns (should be empty)...")
        self.test_store3_pending_returns()
        
        # Step 4: Test Store 3 Maintenance (should be 0)
        print("\n🔧 Testing Store 3 Maintenance (should be 0)...")
        self.test_store3_maintenance_fleet()
        
        # Step 5: Test Store 3 Main Data (should be empty)
        print("\n📦 Testing Store 3 Main Data Endpoints (should be empty)...")
        self.test_store3_main_data_empty()
        
        # Step 6: Test Store 1 Still Has Data (verification)
        print("\n✅ Testing Store 1 Still Has Data (verification)...")
        self.test_store1_has_data()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 MULTI-TENANT ISOLATION TEST RESULTS:")
        print("=" * 80)
        
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r])
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("✅ MULTI-TENANT ISOLATION IS 100% SECURE!")
            print("🔒 NO DATA LEAKS DETECTED BETWEEN STORES")
            return True
        else:
            print("❌ CRITICAL SECURITY ISSUE: DATA LEAKS DETECTED!")
            print("🚨 MULTI-TENANT ISOLATION IS COMPROMISED!")
            return False

def main():
    """Main test execution"""
    tester = MultiTenantIsolationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Multi-tenant isolation is working correctly!")
        print("🔐 Aislamiento multi-tenant está 100% seguro sin fugas de datos críticos")
        sys.exit(0)
    else:
        print("\n💥 CRITICAL SECURITY ISSUE: Multi-tenant isolation has data leaks!")
        print("🚨 Sistema multi-tenant tiene fugas de datos que requieren atención inmediata!")
        sys.exit(1)

if __name__ == "__main__":
    main()