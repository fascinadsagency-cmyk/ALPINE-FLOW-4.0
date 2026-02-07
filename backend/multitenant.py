"""
Multi-Tenant Middleware and Helpers
Provides STRICT data isolation by store_id
SECURITY: All database operations MUST be filtered by store_id
"""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import os
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'alpineflow-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

class CurrentUser:
    """Enhanced user object with multi-tenant info and STRICT isolation"""
    def __init__(self, user_id: str, username: str, role: str, store_id: Optional[int]):
        self.user_id = user_id
        self.username = username
        self.role = role
        self.store_id = store_id
        self.is_super_admin = role == "super_admin"
        
        # SECURITY: Validate store_id for non-super_admin users
        if not self.is_super_admin and self.store_id is None:
            logger.error(f"🚨 SECURITY: User {username} has no store_id!")
            raise HTTPException(
                status_code=403,
                detail="User has no store assigned. Contact administrator."
            )
    
    def get_store_filter(self) -> Dict:
        """
        Returns MongoDB filter for STRICT store isolation.
        SECURITY: This filter MUST be used in ALL database queries.
        SUPER_ADMIN: No filter (sees all stores)
        Others: Filter by their store_id
        """
        if self.is_super_admin:
            return {}  # No filter - access all stores
        
        # SECURITY: Double-check store_id is valid
        if self.store_id is None:
            logger.error(f"🚨 SECURITY: get_store_filter called with None store_id for user {self.username}")
            raise HTTPException(status_code=403, detail="Invalid store_id")
        
        return {"store_id": self.store_id}
    
    def ensure_store_access(self, store_id: int):
        """
        Validates user has access to the specified store.
        SECURITY: Raises HTTPException if access denied.
        """
        if self.is_super_admin:
            return  # SUPER_ADMIN has access to all stores
        
        if self.store_id != store_id:
            logger.warning(f"🚨 ACCESS DENIED: User {self.username} (store {self.store_id}) tried to access store {store_id}")
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied to store {store_id}"
            )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    Enhanced authentication that includes store_id and role.
    SECURITY: Returns CurrentUser object with validated multi-tenant information.
    """
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        user = CurrentUser(
            user_id=payload.get("sub"),
            username=payload.get("username"),
            role=payload.get("role", "employee"),
            store_id=payload.get("store_id")  # Can be None for SUPER_ADMIN only
        )
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_super_admin(current_user: CurrentUser = Depends(get_current_user)):
    """
    Dependency to ensure only SUPER_ADMIN can access certain endpoints.
    SECURITY: Blocks access for all non-super_admin users.
    """
    if not current_user.is_super_admin:
        logger.warning(f"🚨 SUPER_ADMIN REQUIRED: User {current_user.username} blocked")
        raise HTTPException(
            status_code=403,
            detail="This action requires SUPER_ADMIN privileges"
        )
    return current_user

def create_token(user_id: str, username: str, role: str, store_id: Optional[int]) -> str:
    """
    Create JWT token with store_id included.
    SECURITY: store_id is embedded in token and CANNOT be changed by client.
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
