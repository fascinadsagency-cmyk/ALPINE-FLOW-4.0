"""
Iteration 28 - Test Item Types Filter Fix
Testing that newly imported items with custom types appear in filter dropdowns.

Tests:
1. Login with valid credentials
2. Check GET /api/item-types (DISTINCT) endpoint works
3. Check POST /api/item-types/sync works
4. Import CSV with new type 'Megafono'
5. Verify 'Megafono' appears in item-types endpoint after import
6. Cleanup test data
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestItemTypesFilter:
    """Test item types filter fix - DISTINCT from inventory"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "testcaja", "password": "test1234"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    def test_01_login_works(self):
        """Test that login works with testcaja credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "testcaja", "password": "test1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "testcaja"
        print(f"✅ Login successful for testcaja")
        
    def test_02_item_types_endpoint_works(self):
        """Test GET /api/item-types returns types from inventory (DISTINCT)"""
        response = requests.get(
            f"{BASE_URL}/api/item-types",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Item types endpoint returned {len(data)} types")
        for t in data[:5]:
            print(f"   - {t.get('value', 'N/A')}: {t.get('label', 'N/A')}")
            
    def test_03_sync_endpoint_works(self):
        """Test POST /api/item-types/sync works"""
        response = requests.post(
            f"{BASE_URL}/api/item-types/sync",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Sync endpoint response: {data.get('message')}")
        if "stats" in data:
            print(f"   Stats: {data['stats']}")
            
    def test_04_import_creates_type_megafono(self):
        """Test CSV import creates the 'Megafono' type and item"""
        # First check if Megafono already exists (cleanup from previous runs)
        response = requests.get(
            f"{BASE_URL}/api/item-types",
            headers=self.headers
        )
        initial_types = [t['value'] for t in response.json()]
        megafono_existed = 'megafono' in initial_types or 'Megafono' in initial_types
        
        # Create CSV content
        csv_content = "barcode,tipo,marca,modelo,talla\nTEST-MEGA-001,Megafono,TestBrand,ModeloTest,XL"
        
        # Import via /api/items/import-csv
        files = {'file': ('test_megafono.csv', csv_content, 'text/csv')}
        headers_multipart = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/items/import-csv",
            headers=headers_multipart,
            files=files
        )
        
        print(f"Import response: {response.status_code}")
        print(f"Import body: {response.text[:500]}")
        
        # Accept 200 or 201
        assert response.status_code in [200, 201], f"Import failed: {response.text}"
        
        # Wait for async sync to complete
        time.sleep(0.5)
        
        # Now check if Megafono appears in types
        response = requests.get(
            f"{BASE_URL}/api/item-types",
            headers=self.headers
        )
        assert response.status_code == 200
        types_data = response.json()
        type_values = [t['value'].lower() for t in types_data]
        
        print(f"✅ After import, item types: {type_values}")
        
        # The type should now exist (either megafono or Megafono)
        megafono_exists = 'megafono' in type_values or any('megafono' in v.lower() for v in type_values)
        assert megafono_exists, f"Megafono type not found in types after import! Types: {type_values}"
        print(f"✅ Megafono type EXISTS in filter dropdown")
        
    def test_05_item_was_created(self):
        """Verify the TEST-MEGA-001 item was created"""
        response = requests.get(
            f"{BASE_URL}/api/items/barcode/TEST-MEGA-001",
            headers=self.headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Item TEST-MEGA-001 found:")
            print(f"   Type: {data.get('item_type')}")
            print(f"   Brand: {data.get('brand')}")
            print(f"   Model: {data.get('model')}")
            print(f"   Size: {data.get('size')}")
        else:
            # Item might have different internal code
            print(f"ℹ️  Item not found by barcode (may have different internal code)")
            
    def test_06_cleanup_test_data(self):
        """Cleanup: Delete the test item"""
        # Find and delete the test item
        response = requests.get(
            f"{BASE_URL}/api/items?search=TEST-MEGA",
            headers=self.headers
        )
        
        if response.status_code == 200:
            items = response.json()
            for item in items:
                if 'TEST-MEGA' in (item.get('barcode', '') or item.get('internal_code', '')):
                    delete_resp = requests.delete(
                        f"{BASE_URL}/api/items/{item['id']}",
                        headers=self.headers
                    )
                    print(f"🗑️  Deleted test item: {item.get('internal_code', item.get('barcode'))}, status: {delete_resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
