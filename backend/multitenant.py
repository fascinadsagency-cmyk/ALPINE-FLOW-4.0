"""
Multi-Tenant Middleware and Helpers
Provides data isolation by store_id
"""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import os
from typing import Optional, Dict

JWT_SECRET = os.environ.get('JWT_SECRET', 'alpineflow-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

class CurrentUser:
    """Enhanced user object with multi-tenant info"""
    def __init__(self, user_id: str, username: str, role: str, store_id: Optional[int]):
        self.user_id = user_id
        self.username = username
        self.role = role
        self.store_id = store_id
        self.is_super_admin = role == "super_admin"
    
    def get_store_filter(self) -> Dict:
        """
        Returns MongoDB filter for store isolation
        SUPER_ADMIN: No filter (sees all stores)
        Others: Filter by their store_id
        """
        if self.is_super_admin:
            return {}  # No filter - access all stores
        return {"store_id": self.store_id}
    
    def ensure_store_access(self, store_id: int):
        """
        Validates user has access to the specified store
        Raises HTTPException if access denied
        """
        if self.is_super_admin:
            return  # SUPER_ADMIN has access to all stores
        
        if self.store_id != store_id:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied to store {store_id}"
            )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    Enhanced authentication that includes store_id and role
    Returns CurrentUser object with multi-tenant information
    """
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        return CurrentUser(
            user_id=payload.get("sub"),
            username=payload.get("username"),
            role=payload.get("role", "employee"),
            store_id=payload.get("store_id")  # Can be None for SUPER_ADMIN
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_super_admin(current_user: CurrentUser = Depends(get_current_user)):
    """
    Dependency to ensure only SUPER_ADMIN can access certain endpoints
    """
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="This action requires SUPER_ADMIN privileges"
        )
    return current_user

def create_token(user_id: str, username: str, role: str, store_id: Optional[int]) -> str:
    """
    Create JWT token with store_id included
    """
    from datetime import datetime, timezone, timedelta
    
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "store_id": store_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
