"""
Test suite for Technical Data feature in Customer management
Tests the PATCH /customers/{id}/technical-data endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTechnicalDataEndpoint:
    """Tests for the technical data PATCH endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.customer_id = "78edbf2d-9513-498d-b2b6-8df257c27740"  # Erika Quijano Guerrero
        self.original_data = {
            "boot_size": "42",
            "height": "175",
            "weight": "70",
            "ski_level": "sin_especificar"
        }
        
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "testuser2", "password": "test123"}
        )
        assert login_response.status_code == 200, "Login failed"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        yield
        
        # Cleanup: Restore original data
        requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json=self.original_data,
            headers=self.headers
        )
    
    def test_get_customer_has_technical_data_fields(self):
        """Test that customer response includes technical data fields"""
        response = requests.get(
            f"{BASE_URL}/api/customers/{self.customer_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify technical data fields exist
        assert "boot_size" in data, "boot_size field missing"
        assert "height" in data, "height field missing"
        assert "weight" in data, "weight field missing"
        assert "ski_level" in data, "ski_level field missing"
        
        print(f"✓ Customer has technical data: boot_size={data['boot_size']}, height={data['height']}, weight={data['weight']}, ski_level={data['ski_level']}")
    
    def test_patch_technical_data_updates_all_fields(self):
        """Test that PATCH endpoint updates all technical data fields"""
        new_data = {
            "boot_size": "43",
            "height": "180",
            "weight": "75",
            "ski_level": "intermedio"
        }
        
        # Update technical data
        response = requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json=new_data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        updated = response.json()
        
        # Verify all fields were updated
        assert updated["boot_size"] == "43", f"boot_size not updated: {updated['boot_size']}"
        assert updated["height"] == "180", f"height not updated: {updated['height']}"
        assert updated["weight"] == "75", f"weight not updated: {updated['weight']}"
        assert updated["ski_level"] == "intermedio", f"ski_level not updated: {updated['ski_level']}"
        
        print("✓ All technical data fields updated successfully")
    
    def test_patch_technical_data_persists(self):
        """Test that updated technical data persists in database"""
        new_data = {
            "boot_size": "44",
            "height": "185",
            "weight": "80",
            "ski_level": "avanzado"
        }
        
        # Update technical data
        patch_response = requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json=new_data,
            headers=self.headers
        )
        assert patch_response.status_code == 200
        
        # Verify data persisted by fetching customer again
        get_response = requests.get(
            f"{BASE_URL}/api/customers/{self.customer_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["boot_size"] == "44", "boot_size not persisted"
        assert fetched["height"] == "185", "height not persisted"
        assert fetched["weight"] == "80", "weight not persisted"
        assert fetched["ski_level"] == "avanzado", "ski_level not persisted"
        
        print("✓ Technical data persisted correctly in database")
    
    def test_patch_partial_update(self):
        """Test that PATCH can update only some fields"""
        # Update only boot_size
        response = requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json={"boot_size": "45"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated["boot_size"] == "45", "boot_size not updated"
        
        # Other fields should remain unchanged
        assert updated["height"] == self.original_data["height"], "height was changed unexpectedly"
        
        print("✓ Partial update works correctly")
    
    def test_patch_invalid_customer_returns_404(self):
        """Test that PATCH with invalid customer ID returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/customers/invalid-customer-id/technical-data",
            json={"boot_size": "42"},
            headers=self.headers
        )
        
        assert response.status_code == 404
        print("✓ Invalid customer ID returns 404")
    
    def test_patch_without_auth_returns_401(self):
        """Test that PATCH without authentication returns 401"""
        response = requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json={"boot_size": "42"},
            headers={"Content-Type": "application/json"}  # No auth header
        )
        
        assert response.status_code == 401
        print("✓ Unauthenticated request returns 401")
    
    def test_ski_level_accepts_valid_values(self):
        """Test that ski_level accepts all valid values"""
        valid_levels = ["sin_especificar", "principiante", "intermedio", "avanzado", "experto"]
        
        for level in valid_levels:
            response = requests.patch(
                f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
                json={"ski_level": level},
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed for ski_level={level}"
            assert response.json()["ski_level"] == level
        
        print(f"✓ All valid ski levels accepted: {valid_levels}")
    
    def test_boot_size_accepts_decimal_values(self):
        """Test that boot_size accepts decimal values like 27.5"""
        response = requests.patch(
            f"{BASE_URL}/api/customers/{self.customer_id}/technical-data",
            json={"boot_size": "27.5"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        assert response.json()["boot_size"] == "27.5"
        print("✓ Boot size accepts decimal values (27.5)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
