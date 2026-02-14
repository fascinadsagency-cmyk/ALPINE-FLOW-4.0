"""
Test suite for profile photo persistence bug fix (Iteration 39)
Tests that photo_url is properly returned by /auth/login and /auth/me endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhotoPersistence:
    """Tests for photo_url persistence in auth endpoints"""
    
    @pytest.fixture
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def admin_credentials(self):
        """Admin master credentials"""
        return {"username": "admin_master", "password": "admin123"}
    
    @pytest.fixture
    def auth_token(self, api_client, admin_credentials):
        """Get authentication token for admin_master"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json=admin_credentials
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_login_returns_photo_url(self, api_client, admin_credentials):
        """
        Test 1: POST /api/auth/login returns photo_url in user object
        BUG FIX: UserResponse model was missing photo_url field
        """
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json=admin_credentials
        )
        
        # Status check
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        
        data = response.json()
        
        # Verify user object exists
        assert "user" in data, "Response missing 'user' object"
        user = data["user"]
        
        # Verify required fields exist
        assert "id" in user, "User missing 'id' field"
        assert "username" in user, "User missing 'username' field"
        assert "role" in user, "User missing 'role' field"
        
        # CRITICAL: Verify photo_url field exists (the bug fix)
        assert "photo_url" in user, "BUG NOT FIXED: User missing 'photo_url' field"
        
        # Verify email field exists (also added in fix)
        assert "email" in user, "User missing 'email' field"
        
        # Verify photo_url has base64 data for admin_master
        photo_url = user.get("photo_url", "")
        assert photo_url, "photo_url is empty - admin_master should have a photo"
        assert photo_url.startswith("data:image/"), f"photo_url should be base64 data URL, got: {photo_url[:50]}..."
        
        print(f"✓ Login returns photo_url with {len(photo_url)} chars of base64 data")
    
    def test_auth_me_returns_photo_url(self, api_client, auth_token):
        """
        Test 2: GET /api/auth/me returns photo_url field
        BUG FIX: UserResponse model filtered out photo_url
        """
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Status check
        assert response.status_code == 200, f"Auth/me failed with status {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "id" in data, "Response missing 'id' field"
        assert "username" in data, "Response missing 'username' field"
        assert "role" in data, "Response missing 'role' field"
        
        # CRITICAL: Verify photo_url field exists (the bug fix)
        assert "photo_url" in data, "BUG NOT FIXED: Response missing 'photo_url' field"
        
        # Verify email field exists (also added in fix)
        assert "email" in data, "Response missing 'email' field"
        
        # Verify photo_url has base64 data
        photo_url = data.get("photo_url", "")
        assert photo_url, "photo_url is empty - admin_master should have a photo"
        assert photo_url.startswith("data:image/"), f"photo_url should be base64 data URL"
        
        print(f"✓ Auth/me returns photo_url with {len(photo_url)} chars of base64 data")
    
    def test_login_user_response_structure(self, api_client, admin_credentials):
        """
        Test 3: Verify complete UserResponse structure after fix
        """
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json=admin_credentials
        )
        
        assert response.status_code == 200
        data = response.json()
        user = data["user"]
        
        # Verify all expected fields in UserResponse
        expected_fields = ["id", "username", "role", "email", "photo_url"]
        for field in expected_fields:
            assert field in user, f"UserResponse missing field: {field}"
        
        # Verify field types
        assert isinstance(user["id"], str), "id should be string"
        assert isinstance(user["username"], str), "username should be string"
        assert isinstance(user["role"], str), "role should be string"
        assert isinstance(user.get("email"), (str, type(None))), "email should be string or None"
        assert isinstance(user.get("photo_url"), (str, type(None))), "photo_url should be string or None"
        
        print(f"✓ UserResponse has all expected fields: {expected_fields}")
    
    def test_access_token_returned(self, api_client, admin_credentials):
        """
        Test 4: Verify login returns access_token
        """
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json=admin_credentials
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data, "Response missing access_token"
        assert data["access_token"], "access_token is empty"
        assert "token_type" in data, "Response missing token_type"
        assert data["token_type"] == "bearer", f"Unexpected token_type: {data['token_type']}"
        
        print(f"✓ Access token returned successfully")
    
    def test_invalid_credentials_rejected(self, api_client):
        """
        Test 5: Verify invalid credentials are rejected
        """
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin_master", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print(f"✓ Invalid credentials properly rejected")
    
    def test_photo_upload_endpoint_exists(self, api_client, auth_token):
        """
        Test 6: Verify photo upload endpoint is accessible
        """
        # Just check the endpoint exists (don't upload)
        # This would fail with 422 (validation error) if we don't send a file
        response = api_client.post(
            f"{BASE_URL}/api/auth/photo",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should fail with 422 (no file) not 404 (endpoint doesn't exist)
        assert response.status_code != 404, "Photo upload endpoint not found"
        print(f"✓ Photo upload endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
