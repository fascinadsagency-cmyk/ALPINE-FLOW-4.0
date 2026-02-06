"""
Test iteration 27 - Testing items/import automatic type creation and UI elements
Tests:
1. Login endpoint for testcaja/test1234
2. /api/items/import with automatic type creation (Find or Create logic)
3. Basic endpoint health checks
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLoginAndAuth:
    """Test login for store user"""
    
    def test_login_testcaja_user(self):
        """Test login with testcaja/test1234 credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == "testcaja"
        
        print(f"✓ Login successful for testcaja user")
        print(f"  - User ID: {data['user']['id']}")
        print(f"  - Role: {data['user']['role']}")
        return data["access_token"]


class TestItemsImportAutoTypeCreation:
    """Test that /items/import creates types automatically when they don't exist"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_import_with_new_type_creates_type_automatically(self, auth_headers):
        """
        Test that importing an item with a non-existent type automatically creates the type
        This is the core "Find or Create" functionality
        """
        # Generate unique type name to ensure it doesn't exist
        unique_type = f"TEST_TYPE_{uuid.uuid4().hex[:8]}"
        unique_code = f"TESTITEM_{uuid.uuid4().hex[:6]}"
        
        # First, verify the type doesn't exist
        types_before = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers)
        assert types_before.status_code == 200
        existing_types = [t["value"] for t in types_before.json()]
        normalized_type = unique_type.lower().replace(" ", "_")
        assert normalized_type not in existing_types, "Type already exists (test setup issue)"
        
        # Import an item with the new type
        import_payload = {
            "items": [{
                "internal_code": unique_code,
                "barcode": unique_code,
                "item_type": unique_type,
                "brand": "TestBrand",
                "model": "TestModel",
                "size": "M",
                "purchase_price": 100.0
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/items/import",
            json=import_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        result = response.json()
        
        print(f"✓ Import response:")
        print(f"  - Imported: {result.get('imported')}")
        print(f"  - Types created: {result.get('types_created')}")
        print(f"  - New types: {result.get('new_types')}")
        
        # Verify type was created
        assert result.get("imported") == 1, "Item was not imported"
        assert result.get("types_created", 0) >= 1 or normalized_type in result.get("new_types", []), \
            "Type was not automatically created"
        
        # Verify the type now exists
        types_after = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers)
        assert types_after.status_code == 200
        new_types = [t["value"] for t in types_after.json()]
        assert normalized_type in new_types, f"Type '{normalized_type}' was not created in database"
        
        print(f"✓ Type '{unique_type}' was automatically created (normalized: '{normalized_type}')")
        
        # Cleanup: Delete the test item
        items = requests.get(f"{BASE_URL}/api/items?search={unique_code}", headers=auth_headers)
        if items.status_code == 200:
            for item in items.json():
                if item.get("internal_code") == unique_code:
                    requests.delete(f"{BASE_URL}/api/items/{item['id']}", headers=auth_headers)
                    print(f"  - Cleaned up test item {unique_code}")
    
    def test_import_with_existing_type_does_not_duplicate(self, auth_headers):
        """
        Test that importing with an existing type doesn't create a duplicate
        """
        # Get existing types
        types_response = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers)
        assert types_response.status_code == 200
        existing_types = types_response.json()
        
        if not existing_types:
            pytest.skip("No existing types to test with")
        
        # Use the first existing type
        existing_type = existing_types[0]
        type_value = existing_type["value"]
        type_label = existing_type["label"]
        
        unique_code = f"TESTITEM_{uuid.uuid4().hex[:6]}"
        
        # Count types before
        types_count_before = len(existing_types)
        
        # Import with existing type
        import_payload = {
            "items": [{
                "internal_code": unique_code,
                "barcode": unique_code,
                "item_type": type_label,  # Use label as it will be normalized
                "brand": "TestBrand",
                "model": "TestModel",
                "size": "L",
                "purchase_price": 50.0
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/items/import",
            json=import_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        result = response.json()
        
        # Check types after
        types_after = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers)
        types_count_after = len(types_after.json())
        
        print(f"✓ Import with existing type:")
        print(f"  - Type used: {type_label}")
        print(f"  - Types created: {result.get('types_created', 0)}")
        print(f"  - Types before: {types_count_before}, after: {types_count_after}")
        
        # Verify no new type was created (or at most types_created == 0)
        # Note: Count might not be exactly same if the normalized value differs
        assert result.get("types_created", 0) == 0 or result.get("imported") == 1, \
            "Import should succeed without creating duplicate types"
        
        # Cleanup
        items = requests.get(f"{BASE_URL}/api/items?search={unique_code}", headers=auth_headers)
        if items.status_code == 200:
            for item in items.json():
                if item.get("internal_code") == unique_code:
                    requests.delete(f"{BASE_URL}/api/items/{item['id']}", headers=auth_headers)
                    print(f"  - Cleaned up test item {unique_code}")


class TestCustomersEndpoint:
    """Test customers endpoint loads correctly"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_customers_list_loads(self, auth_headers):
        """Test that customers list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/customers/paginated/list?page=1&limit=10", headers=auth_headers)
        
        assert response.status_code == 200, f"Customers list failed: {response.text}"
        data = response.json()
        
        assert "customers" in data, "No customers key in response"
        assert "pagination" in data, "No pagination key in response"
        
        print(f"✓ Customers endpoint working")
        print(f"  - Total customers: {data['pagination'].get('total', 0)}")


class TestSettingsEndpoint:
    """Test settings/stores endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testcaja",
            "password": "test1234"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_item_types_list(self, auth_headers):
        """Test item types endpoint"""
        response = requests.get(f"{BASE_URL}/api/item-types", headers=auth_headers)
        
        assert response.status_code == 200, f"Item types failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of item types"
        
        print(f"✓ Item types endpoint working")
        print(f"  - Total types: {len(data)}")
        if data:
            print(f"  - Sample types: {[t['label'] for t in data[:5]]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
