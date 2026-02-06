"""
Store Management Models for Multi-Tenant
"""
from pydantic import BaseModel
from typing import Optional

class StoreCreate(BaseModel):
    name: str
    plan: str = "basic"  # basic, pro, enterprise
    contact_email: Optional[str] = ""
    contact_phone: Optional[str] = ""
    address: Optional[str] = ""
    max_users: int = 10
    max_items: int = 10000
    max_customers: int = 10000

class StoreResponse(BaseModel):
    store_id: int
    name: str
    status: str
    plan: str
    created_at: str
    settings: dict
    contact: dict

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    plan: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    company_logo: Optional[str] = None
    ticket_footer: Optional[str] = None
    max_users: Optional[int] = None
    max_items: Optional[int] = None
    max_customers: Optional[int] = None
