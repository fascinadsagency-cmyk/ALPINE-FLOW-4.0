"""
Test Inventory Import Feature
- POST /api/items/import endpoint
- Duplicate detection by internal_code
- Required fields validation (internal_code, item_type, brand, size)
- String type validation for size field
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInventoryImport:
    """Test inventory import functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test_packs_user",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Generate unique test codes for this test run
        self.test_id = str(uuid.uuid4())[:8].upper()
        self.test_codes = [
            f"IMPTEST{self.test_id}A",
            f"IMPTEST{self.test_id}B",
            f"IMPTEST{self.test_id}C"
        ]
        yield
        
        # Cleanup: Delete test items
        for code in self.test_codes:
            try:
                # Find item by internal_code
                items_resp = self.session.get(f"{BASE_URL}/api/items?search={code}")
                if items_resp.status_code == 200:
                    items = items_resp.json()
                    for item in items:
                        if item.get('internal_code') == code:
                            self.session.delete(f"{BASE_URL}/api/items/{item['id']}")
            except:
                pass
    
    def test_import_items_success(self):
        """Test importing new items successfully"""
        items_to_import = [
            {
                "internal_code": self.test_codes[0],
                "item_type": "ski",
                "brand": "Salomon",
                "model": "X-Max",
                "size": "170",
                "category": "ALTA"
            },
            {
                "internal_code": self.test_codes[1],
                "item_type": "boots",
                "brand": "Atomic",
                "model": "Hawx",
                "size": "27.5",
                "category": "MEDIA"
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items_to_import
        })
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "imported" in data
        assert "duplicates" in data
        assert "errors" in data
        
        # Should import 2 items
        assert data["imported"] == 2, f"Expected 2 imported, got {data['imported']}"
        assert data["duplicates"] == 0
        assert data["errors"] == 0
        
        # Verify items were created
        for code in self.test_codes[:2]:
            get_resp = self.session.get(f"{BASE_URL}/api/items?search={code}")
            assert get_resp.status_code == 200
            items = get_resp.json()
            assert len(items) > 0, f"Item {code} not found after import"
        
        print(f"✅ Import success: {data['imported']} items imported")
    
    def test_import_detects_duplicates_by_internal_code(self):
        """Test that import detects duplicates by internal_code"""
        # First import
        first_import = [
            {
                "internal_code": self.test_codes[2],
                "item_type": "helmet",
                "brand": "POC",
                "model": "Obex",
                "size": "M"
            }
        ]
        
        response1 = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": first_import
        })
        assert response1.status_code == 200
        assert response1.json()["imported"] == 1
        
        # Second import with same internal_code (should be detected as duplicate)
        second_import = [
            {
                "internal_code": self.test_codes[2],  # Same internal_code
                "item_type": "helmet",
                "brand": "Different Brand",
                "model": "Different Model",
                "size": "L"
            }
        ]
        
        response2 = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": second_import
        })
        
        assert response2.status_code == 200
        data = response2.json()
        
        assert data["imported"] == 0, "Should not import duplicate"
        assert data["duplicates"] == 1, "Should detect 1 duplicate"
        assert self.test_codes[2] in data.get("duplicate_codes", []), "Should list duplicate code"
        
        print(f"✅ Duplicate detection works: {data['duplicates']} duplicates detected")
    
    def test_import_with_string_size(self):
        """Test that size field accepts string values"""
        unique_code = f"STRSIZE{self.test_id}"
        self.test_codes.append(unique_code)
        
        items = [
            {
                "internal_code": unique_code,
                "item_type": "helmet",
                "brand": "Smith",
                "model": "Vantage",
                "size": "M"  # String size
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items
        })
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data["imported"] == 1, "Should import item with string size"
        
        print("✅ Import with string size works correctly")
    
    def test_import_with_numeric_size_as_string(self):
        """Test that numeric size values work when passed as strings"""
        unique_code = f"NUMSIZE{self.test_id}"
        self.test_codes.append(unique_code)
        
        items = [
            {
                "internal_code": unique_code,
                "item_type": "ski",
                "brand": "Fischer",
                "model": "RC4",
                "size": "180"  # Numeric value as string
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items
        })
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data["imported"] == 1, "Should import item with numeric size as string"
        
        print("✅ Import with numeric size as string works correctly")
    
    def test_import_rejects_numeric_size(self):
        """Test that numeric size values (not strings) are rejected"""
        items = [
            {
                "internal_code": f"NUMREJ{self.test_id}",
                "item_type": "ski",
                "brand": "Test",
                "model": "Test",
                "size": 180  # Numeric value (not string) - should fail
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items
        })
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        print("✅ Backend correctly rejects numeric size values")
    
    def test_import_requires_all_mandatory_fields(self):
        """Test that all mandatory fields are required"""
        # Missing internal_code
        items_no_code = [
            {
                "item_type": "ski",
                "brand": "Test",
                "size": "170"
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items_no_code
        })
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected 422 for missing internal_code, got {response.status_code}"
        
        print("✅ Backend correctly validates required fields")
    
    def test_import_with_category(self):
        """Test that category field is properly handled"""
        unique_code = f"CATTEST{self.test_id}"
        self.test_codes.append(unique_code)
        
        items = [
            {
                "internal_code": unique_code,
                "item_type": "ski",
                "brand": "Rossignol",
                "model": "Experience",
                "size": "175",
                "category": "SUPERIOR"
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/items/import", json={
            "items": items
        })
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data["imported"] == 1
        
        # Verify category was saved
        get_resp = self.session.get(f"{BASE_URL}/api/items?search={unique_code}")
        assert get_resp.status_code == 200
        items = get_resp.json()
        assert len(items) > 0
        assert items[0]["category"] == "SUPERIOR"
        
        print("✅ Import with category works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
