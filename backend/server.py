from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import csv
import io
from fastapi import UploadFile, File

# PDF Generation
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import cm, mm

# Stripe Integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Multi-tenant imports
from multitenant import get_current_user, CurrentUser, require_super_admin, require_admin, create_token as mt_create_token
from store_models import StoreCreate, StoreResponse, StoreUpdate

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpineflow-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ==================== PLAN DEFINITIONS ====================
PLAN_LIMITS = {
    "trial": {
        "name": "Free Trial",
        "max_items": 999999,       # UNLIMITED during trial (Full Access)
        "max_customers": 999999,   # UNLIMITED during trial (Full Access)
        "max_users": 999,          # UNLIMITED during trial (Full Access)
        "price": 0,
        "duration_days": 15
    },
    "basic": {
        "name": "Plan Básico",
        "max_items": 1000,         # UPDATED: 1,000 artículos (reducido desde 2,000)
        "max_customers": 5000,     # UPDATED: 5,000 clientes (reducido desde 10,000)
        "max_users": 5,            # 5 usuarios
        "price": 950,
        "stripe_price_id": "price_basic_annual"  # Para Stripe
    },
    "pro": {
        "name": "Plan PRO",
        "max_items": 6000,         # 6,000 artículos
        "max_customers": 40000,    # 40,000 clientes
        "max_users": 10,           # 10 usuarios
        "price": 1450,
        "stripe_price_id": "price_pro_annual"
    },
    "enterprise": {
        "name": "Plan Enterprise",
        "max_items": 999999,       # Unlimited
        "max_customers": 999999,   # Unlimited
        "max_users": 15,           # 15 usuarios máximo
        "price": 1950,
        "stripe_price_id": "price_enterprise_annual"
    }
}

app = FastAPI(title="AlpineFlow API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "employee"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CustomerCreate(BaseModel):
    dni: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    source: Optional[str] = ""  # Proveedor/Fuente
    notes: Optional[str] = ""  # Observaciones internas
    # Technical data for quick service
    boot_size: Optional[str] = ""  # Talla de bota
    height: Optional[str] = ""  # Altura (cm)
    weight: Optional[str] = ""  # Peso (kg)
    ski_level: Optional[str] = ""  # Nivel: Principiante, Intermedio, Avanzado, Experto

class CustomerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    dni: str
    name: str
    phone: str
    email: str = ""
    address: str
    city: str
    source: str = ""
    notes: str = ""
    created_at: str
    total_rentals: int = 0
    # Technical data
    boot_size: str = ""
    height: str = ""
    weight: str = ""
    ski_level: str = ""

class ItemCreate(BaseModel):
    barcode: Optional[str] = ""  # Optional for generic items
    barcode_2: Optional[str] = ""  # Secondary barcode
    internal_code: Optional[str] = ""  # Optional for generic items
    serial_number: Optional[str] = ""  # Manufacturer serial number
    item_type: str  # Required - type from custom types
    brand: Optional[str] = ""  # Optional for generic items
    model: Optional[str] = ""  # Optional for generic items
    size: Optional[str] = ""
    binding: Optional[str] = ""  # Binding type/model for skis
    purchase_price: Optional[float] = 0
    purchase_date: Optional[str] = ""
    location: Optional[str] = ""
    maintenance_interval: Optional[int] = 30  # days between maintenance
    category: Optional[str] = "MEDIA"  # SUPERIOR, ALTA, MEDIA
    acquisition_cost: Optional[float] = None  # Cost for profitability tracking
    status: Optional[str] = None  # available, rented, maintenance, retired - for manual override
    # Generic item fields
    is_generic: Optional[bool] = False  # If true, managed by quantity not individual tracking
    name: Optional[str] = ""  # Display name for generic items (e.g., "Casco Adulto")
    stock_total: Optional[int] = 0  # Total units for generic items
    rental_price: Optional[float] = None  # Quick rental price for generic items
    # Quick Add feature
    is_quick_add: Optional[bool] = False  # Show in "Añadir Rápido" section

class BulkItemCreate(BaseModel):
    items: List[ItemCreate]

class GenerateBarcodeRequest(BaseModel):
    prefix: str = "SKI"
    count: int = 1

class ItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barcode: str = ""
    barcode_2: str = ""  # Secondary barcode
    internal_code: str = ""  # Internal shop code (main identifier)
    serial_number: str = ""  # Manufacturer serial number
    item_type: str
    brand: str = ""
    model: str = ""
    size: str = ""
    binding: str = ""  # Binding type/model
    status: str  # available, rented, maintenance, retired
    purchase_price: float = 0
    purchase_date: str = ""
    location: str = ""
    days_used: int = 0
    amortization: float = 0
    category: str = "MEDIA"
    maintenance_interval: int = 30
    created_at: str
    # Tariff fields
    tariff_id: str = ""  # Link to tariff
    rental_price: Optional[float] = None  # Price per day from tariff
    # Financial fields (optional for response)
    acquisition_cost: Optional[float] = None
    total_revenue: Optional[float] = None
    net_profit: Optional[float] = None
    amortization_percent: Optional[float] = None
    # Generic item fields
    is_generic: bool = False
    name: str = ""
    stock_total: int = 0
    stock_available: int = 0
    # Quick Add feature
    is_quick_add: bool = False

class TariffCreate(BaseModel):
    item_type: str
    # Daily prices for first 10 days
    day_1: Optional[float] = None
    day_2: Optional[float] = None
    day_3: Optional[float] = None
    day_4: Optional[float] = None
    day_5: Optional[float] = None
    day_6: Optional[float] = None
    day_7: Optional[float] = None
    day_8: Optional[float] = None
    day_9: Optional[float] = None
    day_10: Optional[float] = None
    day_11_plus: Optional[float] = None
    # Legacy fields (kept for backward compatibility)
    days_1: Optional[float] = None
    days_2_3: Optional[float] = None
    days_4_7: Optional[float] = None
    week: Optional[float] = None
    season: Optional[float] = None

class TariffResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    item_type: str
    # Daily prices for first 10 days
    day_1: Optional[float] = None
    day_2: Optional[float] = None
    day_3: Optional[float] = None
    day_4: Optional[float] = None
    day_5: Optional[float] = None
    day_6: Optional[float] = None
    day_7: Optional[float] = None
    day_8: Optional[float] = None
    day_9: Optional[float] = None
    day_10: Optional[float] = None
    day_11_plus: Optional[float] = None
    # Legacy fields (kept for backward compatibility)
    days_1: Optional[float] = None
    days_2_3: Optional[float] = None
    days_4_7: Optional[float] = None
    week: Optional[float] = None
    season: Optional[float] = None

class RentalItemInput(BaseModel):
    barcode: str
    person_name: Optional[str] = ""
    is_generic: Optional[bool] = False  # Flag for generic items
    quantity: Optional[int] = 1  # Quantity for generic items
    unit_price: Optional[float] = 0  # Unit price for this item

class RentalCreate(BaseModel):
    customer_id: str
    start_date: str
    end_date: str
    items: List[RentalItemInput]
    payment_method: str  # cash, card, pending, online, other
    total_amount: float
    paid_amount: float = 0
    deposit: float = 0
    notes: Optional[str] = ""

class RentalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_id: str
    customer_name: str
    customer_dni: str
    start_date: str
    end_date: str
    days: int
    items: List[dict]
    payment_method: str
    total_amount: float
    paid_amount: float
    pending_amount: float
    deposit: Optional[float] = 0
    status: str  # active, returned, partial
    notes: Optional[str] = ""
    created_at: str
    operation_number: Optional[str] = None  # Ticket number for printing

class ReturnInput(BaseModel):
    barcodes: List[str]
    quantities: Optional[Dict[str, int]] = {}  # Map barcode -> quantity for partial returns
    deposit_action: Optional[str] = "return"  # "return" or "forfeit"
    forfeit_reason: Optional[str] = None  # Razón de incautación

class MaintenanceCreate(BaseModel):
    item_id: str
    maintenance_type: str
    description: str
    cost: float = 0
    scheduled_date: Optional[str] = None


class AddItemsToRentalInput(BaseModel):
    items: List[RentalItemInput]
    days: Optional[int] = None  # Días para los nuevos items (None = usar los del alquiler)
    end_date: Optional[str] = None  # Fecha fin específica (None = usar la del alquiler)
    charge_now: bool = True  # Si se cobra ahora o queda pendiente
    payment_method: Optional[str] = "cash"  # Método de pago si se cobra ahora
    calculated_total: Optional[float] = None  # Total calculado con packs desde el frontend

class MaintenanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    item_id: str
    item_barcode: str
    item_description: str
    maintenance_type: str
    description: str
    cost: float
    status: str
    scheduled_date: Optional[str]
    completed_date: Optional[str]
    created_at: str

# External Workshop (Taller Externo) Models
class ExternalRepairCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_id: Optional[str] = None
    equipment_description: str
    services: List[str]  # ["wax", "sharpen", "patch", "bindings"]
    delivery_date: str  # ISO date
    delivery_time: Optional[str] = None
    priority: str = "normal"  # normal, priority, urgent
    price: float = 0
    notes: Optional[str] = None

class ExternalRepairResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_name: str
    customer_phone: str
    customer_id: Optional[str] = None
    equipment_description: str
    services: List[str]
    delivery_date: str
    delivery_time: Optional[str] = None
    priority: str
    price: float
    notes: Optional[str] = None
    status: str  # pending, in_progress, completed, delivered
    created_at: str
    completed_at: Optional[str] = None
    delivered_at: Optional[str] = None
    payment_method: Optional[str] = None

class DailyReportResponse(BaseModel):
    date: str
    total_revenue: float
    cash_revenue: float
    card_revenue: float
    online_revenue: float
    other_revenue: float
    new_rentals: int
    returns: int
    active_rentals: int
    pending_returns: List[dict]
    inventory_usage: float

class CommissionSummary(BaseModel):
    provider_name: str
    provider_id: str
    commission_percent: float
    customer_count: int
    revenue_generated: float
    commission_amount: float

class RangeReportResponse(BaseModel):
    start_date: str
    end_date: str
    total_revenue: float
    cash_revenue: float
    card_revenue: float
    online_revenue: float
    other_revenue: float
    repairs_revenue: float
    new_rentals: int
    returns: int
    pending_returns: List[dict]
    commissions: List[CommissionSummary]

# Item Type Models (for custom types)
class ItemTypeCreate(BaseModel):
    value: str  # Internal key (e.g., "snowblade")
    label: str  # Display name (e.g., "Snowblade")

class ItemTypeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    value: str
    label: str
    is_default: bool
    store_id: Optional[int] = None
    created_at: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

# Use multitenant create_token instead of local one
create_token = mt_create_token

# ==================== PLAN HELPERS ====================

def get_plan_limits(store: dict) -> dict:
    """
    Get plan limits from store document.
    Priority: plan > plan_type > settings.max_users > default to trial
    """
    # Try to get plan from 'plan' field first, then 'plan_type'
    plan_name = store.get("plan") or store.get("plan_type", "trial")
    
    # If plan is not in PLAN_LIMITS, default to trial
    if plan_name not in PLAN_LIMITS:
        plan_name = "trial"
    
    plan_info = PLAN_LIMITS[plan_name]
    
    # Check if store has custom limits in settings (override plan defaults)
    settings = store.get("settings", {})
    if settings.get("max_users"):
        plan_info = plan_info.copy()  # Don't modify original
        plan_info["max_users"] = settings["max_users"]
    if settings.get("max_items"):
        plan_info = plan_info.copy()
        plan_info["max_items"] = settings["max_items"]
    if settings.get("max_customers"):
        plan_info = plan_info.copy()
        plan_info["max_customers"] = settings["max_customers"]
    
    return plan_info

# ==================== AUTH ROUTES ====================

class PublicRegisterRequest(BaseModel):
    email: str
    password: str
    store_name: Optional[str] = None

class RegisterResponse(BaseModel):
    access_token: str
    user: dict
    store_id: int
    is_new_store: bool
    requires_setup: bool

@api_router.post("/auth/register")
async def register_public(request: PublicRegisterRequest):
    """
    Public registration endpoint.
    Creates a new user AND a new store with trial status.
    """
    email = request.email.lower().strip()
    
    # Validate email format
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email inválido")
    
    # Check if email already exists
    existing = await db.users.find_one({"username": email})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Este email ya tiene una cuenta asociada. ¿Quieres iniciar sesión?"
        )
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Get next store_id
    last_store = await db.stores.find_one(sort=[("store_id", -1)])
    next_store_id = (last_store["store_id"] + 1) if last_store and last_store.get("store_id") else 1
    
    # Create the store with trial status
    trial_start = datetime.now(timezone.utc).isoformat()
    store_name = request.store_name or f"Mi Tienda {next_store_id}"
    
    store_doc = {
        "store_id": next_store_id,
        "name": store_name,
        "status": "active",
        "plan_type": "trial",
        "trial_start_date": trial_start,
        "created_at": trial_start,
        "settings": {
            "currency": "EUR",
            "timezone": "Europe/Madrid",
            "language": "es",
            "max_items": PLAN_LIMITS["trial"]["max_items"],
            "max_customers": PLAN_LIMITS["trial"]["max_customers"],
            "max_users": PLAN_LIMITS["trial"]["max_users"]
        },
        "billing_data": {},
        "requires_setup": True  # Flag to force initial configuration
    }
    
    await db.stores.insert_one(store_doc)
    
    # Create the admin user for this store
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": email,
        "password": hash_password(request.password),
        "role": "admin",
        "store_id": next_store_id,
        "created_at": trial_start
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = create_token(user_id, email, "admin", next_store_id)
    
    logger.info(f"New registration: {email} -> store_id={next_store_id} (trial)")
    
    return {
        "access_token": token,
        "user": {
            "id": user_id,
            "username": email,
            "role": "admin"
        },
        "store_id": next_store_id,
        "is_new_store": True,
        "requires_setup": True,
        "message": "¡Cuenta creada! Bienvenido a tu período de prueba de 15 días."
    }


@api_router.post("/auth/register-legacy", response_model=TokenResponse)
async def register(user: UserCreate):
    """Legacy register endpoint for internal use (e.g., creating staff users)"""
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.username, user.role, None)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, username=user.username, role=user.role)
    )


@api_router.put("/store/setup")
async def complete_store_setup(
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Mark store setup as complete.
    Called after user fills in required store information.
    """
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Check required fields
    required_fields = ["name"]
    missing = []
    for field in required_fields:
        if not store.get(field) or store.get(field) == f"Mi Tienda {current_user.store_id}":
            missing.append(field)
    
    if missing:
        raise HTTPException(
            status_code=400, 
            detail=f"Completa la configuración de tu tienda: {', '.join(missing)}"
        )
    
    # Mark setup as complete
    await db.stores.update_one(
        {"store_id": current_user.store_id},
        {"$set": {"requires_setup": False}}
    )
    
    return {"success": True, "message": "Configuración completada"}


@api_router.get("/store/setup-status")
async def get_setup_status(current_user: CurrentUser = Depends(get_current_user)):
    """Check if store requires initial setup"""
    if current_user.role == "super_admin":
        return {"requires_setup": False}
    
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        return {"requires_setup": True}
    
    return {
        "requires_setup": store.get("requires_setup", False),
        "store_name": store.get("name", ""),
        "has_billing_data": bool(store.get("billing_data", {}).get("cif_nif"))
    }


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"username": user.username})
    # Support both 'password' and 'hashed_password' field names
    password_field = db_user.get("password") or db_user.get("hashed_password") if db_user else None
    if not db_user or not password_field or not verify_password(user.password, password_field):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(
        db_user["id"], 
        db_user["username"], 
        db_user.get("role", "employee"),
        db_user.get("store_id")  # Can be None for SUPER_ADMIN
    )
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=db_user["id"], username=db_user["username"], role=db_user.get("role", "employee"))
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    # Get full user data including photo
    user_doc = await db.users.find_one({"id": current_user.user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
    return {
        "id": current_user.user_id,
        "username": current_user.username,
        "role": current_user.role,
        "email": user_doc.get("email", current_user.username) if user_doc else current_user.username,
        "photo_url": user_doc.get("photo_url", "") if user_doc else ""
    }


# ==================== PROFILE MANAGEMENT ROUTES ====================

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/auth/profile")
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update user profile (username/email) - All authenticated users"""
    
    update_data = {}
    
    if request.username:
        # Check if username is taken (by another user)
        existing = await db.users.find_one({
            "username": request.username,
            "id": {"$ne": current_user.user_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Este nombre de usuario ya está en uso")
        update_data["username"] = request.username
    
    if request.email:
        # Validate email format
        if "@" not in request.email or "." not in request.email.split("@")[-1]:
            raise HTTPException(status_code=400, detail="Formato de email inválido")
        update_data["email"] = request.email.lower().strip()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    # Update user
    result = await db.users.update_one(
        {"id": current_user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Perfil actualizado correctamente", "updated": update_data}


@api_router.put("/auth/password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Change user password - All authenticated users. Requires current password validation."""
    
    # Get current user's password hash
    user = await db.users.find_one({"id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verify current password
    stored_password = user.get("password") or user.get("hashed_password")
    if not stored_password:
        raise HTTPException(status_code=400, detail="Error de configuración de cuenta")
    
    if not verify_password(request.current_password, stored_password):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    
    # Hash and update new password
    new_hashed = hash_password(request.new_password)
    
    await db.users.update_one(
        {"id": current_user.user_id},
        {"$set": {"password": new_hashed, "hashed_password": new_hashed}}
    )
    
    return {"message": "Contraseña actualizada correctamente"}


@api_router.post("/auth/photo")
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Upload profile photo - All authenticated users"""
    import base64
    
    # Validate file type
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
    
    # Read and validate file size (max 2MB)
    contents = await photo.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 2MB")
    
    # Convert to base64 data URL for storage
    mime_type = photo.content_type or "image/jpeg"
    base64_data = base64.b64encode(contents).decode("utf-8")
    photo_url = f"data:{mime_type};base64,{base64_data}"
    
    # Update user
    await db.users.update_one(
        {"id": current_user.user_id},
        {"$set": {"photo_url": photo_url}}
    )
    
    return {"message": "Foto actualizada correctamente", "photo_url": photo_url}


# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: CurrentUser = Depends(get_current_user)):
    # PLAN LIMIT VALIDATION: Check max_customers limit from active plan
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if store:
        plan_type = store.get("plan_type", "trial")
        plan_info = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["trial"])
        max_customers = plan_info["max_customers"]
        
        # Check if trial expired
        if plan_type == "trial":
            trial_start = store.get("trial_start_date")
            if trial_start:
                if isinstance(trial_start, str):
                    trial_start_dt = datetime.fromisoformat(trial_start.replace('Z', '+00:00'))
                else:
                    trial_start_dt = trial_start
                days_since_start = (datetime.now(timezone.utc) - trial_start_dt).days
                if days_since_start > 15:
                    raise HTTPException(
                        status_code=403,
                        detail="Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar."
                    )
        
        current_customers = await db.customers.count_documents(current_user.get_store_filter())
        if max_customers != 999999 and current_customers >= max_customers:
            raise HTTPException(
                status_code=403, 
                detail={
                    "error": "PLAN_LIMIT_EXCEEDED",
                    "limit_type": "customers",
                    "current_count": current_customers,
                    "max_allowed": max_customers,
                    "plan_name": plan_info["name"],
                    "message": f"Límite de clientes alcanzado ({max_customers}). Actualiza tu plan para añadir más."
                }
            )
    
    # Check for duplicate within the same store
    query = {**current_user.get_store_filter(), "dni": customer.dni}
    existing = await db.customers.find_one(query)
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this DNI already exists in your store")
    
    customer_id = str(uuid.uuid4())
    doc = {
        "id": customer_id,
        "store_id": current_user.store_id,  # Multi-tenant: assign to user's store
        "dni": customer.dni.upper(),
        "name": customer.name,
        "phone": customer.phone or "",
        "email": customer.email or "",
        "address": customer.address or "",
        "city": customer.city or "",
        "source": customer.source or "",
        "notes": customer.notes or "",
        "boot_size": customer.boot_size or "",
        "height": customer.height or "",
        "weight": customer.weight or "",
        "ski_level": customer.ski_level or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_rentals": 0
    }
    await db.customers.insert_one(doc)
    return CustomerResponse(**doc)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {**current_user.get_store_filter()}
    if search:
        query["$or"] = [
            {"dni": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).to_list(5000)
    return [CustomerResponse(**c) for c in customers]

@api_router.get("/customers/with-status")
async def get_customers_with_status(
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all customers with their active rental status"""
    query = {**current_user.get_store_filter()}
    if search:
        query = {
            "$or": [
                {"dni": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        }
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(10000)
    
    # 🚀 OPTIMIZACIÓN: Get active rentals with store_filter for efficiency
    active_rentals = await db.rentals.find(
        {
            **current_user.get_store_filter(),  # ✅ Multi-tenant filter
            "status": {"$in": ["active", "partial"]}
        },
        {"customer_id": 1, "customer_dni": 1, "end_date": 1, "_id": 0}
    ).to_list(1000)
    
    # Create a set of customer IDs/DNIs with active rentals
    active_customer_ids = set()
    active_customer_dnis = set()
    for rental in active_rentals:
        if rental.get("customer_id"):
            active_customer_ids.add(rental["customer_id"])
        if rental.get("customer_dni"):
            active_customer_dnis.add(rental["customer_dni"].upper())
    
    # Add status to each customer
    customers_with_status = []
    active_count = 0
    inactive_count = 0
    
    for customer in customers:
        is_active = (
            customer.get("id") in active_customer_ids or 
            customer.get("dni", "").upper() in active_customer_dnis
        )
        customer["has_active_rental"] = is_active
        customers_with_status.append(customer)
        
        if is_active:
            active_count += 1
        else:
            inactive_count += 1
    
    return {
        "customers": customers_with_status,
        "counts": {
            "total": len(customers_with_status),
            "active": active_count,
            "inactive": inactive_count
        }
    }

@api_router.get("/customers/paginated/list")
async def get_customers_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(200, ge=10, le=500),
    search: Optional[str] = None,
    status: Optional[str] = Query("all", regex="^(all|active|inactive)$"),
    provider: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get customers with server-side pagination - OPTIMIZED with MongoDB aggregation
    """
    store_filter = current_user.get_store_filter()
    
    # Si NO se filtra por active/inactive, usar consulta simple (más rápida)
    if status == "all":
        
        # Build base query
        query = {**store_filter}
        
        # Search filter
        if search and search.strip():
            query["$or"] = [
                {"dni": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        # Provider filter
        if provider and provider != "all":
            if provider == "none":
                query["$or"] = [{"source": {"$exists": False}}, {"source": ""}]
            else:
                query["source"] = provider
        
        total = await db.customers.count_documents(query)
        skip = (page - 1) * limit
        
        customers = await db.customers.find(
            query,
            {
                "_id": 0,
                "id": 1,
                "dni": 1,
                "name": 1,
                "phone": 1,
                "city": 1,
                "source": 1,
                "total_rentals": 1,
                "created_at": 1
            }
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for customer in customers:
            customer["has_active_rental"] = False
        
        total_pages = (total + limit - 1) // limit
        
        return {
            "customers": customers,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
    
    # Si se filtra por active/inactive, usar AGREGACIÓN optimizada
    pipeline = []
    
    # Stage 1: Match customers del store
    match_stage = {**store_filter}
    
    # Search filter
    if search and search.strip():
        match_stage["$or"] = [
            {"dni": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Provider filter
    if provider and provider != "all":
        if provider == "none":
            match_stage["$or"] = match_stage.get("$or", []) + [{"source": {"$exists": False}}, {"source": ""}]
        else:
            match_stage["source"] = provider
    
    pipeline.append({"$match": match_stage})
    
    # Build rental match conditions based on store filter
    rental_store_condition = []
    if "store_id" in store_filter:
        rental_store_condition = [{"$eq": ["$store_id", store_filter["store_id"]]}]
    
    # Stage 2: Lookup active rentals
    pipeline.append({
        "$lookup": {
            "from": "rentals",
            "let": {
                "customer_id": "$id",
                "customer_dni": {"$toUpper": "$dni"}
            },
            "pipeline": [
                {
                    "$match": {
                        "$expr": {
                            "$and": rental_store_condition + [
                                {"$in": ["$status", ["active", "partial"]]},
                                {
                                    "$or": [
                                        {"$eq": ["$customer_id", "$$customer_id"]},
                                        {"$eq": [{"$toUpper": "$customer_dni"}, "$$customer_dni"]}
                                    ]
                                }
                            ]
                        }
                    }
                },
                {"$limit": 1}
            ],
            "as": "active_rentals"
        }
    })
    
    # Stage 3: Add computed field has_active_rental
    pipeline.append({
        "$addFields": {
            "has_active_rental": {"$gt": [{"$size": "$active_rentals"}, 0]}
        }
    })
    
    # Stage 4: Filter by active/inactive
    if status == "active":
        pipeline.append({"$match": {"has_active_rental": True}})
    elif status == "inactive":
        pipeline.append({"$match": {"has_active_rental": False}})
    
    # Stage 5: Project only needed fields
    pipeline.append({
        "$project": {
            "_id": 0,
            "id": 1,
            "dni": 1,
            "name": 1,
            "phone": 1,
            "city": 1,
            "source": 1,
            "total_rentals": 1,
            "created_at": 1,
            "has_active_rental": 1
        }
    })
    
    # Stage 6: Sort
    pipeline.append({"$sort": {"created_at": -1}})
    
    # Get total count with facet (más eficiente que count separado)
    count_pipeline = pipeline + [{"$count": "total"}]
    data_pipeline = pipeline + [{"$skip": (page - 1) * limit}, {"$limit": limit}]
    
    count_result = await db.customers.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    
    customers = await db.customers.aggregate(data_pipeline).to_list(limit)
    
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    
    return {
        "customers": customers,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

@api_router.get("/customers/stats/summary")
async def get_customers_stats(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get customer statistics - OPTIMIZED to match paginated list logic
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    total = await db.customers.count_documents(store_filter)
    
    # Build rental match conditions based on store filter
    rental_store_condition = []
    if "store_id" in store_filter:
        rental_store_condition = [{"$eq": ["$store_id", store_filter["store_id"]]}]
    
    # Use aggregation to count unique active customers (same logic as list)
    pipeline = [
        {"$match": store_filter},
        {
            "$lookup": {
                "from": "rentals",
                "let": {
                    "customer_id": "$id",
                    "customer_dni": {"$toUpper": "$dni"}
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": rental_store_condition + [
                                    {"$in": ["$status", ["active", "partial"]]},
                                    {
                                        "$or": [
                                            {"$eq": ["$customer_id", "$$customer_id"]},
                                            {"$eq": [{"$toUpper": "$customer_dni"}, "$$customer_dni"]}
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    {"$limit": 1}
                ],
                "as": "active_rentals"
            }
        },
        {
            "$addFields": {
                "has_active_rental": {"$gt": [{"$size": "$active_rentals"}, 0]}
            }
        },
        {
            "$group": {
                "_id": None,
                "active": {"$sum": {"$cond": ["$has_active_rental", 1, 0]}},
                "inactive": {"$sum": {"$cond": ["$has_active_rental", 0, 1]}}
            }
        }
    ]
    
    result = await db.customers.aggregate(pipeline).to_list(1)
    
    if result:
        active_count = result[0]["active"]
        inactive_count = result[0]["inactive"]
    else:
        active_count = 0
        inactive_count = total
    
    return {
        "total": total,
        "active": active_count,
        "inactive": inactive_count
    }

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: CurrentUser = Depends(get_current_user)):
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

@api_router.get("/customers/dni/{dni}", response_model=CustomerResponse)
async def get_customer_by_dni(dni: str, current_user: CurrentUser = Depends(get_current_user)):
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"dni": dni.upper()}}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

@api_router.get("/customers/{customer_id}/history")
async def get_customer_history(customer_id: str, current_user: CurrentUser = Depends(get_current_user)):
    # Get customer info first
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"customer_id": customer_id}}, {"_id": 0})
    
    rentals = await db.rentals.find({**current_user.get_store_filter(), "customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Check for active/pending rentals (for alerts)
    active_rentals = [r for r in rentals if r.get("status") in ["active", "partial"]]
    overdue_rentals = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for rental in active_rentals:
        if rental.get("end_date", "") < today:
            overdue_rentals.append(rental)
    
    # Get preferred sizes from history
    sizes = {}
    for rental in rentals:
        for item in rental.get("items", []):
            item_type = item.get("item_type", "")
            size = item.get("size", "")
            if item_type and size:
                if item_type not in sizes:
                    sizes[item_type] = []
                if size not in sizes[item_type]:
                    sizes[item_type].append(size)
    
    # Get rental IDs for this customer
    rental_ids = [r["id"] for r in rentals]
    
    # Get cash transactions related to this customer's rentals
    transactions = []
    if rental_ids:
        cash_movements = await db.cash_movements.find(
            {"reference_id": {"$in": rental_ids}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(5000)
        
        for m in cash_movements:
            transactions.append({
                "id": m["id"],
                "type": m["movement_type"],  # income, refund
                "amount": m["amount"],
                "payment_method": m["payment_method"],
                "concept": m["concept"],
                "reference_id": m.get("reference_id"),
                "date": m["created_at"],
                "notes": m.get("notes", "")
            })
    
    # Calculate financial totals
    total_paid = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_refunded = sum(t["amount"] for t in transactions if t["type"] == "refund")
    
    return {
        "rentals": rentals,
        "transactions": transactions,
        "preferred_sizes": sizes,
        "total_rentals": len(rentals),
        "active_rentals": len(active_rentals),
        "overdue_rentals": len(overdue_rentals),
        "has_alerts": len(overdue_rentals) > 0,
        "financial_summary": {
            "total_paid": total_paid,
            "total_refunded": total_refunded,
            "net_revenue": total_paid - total_refunded
        }
    }

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer: CustomerCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    existing = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if DNI is being changed and if new DNI already exists
    if customer.dni.upper() != existing["dni"]:
        dni_exists = await db.customers.find_one({**current_user.get_store_filter(), **{"dni": customer.dni.upper()}})
        if dni_exists:
            raise HTTPException(status_code=400, detail="Customer with this DNI already exists")
    
    update_doc = {
        "dni": customer.dni.upper(),
        "name": customer.name,
        "phone": customer.phone or "",
        "email": customer.email or "",
        "address": customer.address or "",
        "city": customer.city or "",
        "source": customer.source or "",
        "notes": customer.notes or "",
        "boot_size": customer.boot_size or "",
        "height": customer.height or "",
        "weight": customer.weight or "",
        "ski_level": customer.ski_level or ""
    }
    
    await db.customers.update_one({**current_user.get_store_filter(), "id": customer_id}, {"$set": update_doc})
    updated_customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}}, {"_id": 0})
    return CustomerResponse(**updated_customer)

# Quick update endpoint for technical data only
class TechnicalDataUpdate(BaseModel):
    boot_size: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    ski_level: Optional[str] = None

@api_router.patch("/customers/{customer_id}/technical-data")
async def update_customer_technical_data(
    customer_id: str,
    data: TechnicalDataUpdate,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Quick update endpoint for technical data (boot size, height, weight, level)"""
    existing = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_doc = {}
    if data.boot_size is not None:
        update_doc["boot_size"] = data.boot_size
    if data.height is not None:
        update_doc["height"] = data.height
    if data.weight is not None:
        update_doc["weight"] = data.weight
    if data.ski_level is not None:
        update_doc["ski_level"] = data.ski_level
    
    if update_doc:
        await db.customers.update_one({**current_user.get_store_filter(), "id": customer_id}, {"$set": update_doc})
    
    updated_customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}}, {"_id": 0})
    return updated_customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer has active rentals - Multi-tenant: Filter by store
    active_rentals = await db.rentals.count_documents({
        **current_user.get_store_filter(),
        "customer_id": customer_id,
        "status": "active"
    })
    
    if active_rentals > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer with {active_rentals} active rental(s). Please complete or cancel them first."
        )
    
    await db.customers.delete_one({**current_user.get_store_filter(), "id": customer_id})
    return {"message": "Customer deleted successfully"}

# ========== BULK OPERATIONS ==========

class BulkCustomerIdsRequest(BaseModel):
    customer_ids: List[str]

@api_router.post("/customers/check-active-rentals")
async def check_customers_active_rentals(request: BulkCustomerIdsRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    Verifica qué clientes tienen alquileres activos.
    Devuelve lista de clientes que NO pueden ser eliminados.
    """
    customers_with_rentals = []
    
    for customer_id in request.customer_ids:
        # Multi-tenant: Filter by store
        active_count = await db.rentals.count_documents({
            **current_user.get_store_filter(),
            "customer_id": customer_id,
            "status": {"$in": ["active", "partial"]}
        })
        
        if active_count > 0:
            customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}}, {"_id": 0, "id": 1, "name": 1, "dni": 1})
            if customer:
                customer["active_rentals"] = active_count
                customers_with_rentals.append(customer)
    
    return {"customers_with_rentals": customers_with_rentals}

@api_router.post("/customers/bulk-delete")
async def bulk_delete_customers(request: BulkCustomerIdsRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    Elimina múltiples clientes a la vez.
    Solo elimina clientes SIN alquileres activos.
    """
    deleted = 0
    failed = 0
    failed_customers = []
    
    for customer_id in request.customer_ids:
        # Check if customer has active rentals - Multi-tenant: Filter by store
        active_count = await db.rentals.count_documents({
            **current_user.get_store_filter(),
            "customer_id": customer_id,
            "status": {"$in": ["active", "partial"]}
        })
        
        if active_count > 0:
            failed += 1
            customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": customer_id}}, {"_id": 0, "id": 1, "name": 1, "dni": 1})
            if customer:
                failed_customers.append(customer)
            continue
        
        # Safe to delete
        result = await db.customers.delete_one({**current_user.get_store_filter(), "id": customer_id})
        if result.deleted_count > 0:
            deleted += 1
        else:
            failed += 1
    
    return {
        "deleted": deleted,
        "failed": failed,
        "failed_customers": failed_customers
    }

# Import customers endpoint
class CustomerImportItem(BaseModel):
    dni: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    source: Optional[str] = ""
    notes: Optional[str] = ""

class CustomerImportRequest(BaseModel):
    customers: List[CustomerImportItem]

@api_router.post("/customers/import")
async def import_customers(request: CustomerImportRequest, current_user: CurrentUser = Depends(get_current_user)):
    imported = 0
    duplicates = 0
    errors = 0
    duplicate_dnis = []
    
    for customer in request.customers:
        try:
            dni_upper = customer.dni.strip().upper()
            if not dni_upper or not customer.name.strip():
                errors += 1
                continue
            
            # Check for existing customer by DNI
            existing = await db.customers.find_one({**current_user.get_store_filter(), **{"dni": dni_upper}})
            if existing:
                duplicates += 1
                duplicate_dnis.append(dni_upper)
                continue
            
            # Check for existing by email if provided
            if customer.email and customer.email.strip():
                existing_email = await db.customers.find_one({**current_user.get_store_filter(), **{"email": customer.email.strip().lower()}})
                if existing_email:
                    duplicates += 1
                    duplicate_dnis.append(f"{dni_upper} (email)")
                    continue
            
            customer_id = str(uuid.uuid4())
            doc = {
                "id": customer_id,
                "dni": dni_upper,
                "name": customer.name.strip(),
                "phone": customer.phone.strip() if customer.phone else "",
                "email": customer.email.strip().lower() if customer.email else "",
                "address": customer.address.strip() if customer.address else "",
                "city": customer.city.strip() if customer.city else "",
                "source": customer.source.strip() if customer.source else "",
                "notes": customer.notes.strip() if customer.notes else "",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "total_rentals": 0
            }
            
            await db.customers.insert_one(doc)
            imported += 1
            
        except Exception as e:
            errors += 1
            print(f"Error importing customer {customer.dni}: {str(e)}")
    
    return {
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "duplicate_dnis": duplicate_dnis[:50]  # Limit to 50 for response size
    }

@api_router.get("/customers/export/all")
async def export_all_customers(
    format: str = Query("json", regex="^(json|count)$"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Export all customers optimized for large datasets (50K+)
    Returns data in batches to avoid memory issues
    format: 'json' returns all data, 'count' returns just the count
    """
    if format == "count":
        total = await db.customers.count_documents(current_user.get_store_filter())
        return {"total": total}
    
    # For full export, use cursor to stream data efficiently
    # Return minimal fields for export - Multi-tenant: Filter by store
    customers = await db.customers.find(
        current_user.get_store_filter(),
        {
            "_id": 0,
            "id": 1,
            "dni": 1,
            "name": 1,
            "phone": 1,
            "email": 1,
            "address": 1,
            "city": 1,
            "source": 1,
            "boot_size": 1,
            "height": 1,
            "weight": 1,
            "ski_level": 1,
            "created_at": 1,
            "notes": 1,
            "total_rentals": 1
        }
    ).to_list(None)  # MongoDB driver handles memory efficiently
    
    return {
        "customers": customers,
        "total": len(customers)
    }

# ==================== INVENTORY ROUTES ====================

@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, current_user: CurrentUser = Depends(get_current_user)):
    # PLAN LIMIT VALIDATION: Check max_items limit from active plan
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if store:
        plan_type = store.get("plan_type", "trial")
        plan_info = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["trial"])
        max_items = plan_info["max_items"]
        
        # Check if trial expired
        if plan_type == "trial":
            trial_start = store.get("trial_start_date")
            if trial_start:
                if isinstance(trial_start, str):
                    trial_start_dt = datetime.fromisoformat(trial_start.replace('Z', '+00:00'))
                else:
                    trial_start_dt = trial_start
                days_since_start = (datetime.now(timezone.utc) - trial_start_dt).days
                if days_since_start > 15:
                    raise HTTPException(
                        status_code=403,
                        detail="Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar."
                    )
        
        current_items = await db.items.count_documents(current_user.get_store_filter())
        if max_items != 999999 and current_items >= max_items:
            raise HTTPException(
                status_code=403, 
                detail={
                    "error": "PLAN_LIMIT_EXCEEDED",
                    "limit_type": "items",
                    "current_count": current_items,
                    "max_allowed": max_items,
                    "plan_name": plan_info["name"],
                    "message": f"Límite de artículos alcanzado ({max_items}). Actualiza tu plan para añadir más."
                }
            )
    
    # For generic items, generate auto ID and skip duplicate checks for barcode/internal_code
    if item.is_generic:
        # Validate required fields for generic items
        if not item.name:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio para artículos genéricos")
        if not item.item_type:
            raise HTTPException(status_code=400, detail="El tipo es obligatorio")
        if item.stock_total < 1:
            raise HTTPException(status_code=400, detail="El stock debe ser al menos 1")
        
        item_id = str(uuid.uuid4())
        auto_code = f"GEN-{item_id[:8].upper()}"
        
        # ⚠️  CRITICAL: Normalize item_type to prevent duplicates
        normalized_item_type = normalize_type_name(item.item_type)
        if not normalized_item_type:
            raise HTTPException(status_code=400, detail="El tipo de artículo no puede estar vacío")
        
        doc = {
            "id": item_id,
            "store_id": current_user.store_id,  # ✅ Multi-tenant: assign to user's store
            "barcode": auto_code,  # Auto-generated for generic
            "internal_code": auto_code,
            "serial_number": "",
            "item_type": normalized_item_type,  # ✅ NORMALIZED
            "brand": item.brand or "",
            "model": item.model or "",
            "size": item.size or "",
            "binding": "",
            "status": "available",
            "purchase_price": item.purchase_price or 0,
            "purchase_date": item.purchase_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "location": item.location or "",
            "category": "STANDARD",  # All individual items are STANDARD
            "maintenance_interval": 0,
            "days_used": 0,
            "amortization": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            # Generic item specific fields
            "is_generic": True,
            "name": item.name,
            "stock_total": item.stock_total,
            "stock_available": item.stock_total,  # Initially all available
            "rental_price": item.rental_price or item.purchase_price or 0
        }
        await db.items.insert_one(doc)
        return ItemResponse(**doc)
    
    # Regular item logic (with traceability)
    if not item.internal_code:
        raise HTTPException(status_code=400, detail="El código interno es obligatorio para artículos con trazabilidad")
    if not item.barcode:
        raise HTTPException(status_code=400, detail="El código de barras es obligatorio para artículos con trazabilidad")
    
    # Check for duplicate internal_code (primary identifier)
    existing_internal = await db.items.find_one({**current_user.get_store_filter(), **{"internal_code": item.internal_code}})
    if existing_internal:
        raise HTTPException(status_code=400, detail=f"Ya existe un artículo con código interno '{item.internal_code}'")
    
    # Check for duplicate barcode
    existing_barcode = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item.barcode}})
    if existing_barcode:
        raise HTTPException(status_code=400, detail=f"Ya existe un artículo con código '{item.barcode}'")
    
    item_id = str(uuid.uuid4())
    
    # ⚠️  CRITICAL: Normalize item_type to prevent duplicates
    normalized_item_type = normalize_type_name(item.item_type)
    if not normalized_item_type:
        raise HTTPException(status_code=400, detail="El tipo de artículo no puede estar vacío")
    
    doc = {
        "id": item_id,
        "store_id": current_user.store_id,  # ✅ Multi-tenant: assign to user's store
        "barcode": item.barcode,
        "barcode_2": item.barcode_2 or "",  # Secondary barcode
        "internal_code": item.internal_code,
        "serial_number": item.serial_number or "",
        "item_type": normalized_item_type,  # ✅ NORMALIZED
        "brand": item.brand or "",
        "model": item.model or "",
        "size": item.size or "",
        "binding": item.binding or "",
        "status": "available",
        "purchase_price": item.purchase_price or 0,
        "purchase_date": item.purchase_date or "",
        "location": item.location or "",
        "category": "STANDARD",  # All individual items are STANDARD
        "maintenance_interval": item.maintenance_interval or 30,
        "days_used": 0,
        "amortization": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_generic": False,
        "name": "",
        "stock_total": 0,
        "stock_available": 0,
        "rental_price": None
    }
    await db.items.insert_one(doc)
    return ItemResponse(**doc)

@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(
    status: Optional[str] = None,
    item_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(None, ge=1, le=500, description="Max results (default: unlimited, max: 500)"),
    include_deleted: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {**current_user.get_store_filter()}
    
    # CRITICAL: Always exclude deleted items unless explicitly requested
    if not include_deleted:
        query["status"] = {"$nin": ["deleted"]}
    
    # Apply status filter (only if not "all")
    if status and status != "all":
        # Override the $nin query with specific status
        query["status"] = status
    
    if item_type:
        query["item_type"] = item_type
    if category:
        query["category"] = category
    if search:
        # Sanitize search term
        clean_search = search.strip()
        if clean_search:
            # Search by internal_code, barcode, barcode_2, serial_number, brand, model, size, name, item_type
            search_conditions = [
                {"internal_code": {"$regex": clean_search, "$options": "i"}},
                {"barcode": {"$regex": clean_search, "$options": "i"}},
                {"barcode_2": {"$regex": clean_search, "$options": "i"}},  # Secondary barcode search
                {"serial_number": {"$regex": clean_search, "$options": "i"}},
                {"brand": {"$regex": clean_search, "$options": "i"}},
                {"model": {"$regex": clean_search, "$options": "i"}},
                {"size": {"$regex": clean_search, "$options": "i"}},
                {"name": {"$regex": clean_search, "$options": "i"}},
                {"item_type": {"$regex": clean_search, "$options": "i"}}  # AÑADIDO: Buscar por tipo de artículo
            ]
            # If we have other conditions, we need to combine with $and
            if query:
                existing_query = dict(query)
                query = {"$and": [existing_query, {"$or": search_conditions}]}
            else:
                query["$or"] = search_conditions
    
    # OPTIMIZACIÓN: Aplicar límite para rendimiento (default: sin límite para compatibilidad)
    max_results = limit if limit else None
    items = await db.items.find(query, {"_id": 0}).to_list(max_results)
    return [ItemResponse(**i) for i in items]

@api_router.get("/items/by-barcodes")
async def get_items_by_barcodes(
    barcodes: str = Query(..., description="Comma-separated list of barcodes"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get items by their barcodes - used to enrich rental items with internal_code
    """
    barcode_list = [b.strip() for b in barcodes.split(',') if b.strip()]
    if not barcode_list:
        return []
    
    query = {
        **current_user.get_store_filter(),
        "barcode": {"$in": barcode_list}
    }
    
    items = await db.items.find(query, {
        "_id": 0,
        "barcode": 1,
        "internal_code": 1,
        "item_type": 1,
        "brand": 1,
        "model": 1
    }).to_list(None)
    
    return items

@api_router.get("/items/paginated/list")
async def get_items_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(500, ge=10, le=1000),
    status: Optional[str] = None,
    item_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_deleted: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get items with server-side pagination for handling large inventories (50K+ items)
    Optimized for scroll-infinite pattern with minimal data transfer
    """
    query = {**current_user.get_store_filter()}
    
    # CRITICAL: Always exclude deleted items unless explicitly requested
    if not include_deleted:
        query["status"] = {"$nin": ["deleted"]}
    
    # Apply status filter
    if status and status != "all":
        query["status"] = status
    
    if item_type and item_type != "all":
        query["item_type"] = item_type
        
    if category and category != "all":
        query["category"] = category
    
    # Search filter
    if search and search.strip():
        search_conditions = [
            {"internal_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"barcode_2": {"$regex": search, "$options": "i"}},
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"size": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
        if query:
            existing_query = dict(query)
            query = {"$and": [existing_query, {"$or": search_conditions}]}
        else:
            query["$or"] = search_conditions
    
    # Calculate total count
    total = await db.items.count_documents(query)
    
    # Get paginated items with minimal fields for list view
    skip = (page - 1) * limit
    items = await db.items.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "internal_code": 1,
            "barcode": 1,
            "barcode_2": 1,
            "serial_number": 1,
            "item_type": 1,
            "brand": 1,
            "model": 1,
            "size": 1,
            "status": 1,
            "category": 1,
            "days_used": 1,
            "maintenance_interval": 1,
            "is_generic": 1,
            "name": 1,
            "stock_total": 1,
            "stock_available": 1
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

@api_router.get("/items/stats/summary")
async def get_items_stats(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get inventory statistics without loading all records - optimized for large datasets
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    total = await db.items.count_documents({**store_filter, "status": {"$nin": ["deleted"]}})
    available = await db.items.count_documents({**store_filter, "status": "available"})
    rented = await db.items.count_documents({**store_filter, "status": "rented"})
    maintenance = await db.items.count_documents({**store_filter, "status": "maintenance"})
    retired = await db.items.count_documents({**store_filter, "status": "retired"})
    
    return {
        "total": total,
        "available": available,
        "rented": rented,
        "maintenance": maintenance,
        "retired": retired
    }

@api_router.get("/items/generic")
async def get_generic_items(
    item_type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all generic items with available stock"""
    query = {**current_user.get_store_filter(), "is_generic": True, "stock_available": {"$gt": 0}}
    if item_type:
        query["item_type"] = item_type
    
    items = await db.items.find(query, {"_id": 0}).to_list(5000)
    return [ItemResponse(**i) for i in items]


@api_router.get("/items/quick-add")
async def get_quick_add_items(current_user: CurrentUser = Depends(get_current_user)):
    """Get all items marked for quick add (Añadir Rápido) section"""
    query = {
        **current_user.get_store_filter(),
        "is_quick_add": True,
        "$or": [
            # Generic items with available stock
            {"is_generic": True, "stock_available": {"$gt": 0}},
            # Individual items that are available
            {"is_generic": {"$ne": True}, "status": "available"}
        ]
    }
    
    items = await db.items.find(query, {"_id": 0}).to_list(50)  # Limit to 50 quick add items
    return [ItemResponse(**i) for i in items]


@api_router.patch("/items/{item_id}/quick-add")
async def toggle_quick_add(
    item_id: str, 
    is_quick_add: bool,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Toggle quick add status for an item"""
    result = await db.items.update_one(
        {**current_user.get_store_filter(), "id": item_id},
        {"$set": {"is_quick_add": is_quick_add}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    return {"message": f"Acceso rápido {'activado' if is_quick_add else 'desactivado'}", "is_quick_add": is_quick_add}


@api_router.post("/items/{item_id}/adjust-stock")
async def adjust_generic_stock(
    item_id: str,
    adjustment: int,  # positive to add, negative to subtract
    current_user: CurrentUser = Depends(get_current_user)
):
    """Adjust stock for a generic item"""
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    if not item.get("is_generic"):
        raise HTTPException(status_code=400, detail="Este artículo no es genérico")
    
    new_available = item.get("stock_available", 0) + adjustment
    new_total = item.get("stock_total", 0)
    
    # If adding stock, also increase total
    if adjustment > 0:
        new_total += adjustment
    
    # Can't go below 0
    if new_available < 0:
        raise HTTPException(status_code=400, detail=f"Stock insuficiente. Disponible: {item.get('stock_available', 0)}")
    
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"stock_available": new_available, "stock_total": new_total}}
    )
    
    return {"stock_available": new_available, "stock_total": new_total}

@api_router.post("/items/generic/rent")
async def rent_generic_item(
    item_id: str,
    quantity: int = 1,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Rent units from a generic item (decreases available stock)"""
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    if not item.get("is_generic"):
        raise HTTPException(status_code=400, detail="Este artículo no es genérico")
    
    available = item.get("stock_available", 0)
    if available < quantity:
        raise HTTPException(status_code=400, detail=f"Stock insuficiente. Disponible: {available}, Solicitado: {quantity}")
    
    new_available = available - quantity
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"stock_available": new_available}}
    )
    
    return {"rented": quantity, "stock_available": new_available}

@api_router.post("/items/generic/return")
async def return_generic_item(
    item_id: str,
    quantity: int = 1,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Return units to a generic item (increases available stock)"""
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    if not item.get("is_generic"):
        raise HTTPException(status_code=400, detail="Este artículo no es genérico")
    
    available = item.get("stock_available", 0)
    total = item.get("stock_total", 0)
    new_available = min(available + quantity, total)  # Can't exceed total
    
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"stock_available": new_available}}
    )
    
    return {"returned": quantity, "stock_available": new_available}

@api_router.get("/items/with-profitability")
async def get_items_with_profitability(
    status: Optional[str] = None,
    item_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,  # "profit", "revenue", "amortization"
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all items with profitability metrics calculated from closed rentals"""
    query = {**current_user.get_store_filter()}
    
    # CRITICAL: Always exclude deleted items
    query["status"] = {"$nin": ["deleted"]}
    
    if status and status != "all":
        query["status"] = status
    if item_type:
        query["item_type"] = item_type
    if category:
        query["category"] = category
    if search:
        search_conditions = [
            {"internal_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"size": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
        if query:
            existing_query = dict(query)
            query = {"$and": [existing_query, {"$or": search_conditions}]}
        else:
            query["$or"] = search_conditions
    
    items = await db.items.find(query, {"_id": 0}).to_list(10000)
    
    # Get all closed rentals to calculate revenue per item
    closed_rentals = await db.rentals.find(
        {"status": "returned"},
        {"items": 1, "total_amount": 1, "days": 1, "_id": 0}
    ).to_list(10000)
    
    # Calculate revenue per item (by barcode or id)
    item_revenue = {}
    for rental in closed_rentals:
        rental_items = rental.get("items", [])
        if not rental_items:
            continue
        # Distribute revenue equally among items in the rental
        revenue_per_item = rental.get("total_amount", 0) / len(rental_items)
        for item in rental_items:
            item_id = item.get("id") or item.get("item_id")
            barcode = item.get("barcode")
            # Use barcode as key for matching
            if barcode:
                if barcode not in item_revenue:
                    item_revenue[barcode] = 0
                item_revenue[barcode] += revenue_per_item
            if item_id:
                if item_id not in item_revenue:
                    item_revenue[item_id] = 0
                item_revenue[item_id] += revenue_per_item
    
    # Add profitability data to each item
    items_with_profit = []
    total_revenue_all = 0
    total_profit_all = 0
    total_cost_all = 0
    amortized_count = 0
    
    for item in items:
        # Get revenue from either barcode or id match
        revenue = item_revenue.get(item.get("barcode"), 0)
        if item.get("id") in item_revenue:
            revenue = max(revenue, item_revenue.get(item.get("id"), 0))
        
        # Use acquisition_cost if set, otherwise fall back to purchase_price
        acquisition_cost = item.get("acquisition_cost") or item.get("purchase_price", 0)
        
        # Calculate metrics
        net_profit = revenue - acquisition_cost if acquisition_cost > 0 else revenue
        amortization_percent = (revenue / acquisition_cost * 100) if acquisition_cost > 0 else (100 if revenue > 0 else 0)
        
        item["total_revenue"] = round(revenue, 2)
        item["acquisition_cost"] = acquisition_cost
        item["net_profit"] = round(net_profit, 2)
        item["amortization_percent"] = round(amortization_percent, 1)
        
        items_with_profit.append(item)
        
        # Aggregate stats
        total_revenue_all += revenue
        total_cost_all += acquisition_cost
        total_profit_all += net_profit
        if amortization_percent >= 100:
            amortized_count += 1
    
    # Sort if requested
    if sort_by == "profit":
        items_with_profit.sort(key=lambda x: x.get("net_profit", 0), reverse=True)
    elif sort_by == "revenue":
        items_with_profit.sort(key=lambda x: x.get("total_revenue", 0), reverse=True)
    elif sort_by == "amortization":
        items_with_profit.sort(key=lambda x: x.get("amortization_percent", 0), reverse=True)
    elif sort_by == "profit_asc":
        items_with_profit.sort(key=lambda x: x.get("net_profit", 0))
    
    return {
        "items": items_with_profit,
        "summary": {
            "total_items": len(items_with_profit),
            "total_revenue": round(total_revenue_all, 2),
            "total_cost": round(total_cost_all, 2),
            "total_profit": round(total_profit_all, 2),
            "amortized_count": amortized_count,
            "amortized_percent": round(amortized_count / len(items_with_profit) * 100, 1) if items_with_profit else 0
        }
    }

@api_router.get("/items/{item_id}/profitability")
async def get_item_profitability(item_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Get detailed profitability data for a specific item.
    
    Calculates:
    - Total revenue from all rentals
    - Net profit (revenue - purchase price)
    - Amortization percentage
    - Rental history summary
    """
    # Get the item
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    # Get purchase price (cost of investment)
    purchase_price = item.get("acquisition_cost") or item.get("purchase_price", 0)
    
    # Find ALL rentals that include this item (by barcode or internal_code)
    item_barcode = item.get("barcode")
    item_internal_code = item.get("internal_code")
    
    # Build query to find rentals with this item
    rental_query = {"$or": []}
    if item_barcode:
        rental_query["$or"].append({"items.barcode": item_barcode})
    if item_internal_code:
        rental_query["$or"].append({"items.internal_code": item_internal_code})
    
    # If no identifiers, try item_id directly
    if not rental_query["$or"]:
        rental_query = {"items.item_id": item_id}
    
    # Get all rentals containing this item
    rentals = await db.rentals.find(rental_query).to_list(1000)
    
    # Calculate total revenue from this specific item
    total_revenue = 0
    rental_count = 0
    rental_history = []
    
    for rental in rentals:
        for rental_item in rental.get("items", []):
            # Check if this is our item
            item_match = (
                (item_barcode and rental_item.get("barcode") == item_barcode) or
                (item_internal_code and rental_item.get("internal_code") == item_internal_code) or
                (rental_item.get("item_id") == item_id)
            )
            if item_match:
                item_revenue = rental_item.get("subtotal", 0)
                total_revenue += item_revenue
                rental_count += 1
                rental_history.append({
                    "rental_id": rental.get("id"),
                    "date": rental.get("start_date"),
                    "customer": rental.get("customer_name"),
                    "days": rental.get("days", 1),
                    "revenue": item_revenue,
                    "status": rental.get("status")
                })
    
    # Calculate metrics
    net_profit = total_revenue - purchase_price
    amortization_percent = (total_revenue / purchase_price * 100) if purchase_price > 0 else (100 if total_revenue > 0 else 0)
    is_amortized = amortization_percent >= 100
    
    return {
        "item_id": item_id,
        "item_name": f"{item.get('brand', '')} {item.get('model', '')}".strip() or item.get('name', 'Artículo'),
        "internal_code": item_internal_code,
        "purchase_price": round(purchase_price, 2),
        "total_revenue": round(total_revenue, 2),
        "net_profit": round(net_profit, 2),
        "amortization_percent": round(min(amortization_percent, 999), 1),  # Cap at 999%
        "rental_count": rental_count,
        "is_amortized": is_amortized,
        "rental_history": rental_history[-10:],  # Last 10 rentals
        "has_purchase_price": purchase_price > 0
    }

@api_router.get("/items/barcode/{barcode}", response_model=ItemResponse)
async def get_item_by_barcode(barcode: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Búsqueda multi-campo optimizada para mostrador/escáner.
    Busca en: internal_code, barcode, barcode_2, serial_number
    Con sanitización automática de entrada.
    """
    import re
    
    # SANITIZACIÓN: Limpiar entrada
    clean_code = barcode.strip()
    if not clean_code:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Variantes para búsqueda flexible (con y sin ceros a la izquierda)
    search_variants = [clean_code]
    
    # Sin ceros a la izquierda
    code_no_leading_zeros = clean_code.lstrip('0')
    if code_no_leading_zeros and code_no_leading_zeros != clean_code:
        search_variants.append(code_no_leading_zeros)
    
    # Con ceros a la izquierda (hasta 10 dígitos)
    if clean_code.isdigit():
        for padding in [4, 6, 8, 10, 12, 13]:  # Common barcode lengths
            padded = clean_code.zfill(padding)
            if padded not in search_variants:
                search_variants.append(padded)
    
    store_filter = current_user.get_store_filter()
    
    # Búsqueda en todos los campos de identificación
    for variant in search_variants:
        # Try exact match first (fastest)
        item = await db.items.find_one(
            {**store_filter, "internal_code": variant}, 
            {"_id": 0}
        )
        if item:
            return ItemResponse(**item)
        
        item = await db.items.find_one(
            {**store_filter, "barcode": variant}, 
            {"_id": 0}
        )
        if item:
            return ItemResponse(**item)
        
        item = await db.items.find_one(
            {**store_filter, "barcode_2": variant}, 
            {"_id": 0}
        )
        if item:
            return ItemResponse(**item)
        
        item = await db.items.find_one(
            {**store_filter, "serial_number": variant}, 
            {"_id": 0}
        )
        if item:
            return ItemResponse(**item)
    
    # Case-insensitive fallback search
    regex_pattern = {"$regex": f"^{re.escape(clean_code)}$", "$options": "i"}
    item = await db.items.find_one(
        {**store_filter, "$or": [
            {"internal_code": regex_pattern},
            {"barcode": regex_pattern},
            {"barcode_2": regex_pattern},
            {"serial_number": regex_pattern}
        ]},
        {"_id": 0}
    )
    if item:
        return ItemResponse(**item)
    
    raise HTTPException(status_code=404, detail="Item not found")


@api_router.get("/items/check-barcode/{barcode}")
async def check_barcode_exists(barcode: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Check if a barcode/internal_code already exists. Returns the item if found, or null if not.
    Used for scanner quick-entry mode to avoid duplicates and open existing items.
    """
    barcode = barcode.strip()
    if not barcode:
        return {"exists": False, "item": None}
    
    # Search in all barcode fields
    item = await db.items.find_one({**current_user.get_store_filter(), **{"internal_code": barcode}}, {"_id": 0})
    if not item:
        item = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": barcode}}, {"_id": 0})
    if not item:
        item = await db.items.find_one({**current_user.get_store_filter(), **{"barcode_2": barcode}}, {"_id": 0})
    
    if item:
        return {"exists": True, "item": ItemResponse(**item)}
    return {"exists": False, "item": None}


@api_router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, item: ItemCreate, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if internal_code changed and new code exists
    if item.internal_code != existing.get("internal_code", ""):
        code_exists = await db.items.find_one({**current_user.get_store_filter(), **{"internal_code": item.internal_code, "id": {"$ne": item_id}}})
        if code_exists:
            raise HTTPException(status_code=400, detail=f"Internal code '{item.internal_code}' already exists")
    
    # Check if barcode changed and new barcode exists
    if item.barcode != existing["barcode"]:
        barcode_exists = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item.barcode, "id": {"$ne": item_id}}})
        if barcode_exists:
            raise HTTPException(status_code=400, detail="Barcode already exists")
    
    # ⚠️  CRITICAL: Normalize item_type to prevent duplicates
    normalized_item_type = normalize_type_name(item.item_type)
    if not normalized_item_type:
        raise HTTPException(status_code=400, detail="El tipo de artículo no puede estar vacío")
    
    update_doc = {
        "barcode": item.barcode,
        "barcode_2": item.barcode_2 or "",  # Secondary barcode
        "internal_code": item.internal_code,
        "serial_number": item.serial_number or "",
        "item_type": normalized_item_type,  # ✅ NORMALIZED
        "brand": item.brand,
        "model": item.model,
        "size": item.size,
        "binding": item.binding or "",
        "purchase_price": item.purchase_price,
        "rental_price": item.rental_price,  # Rental price per day
        "purchase_date": item.purchase_date,
        "location": item.location or "",
        "category": "STANDARD",  # All individual items are STANDARD
        "maintenance_interval": item.maintenance_interval or 30
    }
    # Only update status if explicitly provided (manual override)
    if item.status and item.status in ["available", "rented", "maintenance", "retired"]:
        update_doc["status"] = item.status
    # Update quick add flag if provided
    if item.is_quick_add is not None:
        update_doc["is_quick_add"] = item.is_quick_add
    await db.items.update_one({**current_user.get_store_filter(), "id": item_id}, {"$set": update_doc})
    
    updated = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}}, {"_id": 0})
    return ItemResponse(**updated)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, force: bool = Query(False), current_user: CurrentUser = Depends(get_current_user)):
    """Delete an item permanently or mark as deleted if has history"""
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if item is currently rented
    if item.get("status") == "rented":
        raise HTTPException(status_code=400, detail="No se puede eliminar un artículo alquilado")
    
    item_type = item.get("item_type", "")
    
    # Check if item has rental history
    rental_history = await db.rentals.count_documents({
        "items.item_id": item_id
    })
    
    # Also check by barcode for legacy rentals
    if rental_history == 0 and item.get("barcode"):
        rental_history = await db.rentals.count_documents({
            "items.barcode": item.get("barcode")
        })
    
    if rental_history > 0 and not force:
        # Item has history - mark as deleted (soft delete) instead of physical delete
        await db.items.update_one(
            {"id": item_id}, 
            {"$set": {
                "status": "deleted",
                "deleted_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        # AUTO-CLEANUP: Check if type should be removed
        await auto_cleanup_empty_type(current_user.store_id, item_type)
        return {"message": "Artículo dado de baja (tiene historial)", "action": "soft_delete", "deleted": True}
    
    # No history or force=True - physical delete
    result = await db.items.delete_one({**current_user.get_store_filter(), "id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Error al eliminar el artículo")
    
    # AUTO-CLEANUP: Check if type should be removed after deletion
    await auto_cleanup_empty_type(current_user.store_id, item_type)
    
    return {"message": "Artículo eliminado permanentemente", "action": "hard_delete", "deleted": True}


# ============== HELPER FUNCTIONS FOR DYNAMIC TYPE MANAGEMENT ==============

def normalize_type_name(type_name: str) -> str:
    """Normalize type name for consistent storage and comparison"""
    if not type_name:
        return ""
    # Lowercase, strip whitespace, replace spaces with underscores
    normalized = type_name.lower().strip()
    # Remove accents
    accents = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u'}
    for acc, repl in accents.items():
        normalized = normalized.replace(acc, repl)
    # Replace multiple spaces/underscores with single underscore
    import re
    normalized = re.sub(r'[\s_]+', '_', normalized)
    # Remove trailing underscores
    normalized = normalized.strip('_')
    return normalized


def format_type_label(normalized_value: str) -> str:
    """Create human-readable label from normalized value"""
    return normalized_value.replace('_', ' ').title()


async def ensure_type_and_tariff_exist(store_id: int, type_name: str) -> dict:
    """
    Ensure a type and its tariff exist for the store.
    Creates them if they don't exist.
    Returns dict with: normalized_type, tariff_id, daily_rate
    GARANTIZA que siempre devuelve tariff_id y daily_rate válidos.
    """
    normalized = normalize_type_name(type_name)
    if not normalized:
        normalized = "general"  # Fallback para tipos vacíos
    
    store_filter = {"store_id": store_id}
    
    # Check if type exists
    existing_type = await db.item_types.find_one({**store_filter, "value": normalized})
    
    if not existing_type:
        # Create new type
        type_doc = {
            "id": str(uuid.uuid4()),
            "store_id": store_id,
            "value": normalized,
            "label": format_type_label(normalized),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_types.insert_one(type_doc)
        logger.info(f"✅ Auto-created type '{normalized}' for store {store_id}")
    
    # Check if tariff exists
    existing_tariff = await db.tariffs.find_one({**store_filter, "item_type": normalized})
    
    if not existing_tariff:
        # Create default tariff with price 0
        tariff_id = str(uuid.uuid4())
        tariff_doc = {
            "id": tariff_id,
            "store_id": store_id,
            "item_type": normalized,
            "daily_rate": 0.0,
            "deposit": 0.0,
            "name": format_type_label(normalized),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tariffs.insert_one(tariff_doc)
        logger.info(f"✅ Auto-created tariff for type '{normalized}' with price 0€ for store {store_id}")
        
        return {
            "normalized_type": normalized,
            "tariff_id": tariff_id,
            "daily_rate": 0.0
        }
    
    # Tariff exists - return its data
    return {
        "normalized_type": normalized,
        "tariff_id": existing_tariff.get("id", ""),
        "daily_rate": existing_tariff.get("daily_rate", 0.0)
    }


async def auto_cleanup_empty_type(store_id: int, type_value: str):
    """
    AUTO-CLEANUP: Remove type and tariff if no items remain.
    Called after item deletion.
    """
    if not type_value:
        return
    
    normalized = normalize_type_name(type_value)
    store_filter = {"store_id": store_id}
    
    # Count remaining items of this type (excluding deleted)
    remaining_items = await db.items.count_documents({
        **store_filter,
        "item_type": normalized,
        "status": {"$nin": ["deleted"]}
    })
    
    if remaining_items == 0:
        # No items left - remove type and tariff
        type_deleted = await db.item_types.delete_one({**store_filter, "value": normalized})
        tariff_deleted = await db.tariffs.delete_one({**store_filter, "item_type": normalized})
        
        if type_deleted.deleted_count > 0 or tariff_deleted.deleted_count > 0:
            logger.info(f"🧹 Auto-cleanup: Removed empty type '{normalized}' from store {store_id}")


async def sync_item_types_from_inventory(store_id: int) -> dict:
    """
    🔄 SELF-HEALING: Sincroniza la tabla item_types con el inventario real.
    
    Escanea todos los tipos DISTINCT que existen en los artículos de la tienda.
    Si encuentra un tipo que no tiene ficha en la tabla item_types, LO CREA automáticamente.
    
    Esto garantiza que el sistema de tarifas pueda funcionar correctamente.
    
    Ejecutar después de:
    - Cada importación CSV
    - Al cargar la página de Inventario (o periódicamente)
    
    Returns: dict con stats de sincronización
    """
    store_filter = {"store_id": store_id}
    
    # Obtener todos los tipos DISTINCT del inventario (fuente de verdad)
    inventory_types = await db.items.distinct("item_type", store_filter)
    inventory_types = [t for t in inventory_types if t and t.strip()]
    
    # Obtener tipos existentes en la tabla
    existing_type_docs = await db.item_types.find(store_filter, {"_id": 0, "value": 1}).to_list(5000)
    existing_type_values = {doc["value"] for doc in existing_type_docs}
    
    # Encontrar tipos faltantes
    missing_types = [t for t in inventory_types if t not in existing_type_values]
    
    # Crear los tipos faltantes
    created_count = 0
    for type_value in missing_types:
        type_doc = {
            "id": str(uuid.uuid4()),
            "store_id": store_id,
            "value": type_value,
            "label": format_type_label(type_value),
            "is_default": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_types.insert_one(type_doc)
        
        # También crear tarifa si no existe
        tariff_exists = await db.tariffs.find_one({**store_filter, "item_type": type_value})
        if not tariff_exists:
            tariff_doc = {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "item_type": type_value,
                "daily_rate": 0.0,
                "deposit": 0.0,
                "name": format_type_label(type_value),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tariffs.insert_one(tariff_doc)
        
        created_count += 1
        logger.info(f"🔄 Self-healing: Created type+tariff '{type_value}' for store {store_id}")
    
    return {
        "inventory_types_count": len(inventory_types),
        "existing_types_count": len(existing_type_values),
        "created_count": created_count,
        "synced": True
    }

# ==================== ITEM TYPES ROUTES ====================

@api_router.get("/item-types", response_model=List[ItemTypeResponse])
async def get_item_types(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get all item types - CRITICAL FIX: Lee DIRECTAMENTE del inventario (DISTINCT) + DEDUPLICA
    
    Esto garantiza matemáticamente que:
    - Si un tipo existe en un artículo → aparecerá en el filtro
    - Si se borran todos los artículos de un tipo → desaparecerá del filtro
    - SIEMPRE deduplica tipos similares (ej: "bota" y "Bota" → solo "bota")
    - No depende de la sincronización de la tabla item_types
    
    La fuente de verdad es SIEMPRE el inventario real.
    """
    # Multi-tenant: Filter by store_id
    store_filter = current_user.get_store_filter()
    
    # DISTINCT: Obtener todos los tipos únicos que REALMENTE EXISTEN en el inventario
    distinct_types = await db.items.distinct("item_type", store_filter)
    
    # Filtrar valores nulos/vacíos
    distinct_types = [t for t in distinct_types if t and t.strip()]
    
    # 🔥 DEDUPLICACIÓN: Agrupar por valor normalizado
    # Si hay "bota snowboard" y "bota_snowboard", solo se mostrará uno
    normalized_map = {}  # normalized_value -> original_value (primer encontrado)
    
    for original_value in distinct_types:
        normalized = normalize_type_name(original_value)
        
        # Si ya existe este normalizado, ignorar (usar el primero encontrado)
        if normalized not in normalized_map:
            normalized_map[normalized] = original_value
    
    # Usar solo los valores deduplicados
    deduplicated_types = list(normalized_map.values())
    deduplicated_types.sort()
    
    logger.info(f"[ITEM TYPES] Original distinct: {len(distinct_types)}, After dedup: {len(deduplicated_types)}")
    
    # Obtener labels personalizados de la tabla item_types (si existen)
    type_docs = await db.item_types.find(store_filter, {"_id": 0}).to_list(5000)
    type_labels = {t["value"]: t["label"] for t in type_docs if "value" in t and "label" in t}
    
    # Construir respuesta: usar label personalizado si existe, sino usar el valor tal cual
    # También obtener created_at si existe
    type_created_at = {t["value"]: t.get("created_at", "") for t in type_docs if "value" in t}
    
    result = []
    for type_value in deduplicated_types:  # ✅ USAR DEDUPLICADOS
        result.append(ItemTypeResponse(
            id=type_value,  # Para compatibilidad
            value=type_value,
            label=type_labels.get(type_value, type_value.replace('_', ' ').title()),
            is_default=False,
            created_at=type_created_at.get(type_value, datetime.now(timezone.utc).isoformat())
        ))
    
    return result

@api_router.post("/item-types/sync")
async def sync_item_types(current_user: CurrentUser = Depends(get_current_user)):
    """
    🔄 SELF-HEALING: Sincroniza la tabla item_types con el inventario real.
    
    Escanea todos los tipos que existen en artículos pero no tienen ficha en item_types,
    y los crea automáticamente con sus tarifas (precio 0 por defecto).
    
    Ejecutar después de importaciones o cuando los filtros no muestren todos los tipos.
    """
    try:
        sync_result = await sync_item_types_from_inventory(current_user.store_id)
        
        if sync_result["created_count"] > 0:
            return {
                "message": f"✅ Sincronización completada: {sync_result['created_count']} tipos creados",
                "stats": sync_result
            }
        else:
            return {
                "message": "✅ Sincronización completada: Todo estaba al día",
                "stats": sync_result
            }
    except Exception as e:
        logger.error(f"Error syncing item types: {e}")
        raise HTTPException(status_code=500, detail=f"Error al sincronizar tipos: {str(e)}")

@api_router.post("/item-types", response_model=ItemTypeResponse)
async def create_item_type(item_type: ItemTypeCreate, current_user: CurrentUser = Depends(get_current_user)):
    """Create a new custom item type"""
    # Normalize value (lowercase, no spaces)
    normalized_value = item_type.value.lower().replace(" ", "_")
    
    # Multi-tenant: Check existing within same store
    existing = await db.item_types.find_one({**current_user.get_store_filter(), "value": normalized_value})
    if existing:
        raise HTTPException(status_code=400, detail="Este tipo ya existe")
    
    type_id = str(uuid.uuid4())
    doc = {
        "id": type_id,
        "store_id": current_user.store_id,  # Multi-tenant: Add store_id
        "value": normalized_value,
        "label": item_type.label,
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.item_types.insert_one(doc)
    return ItemTypeResponse(**doc)

@api_router.delete("/item-types/{type_id}")
async def delete_item_type(
    type_id: str, 
    force: bool = Query(False, description="Forzar eliminación incluyendo artículos archivados/retirados"),
    reassign_to: str = Query(None, description="Reasignar artículos activos a este tipo antes de eliminar"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a custom item type with smart handling of linked items"""
    # Multi-tenant: Check item_type exists in same store
    item_type = await db.item_types.find_one({**current_user.get_store_filter(), "id": type_id})
    if not item_type:
        raise HTTPException(status_code=404, detail="Tipo de artículo no encontrado")
    
    type_value = item_type["value"]
    
    # Count items by status (within same store)
    total_items = await db.items.count_documents({**current_user.get_store_filter(), "item_type": type_value})
    active_items = await db.items.count_documents({
        **current_user.get_store_filter(),
        "item_type": type_value,
        "status": {"$in": ["available", "rented", "maintenance"]}
    })
    ghost_items = await db.items.count_documents({
        **current_user.get_store_filter(),
        "item_type": type_value,
        "status": {"$in": ["retired", "deleted", "archived"]},
    })
    soft_deleted = await db.items.count_documents({
        **current_user.get_store_filter(),
        "item_type": type_value,
        "deleted_at": {"$exists": True, "$ne": None}
    })
    
    # Case 1: No items at all - delete directly
    if total_items == 0:
        await db.item_types.delete_one({**current_user.get_store_filter(), "id": type_id})
        # Also delete associated tariff (within same store)
        await db.tariffs.delete_one({**current_user.get_store_filter(), "item_type": type_value})
        return {"message": "Tipo eliminado correctamente", "deleted_tariff": True}
    
    # Case 2: Only ghost/retired items and force=True - clean them up
    if force and active_items == 0 and ghost_items > 0:
        # Delete ghost items permanently (within same store)
        await db.items.delete_many({
            **current_user.get_store_filter(),
            "item_type": type_value,
            "status": {"$in": ["retired", "deleted", "archived"]}
        })
        # Delete soft-deleted items (within same store)
        await db.items.delete_many({
            **current_user.get_store_filter(),
            "item_type": type_value,
            "deleted_at": {"$exists": True, "$ne": None}
        })
        # Now delete the type
        await db.item_types.delete_one({**current_user.get_store_filter(), "id": type_id})
        await db.tariffs.delete_one({**current_user.get_store_filter(), "item_type": type_value})
        return {
            "message": f"Tipo eliminado. Se eliminaron {ghost_items + soft_deleted} artículos fantasma.",
            "deleted_ghost_items": ghost_items + soft_deleted
        }
    
    # Case 3: Active items exist but reassign_to is provided
    if active_items > 0 and reassign_to:
        # Verify target type exists (within same store)
        target_type = await db.item_types.find_one({**current_user.get_store_filter(), "value": reassign_to})
        if not target_type:
            raise HTTPException(status_code=400, detail=f"El tipo de destino '{reassign_to}' no existe")
        
        # Reassign active items (within same store)
        await db.items.update_many(
            {**current_user.get_store_filter(), "item_type": type_value, "status": {"$in": ["available", "rented", "maintenance"]}},
            {"$set": {"item_type": reassign_to}}
        )
        
        # Delete ghost items if force=True (within same store)
        if force:
            await db.items.delete_many({
                **current_user.get_store_filter(),
                "item_type": type_value,
                "status": {"$in": ["retired", "deleted", "archived"]}
            })
        
        # Delete the type
        await db.item_types.delete_one({**current_user.get_store_filter(), "id": type_id})
        await db.tariffs.delete_one({**current_user.get_store_filter(), "item_type": type_value})
        return {
            "message": f"Tipo eliminado. {active_items} artículos reasignados a '{reassign_to}'.",
            "reassigned": active_items
        }
    
    # Case 4: Active items exist and no reassignment - block with detailed info
    if active_items > 0:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"No se puede eliminar: hay {active_items} artículos activos usando este tipo.",
                "total_items": total_items,
                "active_items": active_items,
                "ghost_items": ghost_items,
                "soft_deleted": soft_deleted,
                "suggestion": "Usa ?force=true para eliminar artículos fantasma, o ?reassign_to=OTRO_TIPO para reasignar los activos."
            }
        )
    
    # Case 5: Only ghost items but force=False - require confirmation
    raise HTTPException(
        status_code=400,
        detail={
            "error": f"Hay {ghost_items + soft_deleted} artículos archivados/eliminados usando este tipo.",
            "ghost_items": ghost_items,
            "soft_deleted": soft_deleted,
            "suggestion": "Usa ?force=true para eliminarlos automáticamente."
        }
    )

@api_router.post("/item-types/{type_id}/cleanup")
async def cleanup_item_type(type_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Clean up ghost items for a type (retired, deleted, archived, soft-deleted)
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    item_type = await db.item_types.find_one({**store_filter, "id": type_id})
    if not item_type:
        raise HTTPException(status_code=404, detail="Tipo de artículo no encontrado")
    
    type_value = item_type["value"]
    
    # Delete ghost items - Multi-tenant: Filter by store
    result1 = await db.items.delete_many({
        **store_filter,
        "item_type": type_value,
        "status": {"$in": ["retired", "deleted", "archived"]}
    })
    
    # Delete soft-deleted items - Multi-tenant: Filter by store
    result2 = await db.items.delete_many({
        **store_filter,
        "item_type": type_value,
        "deleted_at": {"$exists": True, "$ne": None}
    })
    
    total_deleted = result1.deleted_count + result2.deleted_count
    
    return {
        "message": f"Limpieza completada. {total_deleted} artículos fantasma eliminados.",
        "deleted_retired": result1.deleted_count,
        "deleted_soft": result2.deleted_count
    }

@api_router.post("/items/cleanup-orphans")
async def cleanup_orphan_items(current_user: CurrentUser = Depends(get_current_user)):
    """Find and clean up items with types that no longer exist
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    # Get all valid type values for this store
    valid_types = await db.item_types.distinct("value", store_filter)
    
    # Find items with invalid types - Multi-tenant: Filter by store
    orphan_items = await db.items.find(
        {**store_filter, "item_type": {"$nin": valid_types}},
        {"_id": 0, "id": 1, "item_type": 1, "barcode": 1, "status": 1}
    ).to_list(1000)
    
    if not orphan_items:
        return {"message": "No se encontraron artículos huérfanos.", "orphans": []}
    
    # Get unique orphan types
    orphan_types = list(set(i["item_type"] for i in orphan_items if i.get("item_type")))
    
    return {
        "message": f"Encontrados {len(orphan_items)} artículos huérfanos con {len(orphan_types)} tipos inválidos.",
        "orphan_types": orphan_types,
        "orphan_count": len(orphan_items),
        "sample_items": orphan_items[:10]
    }

@api_router.post("/item-types/migrate-legacy")
async def migrate_legacy_types(current_user: CurrentUser = Depends(get_current_user)):
    """Migrate items with legacy hardcoded types to 'sin_categoria' or create new custom types
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    legacy_types = ["ski", "snowboard", "boots", "helmet", "poles", "goggles"]
    legacy_labels = {
        "ski": "Esquís", "snowboard": "Snowboard", "boots": "Botas",
        "helmet": "Casco", "poles": "Bastones", "goggles": "Máscara"
    }
    
    migrated = []
    
    for legacy_type in legacy_types:
        # Count items with this legacy type - Multi-tenant: Filter by store
        count = await db.items.count_documents({**store_filter, "item_type": legacy_type})
        if count > 0:
            # Check if custom type already exists for this store
            existing = await db.item_types.find_one({**store_filter, "value": legacy_type})
            if not existing:
                # Create custom type to preserve the data - Multi-tenant: Add store_id
                type_id = str(uuid.uuid4())
                doc = {
                    "id": type_id,
                    "store_id": current_user.store_id,
                    "value": legacy_type,
                    "label": legacy_labels.get(legacy_type, legacy_type.capitalize()),
                    "is_default": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.item_types.insert_one(doc)
                migrated.append({"type": legacy_type, "items_count": count, "action": "created_custom_type"})
            else:
                migrated.append({"type": legacy_type, "items_count": count, "action": "already_exists"})
    
    return {"migrated": migrated, "message": "Migración completada"}

@api_router.post("/item-types/reassign")
async def reassign_item_types(
    old_type: str,
    new_type: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Reassign all items from one type to another
    Multi-tenant: Filters by store_id
    """
    store_filter = current_user.get_store_filter()
    # Verify new type exists for this store
    new_type_doc = await db.item_types.find_one({**store_filter, "value": new_type})
    if not new_type_doc:
        raise HTTPException(status_code=404, detail="El tipo de destino no existe")
    
    # Update all items for this store
    result = await db.items.update_many(
        {**store_filter, "item_type": old_type},
        {"$set": {"item_type": new_type}}
    )
    
    return {"updated_count": result.modified_count, "message": f"{result.modified_count} artículos reasignados"}

@api_router.put("/items/{item_id}/status")
async def update_item_status(item_id: str, status: str = Query(...), current_user: CurrentUser = Depends(get_current_user)):
    result = await db.items.update_one({**current_user.get_store_filter(), "id": item_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Status updated"}

@api_router.post("/items/{item_id}/complete-maintenance")
async def complete_item_maintenance(item_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Complete maintenance for an item - RESETS ALL USAGE COUNTERS
    
    This endpoint:
    1. Resets days_used to 0
    2. Sets status to 'available'
    3. Records the maintenance completion
    
    Returns the updated item data.
    """
    # Find the item
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}})
    if not item:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    # Get current values for logging
    old_days_used = item.get("days_used", 0)
    old_status = item.get("status", "unknown")
    
    # Update the item: RESET ALL COUNTERS
    update_doc = {
        "days_used": 0,  # CRITICAL: Reset usage counter to 0
        "status": "available",  # Set status to available
        "last_maintenance_date": datetime.now(timezone.utc).isoformat(),
        "last_maintenance_by": current_user.get("username", "system")
    }
    
    result = await db.items.update_one({**current_user.get_store_filter(), "id": item_id}, {"$set": update_doc})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Error al actualizar el artículo")
    
    # Get the updated item
    updated_item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_id}}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Mantenimiento completado. Contadores reseteados a 0.",
        "item": updated_item,
        "reset_info": {
            "previous_days_used": old_days_used,
            "previous_status": old_status,
            "new_days_used": 0,
            "new_status": "available"
        }
    }

@api_router.post("/items/bulk")
async def create_items_bulk(data: BulkItemCreate, current_user: CurrentUser = Depends(get_current_user)):
    """Create multiple items at once"""
    created = []
    errors = []
    
    for item in data.items:
        existing = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item.barcode}})
        if existing:
            errors.append({"barcode": item.barcode, "error": "Already exists"})
            continue
        
        item_id = str(uuid.uuid4())
        
        # ⚠️  CRITICAL: Normalize item_type to prevent duplicates
        normalized_item_type = normalize_type_name(item.item_type)
        if not normalized_item_type:
            errors.append({"barcode": item.barcode, "error": "Empty item_type"})
            continue
        
        doc = {
            "id": item_id,
            "barcode": item.barcode,
            "item_type": normalized_item_type,  # ✅ NORMALIZED
            "brand": item.brand,
            "model": item.model,
            "size": item.size,
            "status": "available",
            "purchase_price": item.purchase_price,
            "purchase_date": item.purchase_date,
            "location": item.location or "",
            "maintenance_interval": item.maintenance_interval,
            "days_used": 0,
            "amortization": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.items.insert_one(doc)
        created.append(doc)
    
    return {"created": len(created), "errors": errors}

@api_router.post("/items/import-csv")
async def import_items_csv(file: UploadFile = File(...), current_user: CurrentUser = Depends(get_current_user)):
    """Import items from CSV file with automatic type AND tariff creation"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = []
    errors = []
    types_created = []
    
    for row in reader:
        try:
            barcode = row.get('barcode', row.get('codigo', '')).strip()
            if not barcode:
                errors.append({"row": row, "error": "Missing barcode"})
                continue
            
            existing = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": barcode}})
            if existing:
                errors.append({"barcode": barcode, "error": "Already exists"})
                continue
            
            # ============ AUTO-CREATE TYPE AND TARIFF (OBLIGATORIO) ============
            raw_item_type = row.get('item_type', row.get('tipo', row.get('type', 'general'))).strip()
            if not raw_item_type:
                raw_item_type = 'general'
            
            # Esta función GARANTIZA que tipo Y tarifa existen, y retorna tariff_id y precio
            type_tariff_data = await ensure_type_and_tariff_exist(current_user.store_id, raw_item_type)
            normalized_type = type_tariff_data["normalized_type"]
            tariff_id = type_tariff_data["tariff_id"]
            daily_rate = type_tariff_data["daily_rate"]
            
            if normalized_type not in types_created:
                type_check = await db.item_types.find_one({
                    "store_id": current_user.store_id, 
                    "value": normalized_type
                })
                if type_check and type_check.get("created_at", "").startswith(datetime.now(timezone.utc).strftime("%Y-%m-%d")):
                    types_created.append(normalized_type)
            # ===================================================================
            
            item_id = str(uuid.uuid4())
            doc = {
                "id": item_id,
                "store_id": current_user.store_id,
                "barcode": barcode,
                "item_type": normalized_type,
                "brand": row.get('brand', row.get('marca', '')).strip(),
                "model": row.get('model', row.get('modelo', '')).strip(),
                "size": row.get('size', row.get('talla', '')).strip(),
                "status": "available",
                "purchase_price": float(row.get('purchase_price', row.get('precio_coste', 0)) or 0),
                "purchase_date": row.get('purchase_date', row.get('fecha_compra', datetime.now().strftime('%Y-%m-%d'))).strip(),
                "location": row.get('location', row.get('ubicacion', '')).strip(),
                "maintenance_interval": int(row.get('maintenance_interval', row.get('mantenimiento_cada', 30)) or 30),
                "days_used": 0,
                "amortization": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                # ============ ASIGNACIÓN OBLIGATORIA DE TARIFA ============
                "tariff_id": tariff_id,  # SIEMPRE asignado
                "rental_price": daily_rate  # SIEMPRE asignado (puede ser 0 si tarifa nueva)
                # ==========================================================
            }
            
            await db.items.insert_one(doc)
            created.append({"barcode": barcode, "type": normalized_type})
        except Exception as e:
            errors.append({"barcode": row.get('barcode', 'unknown'), "error": str(e)})
    
    # 🔄 SELF-HEALING: Sincronizar tipos después de la importación
    try:
        await sync_item_types_from_inventory(current_user.store_id)
        logger.info(f"✅ Auto-sync after CSV import for store {current_user.store_id}")
    except Exception as e:
        logger.error(f"Error auto-syncing types after CSV import: {e}")
    
    return {
        "created": len(created), 
        "errors": errors, 
        "total_rows": len(created) + len(errors),
        "types_created": len(set(types_created)),
        "new_types": list(set(types_created))
    }

# Universal import endpoint for inventory (with field mapping)
class ItemImportItem(BaseModel):
    internal_code: str
    barcode: Optional[str] = ""
    serial_number: Optional[str] = ""
    item_type: str
    brand: str
    model: Optional[str] = ""
    size: str
    binding: Optional[str] = ""
    category: Optional[str] = "MEDIA"
    purchase_price: Optional[float] = 0
    purchase_date: Optional[str] = ""
    location: Optional[str] = ""

class ItemImportRequest(BaseModel):
    items: List[ItemImportItem]

@api_router.post("/items/import")
async def import_items(request: ItemImportRequest, current_user: CurrentUser = Depends(get_current_user)):
    """Import items with field mapping support, automatic type creation and tariff assignment"""
    imported = 0
    duplicates = 0
    errors = 0
    duplicate_codes = []
    types_created = []
    
    for item in request.items:
        try:
            internal_code = item.internal_code.strip().upper()
            if not internal_code or not item.item_type or not item.brand or not item.size:
                errors += 1
                continue
            
            # Check for duplicate by internal_code
            existing = await db.items.find_one({**current_user.get_store_filter(), **{"internal_code": internal_code}})
            if existing:
                duplicates += 1
                duplicate_codes.append(internal_code)
                continue
            
            # Check for duplicate barcode if provided
            if item.barcode and item.barcode.strip():
                existing_barcode = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item.barcode.strip()}})
                if existing_barcode:
                    duplicates += 1
                    duplicate_codes.append(f"{internal_code} (barcode)")
                    continue
            
            # ============ AUTO-CREATE TYPE AND TARIFF (OBLIGATORIO) ============
            raw_item_type = item.item_type.strip() if item.item_type else "general"
            
            # Esta función GARANTIZA que tipo Y tarifa existen
            type_tariff_data = await ensure_type_and_tariff_exist(current_user.store_id, raw_item_type)
            normalized_type = type_tariff_data["normalized_type"]
            tariff_id = type_tariff_data["tariff_id"]
            daily_rate = type_tariff_data["daily_rate"]
            
            if normalized_type not in types_created:
                type_check = await db.item_types.find_one({
                    "store_id": current_user.store_id, 
                    "value": normalized_type
                })
                if type_check and type_check.get("created_at", "").startswith(datetime.now(timezone.utc).strftime("%Y-%m-%d")):
                    types_created.append(normalized_type)
            # ===================================================================
            
            # Generate barcode if not provided
            barcode = item.barcode.strip() if item.barcode else internal_code
            
            item_id = str(uuid.uuid4())
            doc = {
                "id": item_id,
                "store_id": current_user.store_id,
                "internal_code": internal_code,
                "barcode": barcode,
                "serial_number": item.serial_number.strip() if item.serial_number else "",
                "item_type": normalized_type,
                "brand": item.brand.strip(),
                "model": item.model.strip() if item.model else "",
                "size": str(item.size).strip(),
                "binding": item.binding.strip() if item.binding else "",
                "category": "STANDARD",
                "status": "available",
                "purchase_price": float(item.purchase_price) if item.purchase_price else 0,
                "purchase_date": item.purchase_date.strip() if item.purchase_date else datetime.now().strftime('%Y-%m-%d'),
                "location": item.location.strip() if item.location else "",
                "maintenance_interval": 30,
                "days_used": 0,
                "amortization": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                # ============ ASIGNACIÓN OBLIGATORIA DE TARIFA ============
                "tariff_id": tariff_id,  # SIEMPRE asignado
                "rental_price": daily_rate  # SIEMPRE asignado
                # ==========================================================
            }
            
            await db.items.insert_one(doc)
            imported += 1
            
        except Exception as e:
            errors += 1
            print(f"Error importing item {item.internal_code}: {str(e)}")
    
    # 🔄 SELF-HEALING: Sincronizar tipos después de la importación
    try:
        await sync_item_types_from_inventory(current_user.store_id)
        logger.info(f"✅ Auto-sync after items import for store {current_user.store_id}")
    except Exception as e:
        logger.error(f"Error auto-syncing types after import: {e}")
    
    return {
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "duplicate_codes": duplicate_codes[:50],
        "types_created": len(set(types_created)),
        "new_types": list(set(types_created))
    }

@api_router.post("/items/generate-barcodes")
async def generate_barcodes(data: GenerateBarcodeRequest, current_user: CurrentUser = Depends(get_current_user)):
    """Generate unique barcodes"""
    barcodes = []
    timestamp = datetime.now().strftime('%y%m%d')
    
    # Get last barcode with prefix
    last = await db.items.find_one(
        {"barcode": {"$regex": f"^{data.prefix}"}},
        sort=[("barcode", -1)]
    )
    
    if last:
        try:
            last_num = int(last["barcode"][-6:])
        except:
            last_num = 0
    else:
        last_num = 0
    
    for i in range(data.count):
        next_num = last_num + i + 1
        barcode = f"{data.prefix}{timestamp}{next_num:06d}"
        barcodes.append(barcode)
    
    return {"barcodes": barcodes}

@api_router.get("/items/export-csv")
async def export_items_csv(current_user: CurrentUser = Depends(get_current_user)):
    """Export all items as CSV"""
    items = await db.items.find({**current_user.get_store_filter(), }, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    fieldnames = ['barcode', 'item_type', 'brand', 'model', 'size', 'status', 
                  'purchase_price', 'purchase_date', 'location', 'maintenance_interval', 
                  'days_used', 'amortization']
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for item in items:
        writer.writerow(item)
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventario.csv"}
    )

@api_router.get("/items/stats")
async def get_inventory_stats(current_user: CurrentUser = Depends(get_current_user)):
    """
    Calculate inventory stats with proper business logic:
    - Excludes 'retired', 'deleted', 'lost' (baja/perdido) from rentable total
    - Calculates occupancy_percent based on rentable inventory only
    - Does NOT double-count Pack components (counts real physical units)
    
    Multi-tenant: Filters by store_id
    """
    pipeline = [
        {"$match": current_user.get_store_filter()},  # Multi-tenant: Filter by store
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    stats = await db.items.aggregate(pipeline).to_list(20)
    
    result = {
        "available": 0, 
        "rented": 0, 
        "maintenance": 0, 
        "retired": 0,
        "lost": 0,
        "deleted": 0,
        "total": 0,           # Total bruto (todos los items)
        "rentable_total": 0,  # Total apto para alquilar (excluye retired/lost/deleted)
        "occupancy_percent": 0  # Porcentaje de ocupación sobre el inventario rentable
    }
    
    for s in stats:
        status = s["_id"] or "available"
        count = s["count"]
        
        if status in result:
            result[status] = count
        result["total"] += count
        
        # Rentable = available + rented + maintenance (excluye retired, lost, deleted)
        if status in ["available", "rented", "maintenance"]:
            result["rentable_total"] += count
    
    # Calculate occupancy percentage over RENTABLE inventory only
    # Formula: Stock_Ocupado = rented / (available + rented + maintenance) * 100
    if result["rentable_total"] > 0:
        result["occupancy_percent"] = round(
            (result["rented"] / result["rentable_total"]) * 100, 1
        )
    
    return result

# ==================== TARIFF ROUTES ====================

@api_router.post("/tariffs", response_model=TariffResponse)
async def create_tariff(tariff: TariffCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Check existing within same store
    existing = await db.tariffs.find_one({**current_user.get_store_filter(), "item_type": tariff.item_type})
    if existing:
        # Update existing tariff in same store
        await db.tariffs.update_one(
            {**current_user.get_store_filter(), "item_type": tariff.item_type}, 
            {"$set": tariff.model_dump()}
        )
        updated = await db.tariffs.find_one({**current_user.get_store_filter(), "item_type": tariff.item_type}, {"_id": 0})
        return TariffResponse(**updated)
    
    # Create new tariff with store_id
    tariff_id = str(uuid.uuid4())
    doc = {"id": tariff_id, "store_id": current_user.store_id, **tariff.model_dump()}
    await db.tariffs.insert_one(doc)
    return TariffResponse(**doc)

@api_router.get("/tariffs", response_model=List[TariffResponse])
async def get_tariffs(current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Filter by store_id
    tariffs = await db.tariffs.find(current_user.get_store_filter(), {"_id": 0}).to_list(20)
    return [TariffResponse(**t) for t in tariffs]

@api_router.get("/tariffs/{item_type}", response_model=TariffResponse)
async def get_tariff(item_type: str, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Filter by store_id
    tariff = await db.tariffs.find_one({**current_user.get_store_filter(), "item_type": item_type}, {"_id": 0})
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return TariffResponse(**tariff)

@api_router.delete("/tariffs/{item_type}")
async def delete_tariff(item_type: str, current_user: CurrentUser = Depends(get_current_user)):
    """Delete a tariff by item_type"""
    # Multi-tenant: Delete only from own store
    result = await db.tariffs.delete_one({**current_user.get_store_filter(), "item_type": item_type})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return {"status": "success", "deleted": item_type}


@api_router.put("/tariffs/{tariff_id}")
async def update_tariff(tariff_id: str, tariff: TariffCreate, current_user: CurrentUser = Depends(get_current_user)):
    """
    Update a tariff and PROPAGATE the price to all items with this tariff.
    This ensures items always have the correct rental_price.
    """
    # Find existing tariff
    existing = await db.tariffs.find_one({**current_user.get_store_filter(), "id": tariff_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tariff not found")
    
    # Update tariff
    update_data = tariff.model_dump()
    await db.tariffs.update_one(
        {"id": tariff_id},
        {"$set": update_data}
    )
    
    # PROPAGATE: Update rental_price in ALL items with this tariff
    # El precio base es day_1 (precio por 1 día)
    new_price = tariff.day_1 if tariff.day_1 is not None else 0.0
    item_type = existing.get("item_type", "")
    
    propagate_result = await db.items.update_many(
        {**current_user.get_store_filter(), "tariff_id": tariff_id},
        {"$set": {"rental_price": new_price}}
    )
    
    logger.info(f"✅ Tariff '{item_type}' updated. Price €{new_price} propagated to {propagate_result.modified_count} items.")
    
    # Return updated tariff
    updated = await db.tariffs.find_one({"id": tariff_id}, {"_id": 0})
    return {
        **TariffResponse(**updated).model_dump(),
        "items_updated": propagate_result.modified_count
    }


# ==================== PACK ROUTES ====================

class PackCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = None  # Legacy field, no longer used
    items: List[str]  # List of item types
    day_1: float = 0
    day_2: float = 0
    day_3: float = 0
    day_4: float = 0
    day_5: float = 0
    day_6: float = 0
    day_7: float = 0
    day_8: float = 0
    day_9: float = 0
    day_10: float = 0
    day_11_plus: float = 0

class PackResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    category: Optional[str] = None  # Legacy field, no longer used
    items: List[str]
    day_1: float = 0
    day_2: float = 0
    day_3: float = 0
    day_4: float = 0
    day_5: float = 0
    day_6: float = 0
    day_7: float = 0
    day_8: float = 0
    day_9: float = 0
    day_10: float = 0
    day_11_plus: float = 0

@api_router.post("/packs", response_model=PackResponse)
async def create_pack(pack: PackCreate, current_user: CurrentUser = Depends(get_current_user)):
    pack_id = str(uuid.uuid4())
    doc = {
        "id": pack_id,
        "store_id": current_user.store_id,  # Multi-tenant: Add store_id
        "name": pack.name,
        "description": pack.description or "",
        "category": pack.category,
        "items": pack.items,
        "day_1": pack.day_1,
        "day_2": pack.day_2,
        "day_3": pack.day_3,
        "day_4": pack.day_4,
        "day_5": pack.day_5,
        "day_6": pack.day_6,
        "day_7": pack.day_7,
        "day_8": pack.day_8,
        "day_9": pack.day_9,
        "day_10": pack.day_10,
        "day_11_plus": pack.day_11_plus,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.packs.insert_one(doc)
    return PackResponse(**doc)

@api_router.get("/packs", response_model=List[PackResponse])
async def get_packs(current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Filter by store_id
    packs = await db.packs.find(current_user.get_store_filter(), {"_id": 0}).to_list(50)
    return [PackResponse(**p) for p in packs]

@api_router.put("/packs/{pack_id}", response_model=PackResponse)
async def update_pack(pack_id: str, pack: PackCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Check pack exists in same store
    existing = await db.packs.find_one({**current_user.get_store_filter(), "id": pack_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    update_doc = {
        "name": pack.name,
        "description": pack.description or "",
        "category": pack.category,
        "items": pack.items,
        "day_1": pack.day_1,
        "day_2": pack.day_2,
        "day_3": pack.day_3,
        "day_4": pack.day_4,
        "day_5": pack.day_5,
        "day_6": pack.day_6,
        "day_7": pack.day_7,
        "day_8": pack.day_8,
        "day_9": pack.day_9,
        "day_10": pack.day_10,
        "day_11_plus": pack.day_11_plus
    }
    # Multi-tenant: Update only in own store
    await db.packs.update_one({**current_user.get_store_filter(), "id": pack_id}, {"$set": update_doc})
    
    updated = await db.packs.find_one({**current_user.get_store_filter(), "id": pack_id}, {"_id": 0})
    return PackResponse(**updated)

@api_router.delete("/packs/{pack_id}")
async def delete_pack(pack_id: str, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Delete only from own store
    result = await db.packs.delete_one({**current_user.get_store_filter(), "id": pack_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"message": "Pack deleted"}

# ==================== RENTAL ROUTES ====================

def calculate_days(start_date: str, end_date: str) -> int:
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    return max(1, (end - start).days + 1)

@api_router.post("/rentals", response_model=RentalResponse)
async def create_rental(rental: RentalCreate, current_user: CurrentUser = Depends(get_current_user)):
    # CRITICAL: Validate active cash session FIRST (if ANY payment is being made)
    total_cash_in = rental.paid_amount + rental.deposit
    if total_cash_in > 0:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. No se puede registrar el cobro. Abre la caja primero desde 'Gestión de Caja'."
            )
    
    # Validate customer
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental.customer_id}}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate and get items (supports both regular and generic items)
    items_data = []
    for item_input in rental.items:
        # Try to find item by barcode OR by ID (for generic items that use ID as barcode)
        item = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item_input.barcode}}, {"_id": 0})
        if not item:
            # Fallback: search by ID (generic items may send their ID as barcode)
            item = await db.items.find_one({**current_user.get_store_filter(), **{"id": item_input.barcode}}, {"_id": 0})
        
        if not item:
            raise HTTPException(status_code=404, detail=f"Artículo {item_input.barcode} no encontrado")
        
        # Handle GENERIC items differently
        if item.get("is_generic"):
            quantity = item_input.quantity or 1
            available = item.get("stock_available", 0)
            
            if available < quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente para {item.get('name', 'artículo genérico')}. Disponible: {available}, Solicitado: {quantity}"
                )
            
            # Decrease available stock
            new_available = available - quantity
            await db.items.update_one(
                {"id": item["id"]},
                {"$set": {"stock_available": new_available}}
            )
            
            items_data.append({
                "item_id": item["id"],
                "barcode": item.get("barcode", item["id"]),
                "internal_code": item.get("internal_code", ""),  # Include internal code
                "item_type": item.get("item_type", "generic"),
                "brand": item.get("brand", ""),
                "model": item.get("model", ""),
                "size": item.get("size", ""),
                "name": item.get("name", "Artículo Genérico"),
                "is_generic": True,
                "quantity": quantity,
                "unit_price": item_input.unit_price or item.get("rental_price", 0),
                "person_name": item_input.person_name or "",
                "returned": False
            })
        else:
            # Handle REGULAR items
            if item.get("status") != "available":
                raise HTTPException(status_code=400, detail=f"Artículo {item_input.barcode} no está disponible")
            
            items_data.append({
                "item_id": item["id"],
                "barcode": item["barcode"],
                "internal_code": item.get("internal_code", ""),  # Include internal code
                "item_type": item["item_type"],
                "brand": item.get("brand", ""),
                "model": item.get("model", ""),
                "size": item.get("size", ""),
                "is_generic": False,
                "quantity": 1,
                "unit_price": item_input.unit_price or 0,
                "person_name": item_input.person_name or "",
                "returned": False
            })
            
            # Mark regular item as rented
            await db.items.update_one({**current_user.get_store_filter(), "id": item["id"]}, {"$set": {"status": "rented"}})
    
    days = calculate_days(rental.start_date, rental.end_date)
    rental_id = str(uuid.uuid4())
    
    doc = {
        "id": rental_id,
        "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
        "customer_id": rental.customer_id,
        "customer_name": customer["name"],
        "customer_dni": customer["dni"],
        "start_date": rental.start_date,
        "end_date": rental.end_date,
        "days": days,
        "items": items_data,
        "payment_method": rental.payment_method,
        "total_amount": rental.total_amount,
        "paid_amount": rental.paid_amount,
        "pending_amount": rental.total_amount - rental.paid_amount,
        "deposit": rental.deposit,
        "status": "active",
        "notes": rental.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rentals.insert_one({**current_user.get_store_filter(), **doc})
    await db.customers.update_one({**current_user.get_store_filter(), "id": rental.customer_id}, {"$inc": {"total_rentals": 1}})
    
    # AUTO-REGISTER in CAJA: Create cash movement(s) for payment and deposit
    total_cash_in = rental.paid_amount + rental.deposit
    if total_cash_in > 0:
        # Get active session (already validated at the beginning)
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            # Continue without creating movements (should not happen as we validated earlier)
            return RentalResponse(**doc)
        
        # Prepare rental items for ticket printing
        rental_items_for_ticket = []
        for item_input in rental.items:
            # Get item details from database using barcode
            item_doc = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item_input.barcode}})
            item_name = item_doc.get("item_type", "Artículo") if item_doc else "Artículo"
            item_size = item_doc.get("size", "") if item_doc else ""
            item_brand = item_doc.get("brand", "") if item_doc else ""
            item_internal_code = item_doc.get("internal_code", "") if item_doc else ""
            
            rental_items_for_ticket.append({
                "name": f"{item_name.title()} {item_brand}".strip(),
                "size": item_size,
                "internal_code": item_internal_code,
                "days": days,
                "subtotal": item_input.unit_price or 0,
                "item_type": item_name
            })
        
        operation_number = await get_next_operation_number()
        
        # Register payment if > 0
        if rental.paid_amount > 0:
            cash_movement_id = str(uuid.uuid4())
            cash_doc = {
                "id": cash_movement_id,
                "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
                "operation_number": operation_number,
                "session_id": active_session["id"],
                "movement_type": "income",
                "amount": rental.paid_amount,
                "payment_method": rental.payment_method,
                "category": "rental",
                "concept": f"Alquiler #{rental_id[:8]} - {customer['name']}",
                "reference_id": rental_id,
                "customer_name": customer["name"],
                "notes": f"Alquiler {days} días ({rental.start_date} a {rental.end_date})",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username,
                # Store rental details for ticket printing
                "rental_items": rental_items_for_ticket,
                "rental_days": days,
                "rental_start_date": rental.start_date,
                "rental_end_date": rental.end_date
            }
            await db.cash_movements.insert_one(cash_doc)
        
        # Register deposit separately if > 0
        if rental.deposit > 0:
            deposit_movement_id = str(uuid.uuid4())
            deposit_doc = {
                "id": deposit_movement_id,
                "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
                "operation_number": operation_number,  # Same operation number
                "session_id": active_session["id"],
                "movement_type": "income",
                "amount": rental.deposit,
                "payment_method": rental.payment_method,
                "category": "deposit",
                "concept": f"Depósito #{rental_id[:8]} - {customer['name']}",
                "reference_id": rental_id,
                "customer_name": customer["name"],
                "notes": f"Depósito/Fianza para alquiler {days} días",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username
            }
            await db.cash_movements.insert_one(deposit_doc)
        
        # Store operation_number in rental for ticket reference
        await db.rentals.update_one({**current_user.get_store_filter(), "id": rental_id}, {"$set": {"operation_number": operation_number}})
        
        # Add operation_number to response
        doc["operation_number"] = operation_number
    
    return RentalResponse(**doc)

@api_router.get("/rentals", response_model=List[RentalResponse])
async def get_rentals(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {**current_user.get_store_filter()}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    
    rentals = await db.rentals.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Enrich items with internal_code from items collection
    all_barcodes = []
    for rental in rentals:
        for item in rental.get("items", []):
            if item.get("barcode"):
                all_barcodes.append(item.get("barcode"))
    
    items_map = {}
    if all_barcodes:
        items_cursor = await db.items.find(
            {**current_user.get_store_filter(), "barcode": {"$in": all_barcodes}},
            {"_id": 0, "barcode": 1, "internal_code": 1}
        ).to_list(10000)
        for item in items_cursor:
            items_map[item["barcode"]] = item.get("internal_code", "")
    
    # Update items with internal_code
    for rental in rentals:
        for item in rental.get("items", []):
            if item.get("barcode") and item.get("barcode") in items_map:
                item["internal_code"] = items_map[item["barcode"]]
    
    return [RentalResponse(**r) for r in rentals]

@api_router.get("/rentals/{rental_id}", response_model=RentalResponse)
async def get_rental(rental_id: str, current_user: CurrentUser = Depends(get_current_user)):
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    # Enrich items with internal_code from items collection
    barcodes = [item.get("barcode") for item in rental.get("items", []) if item.get("barcode")]
    if barcodes:
        items_cursor = await db.items.find(
            {**current_user.get_store_filter(), "barcode": {"$in": barcodes}},
            {"_id": 0, "barcode": 1, "internal_code": 1}
        ).to_list(1000)
        items_map = {item["barcode"]: item.get("internal_code", "") for item in items_cursor}
        
        for item in rental.get("items", []):
            if item.get("barcode") and item["barcode"] in items_map:
                item["internal_code"] = items_map[item["barcode"]]
    
    return RentalResponse(**rental)

@api_router.get("/rentals/barcode/{barcode}")
async def get_rental_by_barcode(barcode: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Search for active rental by item barcode, internal_code, or item_id.
    This enables scanner-friendly workflow with any type of code.
    """
    code = barcode.strip()
    code_upper = code.upper()
    
    # Search by barcode OR internal_code OR item_id (case-insensitive for codes)
    rental = await db.rentals.find_one(
        {
            "status": {"$in": ["active", "partial"]},
            "$or": [
                {"items.barcode": {"$regex": f"^{code}$", "$options": "i"}},
                {"items.internal_code": {"$regex": f"^{code}$", "$options": "i"}},
                {"items.item_id": code}
            ]
        },
        {"_id": 0}
    )
    if not rental:
        raise HTTPException(status_code=404, detail="No active rental found for this item")
    
    # Enrich items with internal_code from items collection
    barcodes = [item.get("barcode") for item in rental.get("items", []) if item.get("barcode")]
    if barcodes:
        items_cursor = await db.items.find(
            {**current_user.get_store_filter(), "barcode": {"$in": barcodes}},
            {"_id": 0, "barcode": 1, "internal_code": 1}
        ).to_list(1000)
        items_map = {item["barcode"]: item.get("internal_code", "") for item in items_cursor}
        
        for item in rental.get("items", []):
            if item.get("barcode") and item["barcode"] in items_map:
                item["internal_code"] = items_map[item["barcode"]]
    
    return RentalResponse(**rental)

@api_router.get("/rentals/pending/returns")
async def get_pending_returns(current_user: CurrentUser = Depends(get_current_user)):
    """Get all rentals with pending returns, grouped by date
    Multi-tenant: Filters by store_id
    """
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Get all active and partial rentals - Multi-tenant: Filter by store
    rentals = await db.rentals.find(
        {**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    ).sort("end_date", 1).to_list(200)
    
    # Get item details for item_type AND internal_code
    all_item_ids = []
    all_barcodes = []
    for rental in rentals:
        for item in rental.get("items", []):
            all_item_ids.append(item.get("item_id"))
            all_barcodes.append(item.get("barcode"))
    
    items_map = {}
    if all_item_ids or all_barcodes:
        # Multi-tenant: Filter items by store - get internal_code too
        items_cursor = await db.items.find(
            {
                **current_user.get_store_filter(), 
                "$or": [
                    {"id": {"$in": all_item_ids}},
                    {"barcode": {"$in": all_barcodes}}
                ]
            },
            {"_id": 0, "id": 1, "barcode": 1, "item_type": 1, "internal_code": 1}
        ).to_list(10000)
        for item in items_cursor:
            items_map[item["id"]] = {
                "item_type": item.get("item_type", "unknown"),
                "internal_code": item.get("internal_code", "")
            }
            # Also map by barcode
            if item.get("barcode"):
                items_map[item["barcode"]] = {
                    "item_type": item.get("item_type", "unknown"),
                    "internal_code": item.get("internal_code", "")
                }
    
    today_returns = []
    other_returns = []
    
    for rental in rentals:
        end_date = rental["end_date"].split("T")[0]  # Get just the date part
        pending_items = []
        for i in rental["items"]:
            if not i.get("returned", False):
                # Get item info from map by item_id or barcode
                item_info = items_map.get(i.get("item_id")) or items_map.get(i.get("barcode")) or {"item_type": "unknown", "internal_code": ""}
                item_with_type = {
                    **i, 
                    "item_type": item_info.get("item_type", i.get("item_type", "unknown")),
                    "internal_code": item_info.get("internal_code", i.get("internal_code", ""))
                }
                pending_items.append(item_with_type)
        
        if not pending_items:
            continue
        
        # Get all item types in this rental
        rental_item_types = list(set(p.get("item_type") for p in pending_items))
            
        rental_info = {
            "id": rental["id"],
            "customer_name": rental["customer_name"],
            "customer_dni": rental["customer_dni"],
            "customer_phone": rental.get("customer_phone", ""),
            "customer_email": rental.get("customer_email", ""),
            "customer_hotel": rental.get("customer_hotel", "") or rental.get("hotel", ""),
            "customer_id": rental.get("customer_id", ""),
            "end_date": end_date,
            "start_date": rental.get("start_date", ""),
            "days": rental.get("days", 1),
            "total_amount": rental.get("total_amount", 0),
            "pending_items": pending_items,
            "pending_amount": rental["pending_amount"],
            "days_overdue": 0,
            "items": [{"item_type": t} for t in rental_item_types]  # For filtering
        }
        
        # Calculate overdue days
        end_dt = datetime.fromisoformat(end_date)
        today_dt = datetime.fromisoformat(today)
        days_diff = (today_dt - end_dt).days
        
        if days_diff > 0:
            rental_info["days_overdue"] = days_diff
        
        if end_date == today:
            today_returns.append(rental_info)
        else:
            other_returns.append(rental_info)
    
    return {
        "today": today_returns,
        "other_days": other_returns
    }

@api_router.post("/rentals/{rental_id}/return")
async def process_return(rental_id: str, return_input: ReturnInput, current_user: CurrentUser = Depends(get_current_user)):
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    returned_items = []
    pending_items = []
    days = rental["days"]
    quantities_map = return_input.quantities or {}
    
    for item in rental["items"]:
        if item["barcode"] in return_input.barcodes:
            # Get the item document to check if it's generic
            item_doc = await db.items.find_one({**current_user.get_store_filter(), "barcode": item["barcode"]})
            
            if item_doc and item_doc.get("is_generic"):
                # GENERIC ITEM with PARTIAL RETURN support
                total_qty = item.get("quantity", 1)
                already_returned = item.get("returned_quantity", 0)
                pending_qty = total_qty - already_returned
                
                # Get quantity to return from request (default to pending qty = full return)
                qty_to_return = quantities_map.get(item["barcode"], pending_qty)
                qty_to_return = min(qty_to_return, pending_qty)  # Can't return more than pending
                
                if qty_to_return <= 0:
                    # Skip if no quantity to return
                    continue
                
                # Update returned quantity tracking
                new_returned_qty = already_returned + qty_to_return
                item["returned_quantity"] = new_returned_qty
                
                # Mark as fully returned only if all units are returned
                if new_returned_qty >= total_qty:
                    item["returned"] = True
                    returned_items.append(item)
                else:
                    # Partial return - item stays in pending
                    pending_items.append(item)
                
                # Return stock to inventory
                current_available = item_doc.get("stock_available", 0)
                total_stock = item_doc.get("stock_total", 0)
                new_available = min(current_available + qty_to_return, total_stock)
                
                await db.items.update_one(
                    {**current_user.get_store_filter(), "barcode": item["barcode"]},
                    {"$set": {"stock_available": new_available}}
                )
            else:
                # REGULAR ITEM: Full return only (no partial)
                item["returned"] = True
                returned_items.append(item)
                
                # Update status and days used
                await db.items.update_one(
                    {**current_user.get_store_filter(), "barcode": item["barcode"]},
                    {"$set": {"status": "available"}, "$inc": {"days_used": days}}
                )
                # Update amortization for regular items
                if item_doc:
                    # Get tariff (within same store)
                    tariff = await db.tariffs.find_one({**current_user.get_store_filter(), "item_type": item_doc.get("item_type")})
                    if tariff:
                        daily_rate = tariff.get("day_1") or tariff.get("days_1") or 0
                        if daily_rate:
                            days_used = item_doc.get("days_used", 0) or 0
                            amortization = days_used * daily_rate
                            await db.items.update_one(
                                {**current_user.get_store_filter(), "barcode": item["barcode"]},
                                {"$set": {"amortization": amortization}}
                            )
        elif not item.get("returned", False):
            pending_items.append(item)
    
    # Update rental status
    new_status = "returned" if len(pending_items) == 0 else "partial"
    
    update_fields = {"items": rental["items"], "status": new_status}
    # Add actual_return_date when fully returned
    if new_status == "returned":
        update_fields["actual_return_date"] = datetime.now(timezone.utc).isoformat()
    
    # ============ GESTIÓN DE DEPÓSITO ============
    deposit_amount = rental.get("deposit", 0)
    deposit_returned = False
    deposit_forfeited = False
    
    if new_status == "returned" and deposit_amount > 0:
        # Solo procesar depósito cuando la devolución está completa
        deposit_action = return_input.deposit_action or "return"
        
        # Validar sesión de caja activa
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. Abre la caja para procesar la devolución/incautación del depósito."
            )
        
        operation_number = await get_next_operation_number()
        customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental.get("customer_id")}})
        customer_name = customer.get("name", rental.get("customer_name", "Cliente")) if customer else rental.get("customer_name", "Cliente")
        
        if deposit_action == "return":
            # DEVOLVER DEPÓSITO AL CLIENTE
            cash_movement_id = str(uuid.uuid4())
            cash_doc = {
                "id": cash_movement_id,
                "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
                "operation_number": operation_number,
                "session_id": active_session["id"],
                "movement_type": "expense",  # Salida de caja
                "amount": deposit_amount,
                "payment_method": rental.get("payment_method", "cash"),
                "category": "deposit_return",
                "concept": f"Devolución Depósito #{rental_id[:8]} - {customer_name}",
                "reference_id": rental_id,
                "customer_name": customer_name,
                "notes": "Depósito devuelto - Material en buen estado",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username
            }
            await db.cash_movements.insert_one(cash_doc)
            deposit_returned = True
            update_fields["deposit_status"] = "returned"
            update_fields["deposit_returned_at"] = datetime.now(timezone.utc).isoformat()
            
        elif deposit_action == "forfeit":
            # INCAUTAR DEPÓSITO (pasa a ingreso extra)
            cash_movement_id = str(uuid.uuid4())
            forfeit_reason = return_input.forfeit_reason or "Material dañado"
            cash_doc = {
                "id": cash_movement_id,
                "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
                "operation_number": operation_number,
                "session_id": active_session["id"],
                "movement_type": "income",  # Ingreso (ya no se devuelve)
                "amount": deposit_amount,
                "payment_method": rental.get("payment_method", "cash"),
                "category": "deposit_forfeited",  # Categoría especial para reportes
                "concept": f"Depósito Incautado #{rental_id[:8]} - {customer_name}",
                "reference_id": rental_id,
                "customer_name": customer_name,
                "notes": f"Depósito incautado: {forfeit_reason}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username
            }
            await db.cash_movements.insert_one(cash_doc)
            deposit_forfeited = True
            update_fields["deposit_status"] = "forfeited"
            update_fields["deposit_forfeited_at"] = datetime.now(timezone.utc).isoformat()
            update_fields["deposit_forfeit_reason"] = forfeit_reason
    
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": update_fields}
    )
    
    return {
        "message": "Return processed",
        "returned_items": returned_items,
        "pending_items": pending_items,
        "status": new_status,
        "pending_amount": rental["pending_amount"],
        "operation_number": rental.get("operation_number", rental_id[:8].upper()),
        "deposit_amount": deposit_amount,
        "deposit_returned": deposit_returned,
        "deposit_forfeited": deposit_forfeited
    }


# =================== ADD ITEMS TO EXISTING RENTAL ====================
@api_router.post("/rentals/{rental_id}/add-items")
async def add_items_to_rental(
    rental_id: str, 
    add_items_input: AddItemsToRentalInput, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Añade artículos nuevos a un alquiler activo.
    Calcula precio proporcional basado en días restantes.
    Opcionalmente cobra el importe adicional.
    """
    # Validar que el alquiler existe y está activo
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}})
    if not rental:
        raise HTTPException(status_code=404, detail="Alquiler no encontrado")
    
    if rental["status"] not in ["active", "partial"]:
        raise HTTPException(status_code=400, detail="Solo se pueden añadir artículos a alquileres activos")
    
    # Validar límite del plan
    plan_status_response = await get_plan_status(current_user)
    current_items = plan_status_response.current_items
    max_items = plan_status_response.max_items
    
    new_items_count = len(add_items_input.items)
    if current_items + new_items_count > max_items:
        raise HTTPException(
            status_code=400,
            detail=f"Límite de artículos alcanzado. Plan actual: {current_items}/{max_items}. No se pueden añadir {new_items_count} artículos más."
        )
    
    # Calcular días para los nuevos artículos
    if add_items_input.days:
        days = add_items_input.days
    else:
        # Usar días restantes del alquiler original
        end_date = datetime.fromisoformat(rental["end_date"].replace('Z', '+00:00'))
        start_date_new = datetime.now(timezone.utc)
        days = max(1, (end_date - start_date_new).days + 1)
    
    # Fecha de fin para nuevos items
    end_date_new_items = add_items_input.end_date or rental["end_date"]
    
    # Procesar nuevos artículos
    new_items_processed = []
    additional_rental_amount = 0
    additional_deposit = 0
    
    for item_input in add_items_input.items:
        # Verificar que el artículo existe y está disponible
        item = await db.items.find_one({**current_user.get_store_filter(), **{"barcode": item_input.barcode}})
        if not item:
            raise HTTPException(status_code=404, detail=f"Artículo {item_input.barcode} no encontrado")
        
        if item["status"] != "available":
            raise HTTPException(status_code=400, detail=f"Artículo {item_input.barcode} no está disponible")
        
        # Marcar como alquilado
        await db.items.update_one(
            {**current_user.get_store_filter(), **{"barcode": item_input.barcode}},
            {"$set": {"status": "rented"}}
        )
        
        # Calcular precio usando unit_price o 0 (solo para guardar en el item)
        item_price = item_input.unit_price or 0
        
        # Agregar al array de items del rental
        new_item_entry = {
            "barcode": item_input.barcode,
            "name": item.get("name", "Artículo"),
            "item_type": item.get("item_type", ""),
            "size": item.get("size", ""),
            "person_name": item_input.person_name or "",
            "unit_price": item_price,
            "returned": False,
            "return_date": None,
            "end_date": end_date_new_items,  # Puede ser diferente
            "days": days
        }
        new_items_processed.append(new_item_entry)
    
    # CORRECCIÓN: Usar calculated_total del frontend si está disponible (incluye lógica de packs)
    # Si no, usar la suma de unit_price (legacy)
    if add_items_input.calculated_total is not None:
        additional_rental_amount = add_items_input.calculated_total
    else:
        # Fallback: sumar precios individuales
        additional_rental_amount = sum(item["unit_price"] for item in new_items_processed)
    
    # Actualizar el alquiler con los nuevos items y montos
    rental["items"].extend(new_items_processed)
    new_total = rental["total_amount"] + additional_rental_amount
    new_deposit = rental.get("deposit", 0) + additional_deposit
    
    await db.rentals.update_one(
        {**current_user.get_store_filter(), **{"id": rental_id}},
        {"$set": {
            "items": rental["items"],
            "total_amount": new_total,
            "deposit": new_deposit
        }}
    )
    
    # Si se cobra ahora, registrar en caja
    if add_items_input.charge_now and additional_rental_amount > 0:
        # Validar sesión de caja activa
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. Abre la caja para registrar el cobro."
            )
        
        # Obtener datos del cliente
        customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental.get("customer_id")}})
        customer_name = customer.get("name", rental.get("customer_name", "Cliente")) if customer else rental.get("customer_name", "Cliente")
        
        # Registrar movimiento de ampliación
        operation_number = await get_next_operation_number()
        cash_movement_id = str(uuid.uuid4())
        cash_doc = {
            "id": cash_movement_id,
            "store_id": current_user.store_id,
            "operation_number": operation_number,
            "session_id": active_session["id"],
            "movement_type": "income",
            "amount": additional_rental_amount,
            "payment_method": add_items_input.payment_method,
            "category": "rental_extension",
            "concept": f"Ampliación de material #{rental_id[:8]} - {customer_name}",
            "reference_id": rental_id,
            "customer_name": customer_name,
            "notes": f"Ampliación: {len(new_items_processed)} artículo(s) por {days} día(s)",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.username
        }
        await db.cash_movements.insert_one(cash_doc)
        
        # Actualizar paid_amount del rental
        await db.rentals.update_one(
            {**current_user.get_store_filter(), **{"id": rental_id}},
            {"$set": {"paid_amount": rental["paid_amount"] + additional_rental_amount}}
        )
    else:
        # Si no se cobra ahora, sumar al pendiente
        new_pending = rental.get("pending_amount", 0) + additional_rental_amount
        await db.rentals.update_one(
            {**current_user.get_store_filter(), **{"id": rental_id}},
            {"$set": {"pending_amount": new_pending}}
        )
    
    return {
        "message": "Artículos añadidos exitosamente",
        "items_added": len(new_items_processed),
        "additional_amount": additional_rental_amount,
        "additional_deposit": additional_deposit,
        "new_total": new_total,
        "charged_now": add_items_input.charge_now
    }



class PaymentRequest(BaseModel):
    amount: float
    payment_method: str = "cash"

@api_router.post("/rentals/{rental_id}/payment")
async def process_payment(rental_id: str, payment: PaymentRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    Procesar un pago adicional para un alquiler existente.
    SIEMPRE crea un movimiento de caja vinculado a la sesión activa.
    """
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    # Validate active cash session
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    if not active_session:
        raise HTTPException(
            status_code=400,
            detail="No hay sesión de caja activa. Abre la caja primero desde 'Gestión de Caja'."
        )
    
    new_paid = rental["paid_amount"] + payment.amount
    new_pending = rental["total_amount"] - new_paid
    
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": {"paid_amount": new_paid, "pending_amount": max(0, new_pending)}}
    )
    
    # CREATE CASH MOVEMENT - This is MANDATORY for accounting integrity
    cash_movement_id = str(uuid.uuid4())
    operation_number = await get_next_operation_number()
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental.get("customer_id")}})
    customer_name = customer.get("name", rental.get("customer_name", "Cliente")) if customer else rental.get("customer_name", "Cliente")
    
    cash_doc = {
        "id": cash_movement_id,
        "operation_number": operation_number,
        "session_id": active_session["id"],
        "movement_type": "income",
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "category": "rental_payment",
        "concept": f"Pago adicional Alquiler #{rental_id[:8]} - {customer_name}",
        "reference_id": f"{rental_id}_pay_{cash_movement_id[:8]}",
        "customer_name": customer_name,
        "notes": f"Pago de €{payment.amount:.2f} sobre deuda pendiente",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.username
    }
    await db.cash_movements.insert_one(cash_doc)
    
    return {
        "message": "Payment processed",
        "paid_amount": new_paid,
        "pending_amount": max(0, new_pending),
        "operation_number": operation_number
    }

# ==================== CENTRALIZED SWAP/CAMBIOS ENDPOINT ====================

class CentralSwapRequest(BaseModel):
    old_item_barcode: str
    new_item_barcode: str
    days_remaining: int
    payment_method: str = "cash"
    delta_amount: float = 0

@api_router.post("/rentals/{rental_id}/central-swap")
async def central_swap_item(rental_id: str, data: CentralSwapRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    CENTRALIZED SWAP: Intelligent item replacement with automatic detection.
    
    Flow:
    1. Validates rental is active
    2. Finds old item in rental by barcode/internal_code
    3. Validates new item is available
    4. Updates inventory (old → maintenance, new → rented)
    5. Updates rental items array
    6. Creates cash movement for price difference
    7. Returns swap ticket data
    """
    # Get rental
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}})
    if not rental:
        raise HTTPException(status_code=404, detail="Alquiler no encontrado")
    
    if rental.get("status") == "returned":
        raise HTTPException(status_code=400, detail="El alquiler ya está cerrado")
    
    # Find the old item in the rental by barcode OR internal_code
    old_item_index = None
    old_item_data = None
    for i, item in enumerate(rental["items"]):
        item_barcode = item.get("barcode", "").upper()
        item_internal = item.get("internal_code", "").upper()
        search_code = data.old_item_barcode.upper()
        
        if item_barcode == search_code or item_internal == search_code:
            if not item.get("returned"):  # Only match non-returned items
                old_item_index = i
                old_item_data = item
                break
    
    if old_item_index is None:
        raise HTTPException(status_code=404, detail=f"Artículo '{data.old_item_barcode}' no encontrado en el alquiler activo")
    
    # Get old item from inventory (for updating status)
    old_inventory_item = await db.items.find_one({
        "$or": [
            {"barcode": {"$regex": f"^{data.old_item_barcode}$", "$options": "i"}},
            {"internal_code": {"$regex": f"^{data.old_item_barcode}$", "$options": "i"}}
        ]
    })
    
    # Get new item from inventory
    new_item = await db.items.find_one({
        "$or": [
            {"barcode": {"$regex": f"^{data.new_item_barcode}$", "$options": "i"}},
            {"internal_code": {"$regex": f"^{data.new_item_barcode}$", "$options": "i"}}
        ]
    })
    
    if not new_item:
        raise HTTPException(status_code=404, detail=f"Nuevo artículo '{data.new_item_barcode}' no encontrado en inventario")
    
    if new_item.get("status") == "rented":
        raise HTTPException(status_code=400, detail="El nuevo artículo ya está alquilado por otro cliente")
    
    if new_item.get("status") not in ["available", "dirty"]:
        raise HTTPException(status_code=400, detail=f"El nuevo artículo no está disponible (estado: {new_item.get('status')})")
    
    # Calculate days used by old item
    start_date_str = rental.get("start_date", "")
    try:
        if 'Z' in start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        elif 'T' in start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        else:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
    except:
        start_date = datetime.now(timezone.utc)
    
    now = datetime.now(timezone.utc)
    days_used = max(1, (now - start_date).days + 1)
    
    # UPDATE INVENTORY: Old item goes to maintenance
    if old_inventory_item:
        await db.items.update_one(
            {"id": old_inventory_item["id"]},
            {"$set": {"status": "maintenance"}, "$inc": {"days_used": days_used}}
        )
    
    # UPDATE INVENTORY: New item becomes rented
    await db.items.update_one(
        {"id": new_item["id"]},
        {"$set": {"status": "rented"}}
    )
    
    # Create new item entry for rental (replacing old)
    new_item_entry = {
        "item_id": new_item["id"],
        "barcode": new_item.get("barcode", ""),
        "internal_code": new_item.get("internal_code", ""),
        "item_type": new_item.get("item_type", ""),
        "brand": new_item.get("brand", ""),
        "model": new_item.get("model", ""),
        "size": new_item.get("size", ""),
        "category": "STANDARD",  # All individual items are STANDARD
        "unit_price": old_item_data.get("unit_price", 0) + data.delta_amount,
        "returned": False,
        "swapped_from": data.old_item_barcode,
        "swapped_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Mark old item as returned/swapped
    rental["items"][old_item_index] = {
        **old_item_data,
        "returned": True,
        "returned_at": datetime.now(timezone.utc).isoformat(),
        "swapped_to": data.new_item_barcode,
        "swap_reason": "central_swap"
    }
    
    # Add new item to rental
    rental["items"].append(new_item_entry)
    
    # Create swap history record
    swap_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "old_item_barcode": data.old_item_barcode,
        "old_item_type": old_item_data.get("item_type"),
        "new_item_barcode": data.new_item_barcode,
        "new_item_type": new_item.get("item_type"),
        "days_remaining": data.days_remaining,
        "delta_amount": data.delta_amount,
        "payment_method": data.payment_method,
        "performed_by": current_user.username
    }
    
    swap_history = rental.get("swap_history", [])
    swap_history.append(swap_record)
    
    # Update totals if there's a price difference
    new_total = rental.get("total_amount", 0) + data.delta_amount
    new_pending = rental.get("pending_amount", 0)
    
    # If upgrade (delta > 0), add to pending unless paid
    # If downgrade (delta < 0), this is a refund
    if data.delta_amount > 0:
        new_pending += data.delta_amount
    
    # Update rental in database
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": {
            "items": rental["items"],
            "total_amount": new_total,
            "pending_amount": max(0, new_pending),
            "swap_history": swap_history,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create cash movement for price difference
    operation_number = None
    if data.delta_amount != 0:
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"status": "open"}})
        
        if active_session:
            operation_number = await get_next_operation_number()
            
            if data.delta_amount > 0:
                # Supplement (upgrade) - income
                movement_type = "income"
                category = "swap_supplement"
                concept = f"Suplemento cambio: {data.old_item_barcode} → {data.new_item_barcode}"
            else:
                # Refund (downgrade)
                movement_type = "refund"
                category = "swap_refund"
                concept = f"Abono cambio: {data.old_item_barcode} → {data.new_item_barcode}"
            
            cash_doc = {
                "id": str(uuid.uuid4()),
                "session_id": active_session["id"],
                "movement_type": movement_type,
                "category": category,
                "amount": abs(data.delta_amount),
                "concept": concept,
                "payment_method": data.payment_method,
                "reference_id": rental_id,
                "customer_name": rental.get("customer_name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username,
                "operation_number": operation_number
            }
            await db.cash_movements.insert_one(cash_doc)
            
            # If upgrade was paid, update pending
            if data.delta_amount > 0:
                await db.rentals.update_one(
                    {"id": rental_id},
                    {"$set": {"pending_amount": max(0, new_pending - data.delta_amount)}}
                )
    
    return {
        "success": True,
        "message": "Cambio realizado correctamente",
        "old_item": {
            "barcode": data.old_item_barcode,
            "type": old_item_data.get("item_type")
        },
        "new_item": {
            "barcode": data.new_item_barcode,
            "type": new_item.get("item_type")
        },
        "delta_amount": data.delta_amount,
        "operation_number": operation_number,
        "swap_record": swap_record
    }

class UpdateRentalDaysRequest(BaseModel):
    days: int

class UpdatePaymentMethodRequest(BaseModel):
    new_payment_method: str  # The new payment method to set
    reason: Optional[str] = ""  # Optional reason for the change

class ModifyDurationRequest(BaseModel):
    new_days: int
    new_total: float
    payment_method: str
    difference_amount: float

@api_router.patch("/rentals/{rental_id}/modify-duration")
async def modify_rental_duration(rental_id: str, data: ModifyDurationRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    Modify rental duration with mandatory cash register entry.
    Creates a cash movement for any price difference (income for extensions, refund for reductions).
    """
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    if rental["status"] not in ["active", "partial"]:
        raise HTTPException(status_code=400, detail="Cannot modify closed rental")
    
    old_days = rental["days"]
    old_total = rental["total_amount"]
    old_end_date = rental["end_date"]
    
    # Calculate new end date
    start_date = datetime.fromisoformat(rental["start_date"].replace('Z', '+00:00'))
    
    if data.new_days == 0:
        # Same day return - close the rental
        new_end_date = start_date
        new_status = "returned"
    else:
        new_end_date = start_date + timedelta(days=data.new_days - 1)
        new_status = rental["status"]
    
    # Calculate financial adjustment
    # If reducing days: difference is negative (refund to customer)
    # If extending days: difference is positive (charge customer)
    is_refund = data.difference_amount < 0
    
    # Update rental fields
    new_pending = data.new_total - rental["paid_amount"]
    update_fields = {
        "days": data.new_days,
        "end_date": new_end_date.isoformat(),
        "total_amount": data.new_total,
        "pending_amount": max(0, new_pending)
    }
    
    # If 0 days (same day return), mark all items as returned and update inventory
    if data.new_days == 0:
        update_fields["status"] = "returned"
        update_fields["actual_return_date"] = datetime.now(timezone.utc).isoformat()
        
        # Mark all items as returned
        returned_items = []
        for item in rental.get("items", []):
            item["returned"] = True
            item["return_date"] = datetime.now(timezone.utc).isoformat()
            returned_items.append(item)
            
            # Update item status in inventory - handle both 'id' and 'item_id' fields
            item_id = item.get("id") or item.get("item_id")
            if item_id:
                await db.items.update_one(
                    {"id": item_id},
                    {"$set": {"status": "available"}}
                )
        update_fields["items"] = returned_items
    
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": update_fields}
    )
    
    # Create cash movement (MANDATORY for any price change)
    cash_movement_id = None
    if data.difference_amount != 0:
        # Validate active cash session FIRST
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. Abre la caja primero desde 'Gestión de Caja'."
            )
        
        customer_name = rental.get("customer_name", "Cliente")
        
        # Determine movement type: 'income' for charges, 'refund' for returns
        movement_type = "refund" if is_refund else "income"
        
        # Create appropriate concept
        if is_refund:
            concept = f"Devolución ajuste Alquiler ID: {rental_id[:8].upper()} (De {old_days} a {data.new_days} días)"
        else:
            concept = f"Ampliación Alquiler ID: {rental_id[:8].upper()} (De {old_days} a {data.new_days} días)"
        
        cash_movement_id = str(uuid.uuid4())
        operation_number = await get_next_operation_number()
        cash_doc = {
            "id": cash_movement_id,
            "operation_number": operation_number,
            "session_id": active_session["id"],
            "movement_type": movement_type,
            "amount": abs(data.difference_amount),
            "payment_method": data.payment_method,
            "category": "rental_adjustment",
            "concept": concept,
            "reference_id": f"{rental_id}_adj_{cash_movement_id[:8]}",
            "notes": f"Modificación de duración: {old_days}→{data.new_days} días. Total: €{old_total:.2f}→€{data.new_total:.2f}",
            "rental_id": rental_id,
            "customer_name": customer_name,
            "created_by": current_user.username,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cash_movements.insert_one(cash_doc)
    
    updated = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    return {
        "rental": RentalResponse(**updated),
        "operation_number": operation_number if cash_movement_id else None,
        "old_days": old_days,
        "new_days": data.new_days,
        "old_total": old_total,
        "new_total": data.new_total,
        "difference": data.difference_amount,
        "is_refund": is_refund
    }

@api_router.patch("/rentals/{rental_id}/days")
async def update_rental_days(rental_id: str, update_data: UpdateRentalDaysRequest, current_user: CurrentUser = Depends(get_current_user)):
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    if rental["status"] not in ["active", "partial"]:
        raise HTTPException(status_code=400, detail="Cannot modify closed rental")
    
    # Calculate new end date
    start_date = datetime.fromisoformat(rental["start_date"].replace('Z', '+00:00'))
    new_end_date = start_date + timedelta(days=update_data.days - 1)
    
    # Calculate difference for cash register
    old_total = rental["total_amount"]
    price_difference = update_data.new_total - old_total
    
    # Update rental
    new_pending = update_data.new_total - rental["paid_amount"]
    await db.rentals.update_one(
        {"id": rental_id},
        {
            "$set": {
                "days": update_data.days,
                "end_date": new_end_date.isoformat(),
                "total_amount": update_data.new_total,
                "pending_amount": new_pending
            }
        }
    )
    
    # Create cash movement if there's a price difference
    if price_difference != 0:
        # Validate active cash session FIRST
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. Abre la caja primero desde 'Gestión de Caja'."
            )
        
        customer_name = rental.get("customer_name", "Cliente")
        movement_type = "income" if price_difference > 0 else "expense"
        concept = f"Ampliación Alquiler #{rental_id[:8]} - {customer_name}" if price_difference > 0 else f"Reducción Alquiler #{rental_id[:8]} - {customer_name}"
        
        operation_number = await get_next_operation_number()
        cash_doc = {
            "id": str(uuid.uuid4()),
            "operation_number": operation_number,
            "session_id": active_session["id"],
            "movement_type": movement_type,
            "amount": abs(price_difference),
            "payment_method": rental.get("payment_method", "cash"),
            "category": "rental_adjustment",
            "concept": concept,
            "reference_id": f"{rental_id}_days_{str(uuid.uuid4())[:8]}",
            "notes": f"Modificación de {rental['days']} a {update_data.days} días",
            "rental_id": rental_id,
            "customer_name": customer_name,
            "created_by": current_user.username,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cash_movements.insert_one(cash_doc)
    
    updated = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    return RentalResponse(**updated)

# ============ PAYMENT METHOD CONSTANTS ============
# Classification of payment methods for accounting
PAID_METHODS = ["cash", "card", "online", "deposit", "other"]  # GRUPO A: Real income
UNPAID_METHODS = ["pending"]  # GRUPO B: Debts/Unpaid

PAYMENT_METHOD_LABELS = {
    "cash": "Efectivo",
    "card": "Tarjeta",
    "online": "Pago Online",
    "deposit": "Depósito",
    "other": "Otro",
    "pending": "Pendiente"
}

def is_paid_method(method: str) -> bool:
    """Check if payment method represents actual income"""
    return method in PAID_METHODS

def is_unpaid_method(method: str) -> bool:
    """Check if payment method represents a debt"""
    return method in UNPAID_METHODS

@api_router.patch("/rentals/{rental_id}/payment-method")
async def update_rental_payment_method(
    rental_id: str, 
    data: UpdatePaymentMethodRequest, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Update payment method for a rental with automatic financial reconciliation.
    
    RECONCILIATION LOGIC:
    - CASE 1: Income -> Income (e.g., cash -> card): Move amount between cash registers
    - CASE 2: Income -> Debt (e.g., cash -> pending): Remove from cash register (it was an error)
    - CASE 3: Debt -> Income (e.g., pending -> card): Add to cash register (payment received)
    """
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    old_method = rental.get("payment_method", "cash")
    new_method = data.new_payment_method
    
    # Calculate amount based on the payment method change scenario
    if is_unpaid_method(old_method) and is_paid_method(new_method):
        # Pending -> Paid: Use total_amount (the amount being paid)
        amount = rental.get("total_amount", 0)
    else:
        # Paid -> Paid or Paid -> Pending: Use paid_amount
        amount = rental.get("paid_amount", rental.get("total_amount", 0))
    
    # Validate new payment method
    if new_method not in PAID_METHODS and new_method not in UNPAID_METHODS:
        raise HTTPException(status_code=400, detail=f"Invalid payment method: {new_method}")
    
    # Skip if no change
    if old_method == new_method:
        return {"message": "No changes needed", "rental": rental}
    
    # Determine old and new states
    old_is_paid = is_paid_method(old_method)
    new_is_paid = is_paid_method(new_method)
    old_is_unpaid = is_unpaid_method(old_method)
    new_is_unpaid = is_unpaid_method(new_method)
    
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental["customer_id"]}}, {"_id": 0})
    customer_name = customer.get("name", "Cliente") if customer else "Cliente"
    
    reconciliation_action = ""
    
    # Get current active cash session
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": today, "status": "open"}})
    
    if not active_session:
        raise HTTPException(status_code=400, detail="No active cash session. Please open the cash register first.")
    
    session_id = active_session["id"]
    
    # ========== CASE 1: Income -> Income (Move between cash registers) ==========
    if old_is_paid and new_is_paid:
        reconciliation_action = "moved_between_registers"
        
        # Remove from old cash register
        await db.cash_movements.insert_one({"store_id": current_user.store_id, 
            "id": str(uuid.uuid4()),
            "session_id": session_id,  # CRITICAL: Link to cash session
            "date": datetime.now(timezone.utc).isoformat(),
            "movement_type": "adjustment",  # Use movement_type for consistency
            "type": "adjustment",
            "amount": -amount,  # Negative = removal
            "payment_method": old_method,
            "category": "rental",  # Required field
            "concept": f"Corrección método de pago (Alquiler #{rental_id[:8]}) - De {PAYMENT_METHOD_LABELS.get(old_method, old_method)} a {PAYMENT_METHOD_LABELS.get(new_method, new_method)}",
            "reference_id": rental_id,  # Use reference_id instead of rental_id
            "notes": f"Cambio de método de pago: {old_method} → {new_method}",  # Required field
            "created_by": current_user.get("username", "system"),  # Required field
            "user": current_user.get("username", "system"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Add to new cash register
        await db.cash_movements.insert_one({"store_id": current_user.store_id, 
            "id": str(uuid.uuid4()),
            "session_id": session_id,  # CRITICAL: Link to cash session
            "date": datetime.now(timezone.utc).isoformat(),
            "movement_type": "income",  # Use movement_type for consistency
            "type": "income",
            "amount": amount,
            "payment_method": new_method,
            "category": "rental",  # Required field
            "concept": f"Corrección método de pago (Alquiler #{rental_id[:8]}) - De {PAYMENT_METHOD_LABELS.get(old_method, old_method)} a {PAYMENT_METHOD_LABELS.get(new_method, new_method)}",
            "reference_id": rental_id,  # Use reference_id instead of rental_id
            "notes": f"Cambio de método de pago: {old_method} → {new_method}",  # Required field
            "created_by": current_user.get("username", "system"),  # Required field
            "user": current_user.get("username", "system"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # ========== CASE 2: Income -> Debt (Remove from cash - it was an error) ==========
    elif old_is_paid and new_is_unpaid:
        reconciliation_action = "removed_from_cash"
        
        # Remove from cash register (negative adjustment)
        await db.cash_movements.insert_one({"store_id": current_user.store_id, 
            "id": str(uuid.uuid4()),
            "session_id": session_id,  # CRITICAL: Link to cash session
            "date": datetime.now(timezone.utc).isoformat(),
            "movement_type": "adjustment",  # Use movement_type for consistency
            "type": "adjustment",
            "amount": -amount,  # Negative = removal
            "payment_method": old_method,
            "category": "rental",  # Required field
            "concept": f"Corrección: Alquiler #{rental_id[:8]} marcado como {PAYMENT_METHOD_LABELS.get(new_method, new_method)} - {customer_name}",
            "reference_id": rental_id,  # Use reference_id instead of rental_id
            "notes": f"Cambio de método de pago: {old_method} → {new_method}",  # Required field
            "created_by": current_user.get("username", "system"),  # Required field
            "user": current_user.get("username", "system"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update rental to unpaid status
        await db.rentals.update_one(
            {"id": rental_id},
            {"$set": {"pending_amount": amount, "paid_amount": 0}}
        )
    
    # ========== CASE 3: Debt -> Income (Add to cash - payment received) ==========
    elif old_is_unpaid and new_is_paid:
        reconciliation_action = "added_to_cash"
        
        # Add to cash register
        await db.cash_movements.insert_one({"store_id": current_user.store_id, 
            "id": str(uuid.uuid4()),
            "session_id": session_id,  # CRITICAL: Link to cash session
            "date": datetime.now(timezone.utc).isoformat(),
            "movement_type": "income",  # Use movement_type for consistency
            "type": "income",
            "amount": amount,
            "payment_method": new_method,
            "category": "rental",  # Required field
            "concept": f"Cobro de {PAYMENT_METHOD_LABELS.get(old_method, old_method)} - Alquiler #{rental_id[:8]} - {customer_name}",
            "reference_id": rental_id,  # Use reference_id instead of rental_id
            "notes": f"Cambio de método de pago: {old_method} → {new_method}",  # Required field
            "created_by": current_user.get("username", "system"),  # Required field
            "user": current_user.get("username", "system"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update rental to paid status
        await db.rentals.update_one(
            {"id": rental_id},
            {"$set": {"pending_amount": 0, "paid_amount": amount}}
        )
    
    # Update rental payment method
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": {"payment_method": new_method}}
    )
    
    # Get updated rental
    updated_rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    
    return {
        "message": "Payment method updated successfully",
        "rental": updated_rental,
        "reconciliation": {
            "action": reconciliation_action,
            "old_method": PAYMENT_METHOD_LABELS.get(old_method, old_method),
            "new_method": PAYMENT_METHOD_LABELS.get(new_method, new_method),
            "amount": amount
        }
    }

# Refund request model
class RefundRequest(BaseModel):
    days_to_refund: int
    refund_amount: float
    payment_method: str = "cash"
    reason: str = ""

@api_router.post("/rentals/{rental_id}/refund")
async def process_refund(rental_id: str, refund: RefundRequest, current_user: CurrentUser = Depends(get_current_user)):
    """
    Process a partial refund for unused days.
    Creates a negative entry in the cash register.
    """
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    if rental["status"] not in ["active", "partial"]:
        raise HTTPException(status_code=400, detail="No se puede reembolsar un alquiler cerrado")
    
    if refund.days_to_refund <= 0:
        raise HTTPException(status_code=400, detail="Debe especificar al menos 1 día a reembolsar")
    
    if refund.refund_amount <= 0:
        raise HTTPException(status_code=400, detail="El importe de reembolso debe ser positivo")
    
    if refund.refund_amount > rental["paid_amount"]:
        raise HTTPException(status_code=400, detail="El reembolso no puede superar el importe pagado")
    
    # Get customer info
    customer = await db.customers.find_one({**current_user.get_store_filter(), **{"id": rental["customer_id"]}}, {"_id": 0})
    customer_name = customer["name"] if customer else rental.get("customer_name", "Cliente")
    
    # Calculate new values
    original_days = rental["days"]
    new_days = original_days - refund.days_to_refund
    new_total = rental["total_amount"] - refund.refund_amount
    new_paid = rental["paid_amount"] - refund.refund_amount
    new_pending = new_total - new_paid
    
    # Calculate new end date
    start_date = datetime.fromisoformat(rental["start_date"].replace('Z', '+00:00'))
    new_end_date = start_date + timedelta(days=new_days - 1) if new_days > 0 else start_date
    
    # Update rental record
    await db.rentals.update_one(
        {"id": rental_id},
        {
            "$set": {
                "days": new_days,
                "end_date": new_end_date.isoformat(),
                "total_amount": new_total,
                "paid_amount": new_paid,
                "pending_amount": max(0, new_pending)
            }
        }
    )
    
    # Validate active cash session FIRST
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    if not active_session:
        raise HTTPException(
            status_code=400,
            detail="No hay sesión de caja activa. Abre la caja primero desde 'Gestión de Caja'."
        )
    
    # Create NEGATIVE cash movement (refund)
    refund_movement_id = str(uuid.uuid4())
    operation_number = await get_next_operation_number()
    refund_doc = {
        "id": refund_movement_id,
        "operation_number": operation_number,
        "session_id": active_session["id"],
        "movement_type": "refund",
        "amount": refund.refund_amount,
        "payment_method": refund.payment_method,
        "category": "refund",
        "concept": f"Devolución Alquiler #{rental_id[:8]} - {customer_name}",
        "reference_id": rental_id,
        "customer_name": customer_name,
        "notes": f"Reembolso {refund.days_to_refund} día(s) no disfrutado(s). {refund.reason}".strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.username
    }
    await db.cash_movements.insert_one(refund_doc)
    
    updated_rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    
    return {
        "message": "Reembolso procesado correctamente",
        "operation_number": operation_number,
        "refund_amount": refund.refund_amount,
        "days_refunded": refund.days_to_refund,
        "new_days": new_days,
        "new_total": new_total,
        "rental": updated_rental
    }

@api_router.post("/rentals/{rental_id}/quick-return")
async def quick_return(rental_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    Quick return: Mark ALL items as returned with one click
    Perfect for when staff receives all items physically
    """
    rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": rental_id}}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    if rental["status"] == "returned":
        raise HTTPException(status_code=400, detail="Rental already fully returned")
    
    # Mark all items as returned
    for item in rental["items"]:
        if item.get("returned"):
            continue  # Skip already returned items
            
        item["returned"] = True
        item["return_date"] = datetime.now(timezone.utc).isoformat()
        
        # Get the item document to check if it's generic
        item_doc = await db.items.find_one({**current_user.get_store_filter(), **{"id": item.get("item_id")}})
        
        if item_doc and item_doc.get("is_generic"):
            # GENERIC ITEM: Return stock
            quantity_to_return = item.get("quantity", 1)
            current_available = item_doc.get("stock_available", 0)
            total_stock = item_doc.get("stock_total", 0)
            new_available = min(current_available + quantity_to_return, total_stock)
            
            await db.items.update_one(
                {"id": item.get("item_id")},
                {"$set": {"stock_available": new_available}}
            )
        else:
            # REGULAR ITEM: Update status to available
            await db.items.update_one(
                {"barcode": item["barcode"]},
                {"$set": {"status": "available"}}
            )
    
    # Update rental status
    await db.rentals.update_one(
        {"id": rental_id},
        {
            "$set": {
                "items": rental["items"],
                "status": "returned",
                "actual_return_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Quick return successful", "items_returned": len(rental["items"])}

# ==================== MAINTENANCE ROUTES ====================

@api_router.post("/maintenance", response_model=MaintenanceResponse)
async def create_maintenance(maintenance: MaintenanceCreate, current_user: CurrentUser = Depends(get_current_user)):
    item = await db.items.find_one({**current_user.get_store_filter(), **{"id": maintenance.item_id}}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    maintenance_id = str(uuid.uuid4())
    doc = {
        "id": maintenance_id,
        "item_id": maintenance.item_id,
        "item_barcode": item["barcode"],
        "item_description": f"{item['brand']} {item['model']} - {item['size']}",
        "maintenance_type": maintenance.maintenance_type,
        "description": maintenance.description,
        "cost": maintenance.cost,
        "status": "pending",
        "scheduled_date": maintenance.scheduled_date,
        "completed_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.maintenance.insert_one(doc)
    await db.items.update_one({**current_user.get_store_filter(), "id": maintenance.item_id}, {"$set": {"status": "maintenance"}})
    
    return MaintenanceResponse(**doc)

@api_router.get("/maintenance", response_model=List[MaintenanceResponse])
async def get_maintenance(
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {**current_user.get_store_filter()}
    if status:
        query["status"] = status
    
    records = await db.maintenance.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return [MaintenanceResponse(**r) for r in records]

@api_router.get("/maintenance/fleet")
async def get_maintenance_fleet(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get ALL items that need maintenance or are currently in maintenance status.
    This endpoint uses the SAME query as the Dashboard for consistency.
    Multi-tenant: Filters by store_id
    
    Returns items that:
    1. Have status 'maintenance' (currently being serviced)
    2. Need maintenance: days_used >= maintenance_interval (and maintenance_interval > 0)
    3. Have status indicating repair: 'repair', 'broken'
    """
    
    # 1. Items currently in maintenance status - Multi-tenant: Filter by store
    in_maintenance = await db.items.find(
        {**current_user.get_store_filter(), "status": {"$in": ["maintenance", "repair", "broken"]}},
        {"_id": 0}
    ).to_list(5000)
    
    # 2. Items that NEED maintenance (same query as Dashboard) - Multi-tenant: Filter by store
    # Exclude items with maintenance_interval <= 0 to avoid false positives with generic items
    needs_maintenance = await db.items.find(
        {
            **current_user.get_store_filter(),
            "$expr": {
                "$and": [
                    {"$gt": ["$maintenance_interval", 0]},
                    {"$gte": ["$days_used", "$maintenance_interval"]}
                ]
            },
            "status": {"$in": ["available", "rented"]}
        },
        {"_id": 0}
    ).to_list(5000)
    
    # 3. Also include generic items with maintenance_interval = 0 that Dashboard shows
    # (for consistency with what user sees) - Multi-tenant: Filter by store
    generic_needs_maint = await db.items.find(
        {
            **current_user.get_store_filter(),
            "is_generic": True,
            "maintenance_interval": 0,
            "status": {"$in": ["available", "rented"]}
        },
        {"_id": 0}
    ).to_list(5000)
    
    # Combine all, avoiding duplicates
    all_ids = set()
    result = {
        "in_maintenance": [],
        "needs_maintenance": [],
        "summary": {
            "in_maintenance_count": 0,
            "needs_maintenance_count": 0,
            "total": 0
        }
    }
    
    for item in in_maintenance:
        if item["id"] not in all_ids:
            all_ids.add(item["id"])
            result["in_maintenance"].append(item)
    
    for item in needs_maintenance + generic_needs_maint:
        if item["id"] not in all_ids:
            all_ids.add(item["id"])
            # Calculate remaining days
            interval = item.get("maintenance_interval", 30) or 30
            days_used = item.get("days_used", 0)
            remaining = max(0, interval - (days_used % interval)) if interval > 0 else 0
            item["maintenance_remaining_days"] = remaining
            item["maintenance_progress"] = min(100, (days_used / interval * 100)) if interval > 0 else 100
            result["needs_maintenance"].append(item)
    
    result["summary"]["in_maintenance_count"] = len(result["in_maintenance"])
    result["summary"]["needs_maintenance_count"] = len(result["needs_maintenance"])
    result["summary"]["total"] = len(all_ids)
    
    return result

@api_router.post("/maintenance/{maintenance_id}/complete")
async def complete_maintenance(maintenance_id: str, current_user: CurrentUser = Depends(get_current_user)):
    maintenance = await db.maintenance.find_one({"id": maintenance_id})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    
    await db.maintenance.update_one(
        {"id": maintenance_id},
        {"$set": {"status": "completed", "completed_date": datetime.now(timezone.utc).isoformat()}}
    )
    await db.items.update_one({**current_user.get_store_filter(), "id": maintenance["item_id"]}, {"$set": {"status": "available"}})
    
    return {"message": "Maintenance completed"}

# ==================== EXTERNAL WORKSHOP (TALLER EXTERNO) ROUTES ====================

EXTERNAL_SERVICES = {
    "wax": {"label": "Encerado", "price": 15},
    "sharpen": {"label": "Afilado", "price": 20},
    "patch": {"label": "Parcheado", "price": 25},
    "bindings": {"label": "Montaje fijaciones", "price": 35},
    "base_repair": {"label": "Reparación base", "price": 30},
    "full_tune": {"label": "Puesta a punto completa", "price": 45},
}

@api_router.post("/external-repairs", response_model=ExternalRepairResponse)
async def create_external_repair(repair: ExternalRepairCreate, current_user: CurrentUser = Depends(get_current_user)):
    repair_id = str(uuid.uuid4())
    
    doc = {
        "id": repair_id,
        "customer_name": repair.customer_name,
        "customer_phone": repair.customer_phone,
        "customer_id": repair.customer_id,
        "equipment_description": repair.equipment_description,
        "services": repair.services,
        "delivery_date": repair.delivery_date,
        "delivery_time": repair.delivery_time,
        "priority": repair.priority,
        "price": repair.price,
        "notes": repair.notes or "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "delivered_at": None,
        "payment_method": None
    }
    
    await db.external_repairs.insert_one(doc)
    return ExternalRepairResponse(**doc)

@api_router.get("/external-repairs", response_model=List[ExternalRepairResponse])
async def get_external_repairs(
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    query = {**current_user.get_store_filter()}
    if status and status != "all":
        query["status"] = status
    
    repairs = await db.external_repairs.find(query, {"_id": 0}).sort("delivery_date", 1).to_list(200)
    return [ExternalRepairResponse(**r) for r in repairs]

@api_router.get("/external-repairs/{repair_id}", response_model=ExternalRepairResponse)
async def get_external_repair(repair_id: str, current_user: CurrentUser = Depends(get_current_user)):
    repair = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    return ExternalRepairResponse(**repair)

@api_router.put("/external-repairs/{repair_id}")
async def update_external_repair(repair_id: str, repair: ExternalRepairCreate, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    update_data = {
        "customer_name": repair.customer_name,
        "customer_phone": repair.customer_phone,
        "customer_id": repair.customer_id,
        "equipment_description": repair.equipment_description,
        "services": repair.services,
        "delivery_date": repair.delivery_date,
        "delivery_time": repair.delivery_time,
        "priority": repair.priority,
        "price": repair.price,
        "notes": repair.notes or ""
    }
    
    await db.external_repairs.update_one({"id": repair_id}, {"$set": update_data})
    updated = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    return ExternalRepairResponse(**updated)

@api_router.post("/external-repairs/{repair_id}/complete")
async def complete_external_repair(repair_id: str, current_user: CurrentUser = Depends(get_current_user)):
    repair = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    await db.external_repairs.update_one(
        {"id": repair_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Repair marked as completed"}

class DeliverAndChargeRequest(BaseModel):
    payment_method: str = "cash"

@api_router.post("/external-repairs/{repair_id}/deliver")
async def deliver_external_repair(
    repair_id: str, 
    delivery: DeliverAndChargeRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    repair = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update repair status
    await db.external_repairs.update_one(
        {"id": repair_id},
        {"$set": {
            "status": "delivered",
            "delivered_at": now,
            "payment_method": delivery.payment_method
        }}
    )
    
    # Create cash movement (income from workshop)
    if repair["price"] > 0:
        # Validate active cash session FIRST
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
        
        if not active_session:
            raise HTTPException(
                status_code=400,
                detail="No hay sesión de caja activa. Abre la caja primero desde 'Gestión de Caja'."
            )
        
        cash_movement_id = str(uuid.uuid4())
        operation_number = await get_next_operation_number()
        # Build description from notes or services
        work_desc = repair.get("notes", "") or ", ".join(repair.get("services", ["Reparación"]))
        cash_doc = {
            "id": cash_movement_id,
            "operation_number": operation_number,
            "session_id": active_session["id"],
            "movement_type": "income",
            "amount": repair["price"],
            "payment_method": delivery.payment_method,
            "category": "workshop",
            "concept": f"Servicio Taller: {repair['customer_name']}",
            "reference_id": repair_id,
            "customer_name": repair["customer_name"],
            "notes": f"{repair['equipment_description']} - {work_desc[:50]}",
            "created_at": now,
            "created_by": current_user.username
        }
        await db.cash_movements.insert_one(cash_doc)
    
    return {"message": "Repair delivered and charged", "amount": repair["price"], "operation_number": operation_number if repair["price"] > 0 else None}

@api_router.delete("/external-repairs/{repair_id}")
async def delete_external_repair(repair_id: str, current_user: CurrentUser = Depends(get_current_user)):
    result = await db.external_repairs.delete_one({"id": repair_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Repair not found")
    return {"message": "Repair deleted"}

@api_router.get("/external-services")
async def get_external_services(current_user: CurrentUser = Depends(get_current_user)):
    """Returns available services and their default prices"""
    return EXTERNAL_SERVICES

# ==================== FINANCIAL CALCULATOR SERVICE (SINGLE SOURCE OF TRUTH) ====================

class FinancialCalculatorService:
    """
    Servicio centralizado de cálculo financiero.
    
    REGLA FUNDAMENTAL: Ambas vistas (Caja y Reportes) DEBEN usar este servicio
    para garantizar que los totales SIEMPRE coincidan.
    
    FUENTE DE DATOS: cash_movements (única fuente de verdad)
    - Todos los cobros de alquileres crean un cash_movement
    - Todos los ajustes, devoluciones, gastos crean cash_movements
    - Los reportes NUNCA deben leer de rentals.paid_amount directamente
    
    MANEJO DE DEVOLUCIONES:
    - Las devoluciones se restan del día en que OCURREN (flujo de caja real)
    - No se modifican los días anteriores
    
    TIMEZONE: Todas las fechas usan el formato ISO local (YYYY-MM-DDT00:00:00)
    """
    
    @staticmethod
    async def get_financial_summary(
        start_date: str,
        end_date: str,
        store_filter: dict = None,
        session_id: str = None,
        include_manual_movements: bool = True,
        include_deposits: bool = True
    ) -> dict:
        """
        Calcula el resumen financiero para un rango de fechas.
        
        Args:
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)
            session_id: Si se proporciona, filtra por sesión específica
            include_manual_movements: Incluir entradas/salidas manuales de caja
            include_deposits: Incluir fianzas
            
        Returns:
            dict con totales por método de pago y tipo de movimiento
        """
        start_dt = f"{start_date}T00:00:00"
        end_dt = f"{end_date}T23:59:59"
        
        # Construir filtro base - Multi-tenant: Include store_filter if provided
        match_filter = {
            "created_at": {"$gte": start_dt, "$lte": end_dt}
        }
        
        # Multi-tenant: Add store filter if provided
        if store_filter:
            match_filter.update(store_filter)
        
        # Filtrar por sesión si se proporciona
        if session_id:
            match_filter["session_id"] = session_id
        
        # Excluir tipos de movimiento según configuración
        exclude_types = []
        if not include_manual_movements:
            exclude_types.extend(["manual_entry", "manual_withdrawal", "adjustment"])
        if not include_deposits:
            exclude_types.extend(["deposit", "deposit_return"])
        
        if exclude_types:
            match_filter["type"] = {"$nin": exclude_types}
        
        # Pipeline de agregación unificado
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": {
                    "movement_type": "$movement_type",
                    "payment_method": {"$ifNull": ["$payment_method", "cash"]},
                    "category": {"$ifNull": ["$category", "other"]}
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        
        results = await db.cash_movements.aggregate(pipeline).to_list(200)
        
        # Inicializar estructura de resultados
        summary = {
            "period": {"start": start_date, "end": end_date},
            "by_payment_method": {
                "cash": {"income": 0, "expense": 0, "refund": 0, "neto": 0, "count": 0},
                "card": {"income": 0, "expense": 0, "refund": 0, "neto": 0, "count": 0}
            },
            "by_category": {
                "rental": {"total": 0, "count": 0},
                "rental_adjustment": {"total": 0, "count": 0},
                "swap_supplement": {"total": 0, "count": 0},
                "swap_refund": {"total": 0, "count": 0},
                "return": {"total": 0, "count": 0},
                "external_repair": {"total": 0, "count": 0},
                "manual": {"total": 0, "count": 0},
                "other": {"total": 0, "count": 0}
            },
            "totals": {
                "gross_income": 0,
                "total_expenses": 0,
                "total_refunds": 0,
                "net_balance": 0,
                "cash_neto": 0,
                "card_neto": 0
            },
            "movements_count": 0
        }
        
        # Procesar resultados
        for r in results:
            movement_type = r["_id"]["movement_type"]
            payment_method = r["_id"]["payment_method"]
            category = r["_id"]["category"]
            amount = r["total"]
            count = r["count"]
            
            summary["movements_count"] += count
            
            # Asegurar que el método existe
            if payment_method not in summary["by_payment_method"]:
                summary["by_payment_method"][payment_method] = {
                    "income": 0, "expense": 0, "refund": 0, "neto": 0, "count": 0
                }
            
            # Acumular por tipo de movimiento
            if movement_type == "income":
                summary["by_payment_method"][payment_method]["income"] += amount
                summary["by_payment_method"][payment_method]["count"] += count
                summary["totals"]["gross_income"] += amount
            elif movement_type == "expense":
                summary["by_payment_method"][payment_method]["expense"] += amount
                summary["totals"]["total_expenses"] += amount
            elif movement_type == "refund":
                summary["by_payment_method"][payment_method]["refund"] += amount
                summary["totals"]["total_refunds"] += amount
            
            # Acumular por categoría
            if category in summary["by_category"]:
                if movement_type == "income":
                    summary["by_category"][category]["total"] += amount
                elif movement_type == "refund":
                    summary["by_category"][category]["total"] -= amount
                summary["by_category"][category]["count"] += count
        
        # Calcular netos por método de pago
        for method in summary["by_payment_method"]:
            m = summary["by_payment_method"][method]
            m["neto"] = m["income"] - m["expense"] - m["refund"]
        
        summary["totals"]["cash_neto"] = summary["by_payment_method"]["cash"]["neto"]
        summary["totals"]["card_neto"] = summary["by_payment_method"]["card"]["neto"]
        summary["totals"]["net_balance"] = (
            summary["totals"]["gross_income"] - 
            summary["totals"]["total_expenses"] - 
            summary["totals"]["total_refunds"]
        )
        
        return summary
    
    @staticmethod
    async def get_reconciliation_data(start_date: str, end_date: str, store_filter: dict = None) -> dict:
        """
        Genera datos de reconciliación para depurar discrepancias.
        Multi-tenant: Acepta store_filter para aislar datos por tienda.
        
        Compara:
        1. Lo que dice cash_movements
        2. Lo que dice rentals.paid_amount
        3. Identifica transacciones huérfanas
        """
        start_dt = f"{start_date}T00:00:00"
        end_dt = f"{end_date}T23:59:59"
        
        # Construir filtro base
        base_filter = {
            "created_at": {"$gte": start_dt, "$lte": end_dt}
        }
        
        # Multi-tenant: Add store filter if provided
        if store_filter:
            base_filter.update(store_filter)
        
        # 1. Obtener todos los cash_movements del período
        movements = await db.cash_movements.find(base_filter, {"_id": 0}).to_list(5000)
        
        # 2. Obtener todos los rentals del período
        rentals = await db.rentals.find(
            base_filter,
            {"_id": 0, "id": 1, "paid_amount": 1, "payment_method": 1, "customer_name": 1}
        ).to_list(5000)
        
        # 3. Calcular totales de cada fuente
        movements_total = {
            "cash": sum(m["amount"] for m in movements if m.get("payment_method") == "cash" and m.get("movement_type") == "income"),
            "card": sum(m["amount"] for m in movements if m.get("payment_method") == "card" and m.get("movement_type") == "income")
        }
        
        rentals_total = {
            "cash": sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") == "cash"),
            "card": sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") == "card")
        }
        
        # 4. Identificar discrepancias
        # Rentals sin movimiento de caja correspondiente
        rental_ids_with_movement = set(
            m.get("rental_id") for m in movements 
            if m.get("rental_id") and m.get("category") == "rental"
        )
        orphan_rentals = [
            {"id": r["id"], "amount": r.get("paid_amount", 0), "customer": r.get("customer_name")}
            for r in rentals 
            if r["id"] not in rental_ids_with_movement and r.get("paid_amount", 0) > 0
        ]
        
        # Movimientos sin rental correspondiente
        rental_ids = set(r["id"] for r in rentals)
        orphan_movements = [
            {"id": m.get("id"), "rental_id": m.get("rental_id"), "amount": m.get("amount")}
            for m in movements 
            if m.get("rental_id") and m.get("rental_id") not in rental_ids and m.get("category") == "rental"
        ]
        
        # 5. Calcular diferencias
        discrepancy = {
            "cash": movements_total["cash"] - rentals_total["cash"],
            "card": movements_total["card"] - rentals_total["card"]
        }
        
        return {
            "period": {"start": start_date, "end": end_date},
            "cash_movements_totals": movements_total,
            "rentals_totals": rentals_total,
            "discrepancy": discrepancy,
            "orphan_rentals": orphan_rentals[:50],  # Limitar a 50
            "orphan_movements": orphan_movements[:50],
            "explanation": {
                "positive_discrepancy": "cash_movements tiene más → puede incluir ajustes, reparaciones, etc.",
                "negative_discrepancy": "rentals tiene más → hay alquileres sin registro en caja",
                "expected": "Normalmente cash_movements >= rentals porque incluye más tipos de transacciones"
            }
        }


# Instancia global del servicio
financial_service = FinancialCalculatorService()

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/daily", response_model=DailyReportResponse)
async def get_daily_report(date: Optional[str] = None, current_user: CurrentUser = Depends(require_admin)):
    """
    Reporte diario usando el servicio financiero centralizado.
    GARANTIZA coincidencia con la vista de Caja.
    Solo accesible para ADMIN y SUPER_ADMIN.
    """
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    # ===== USAR SERVICIO CENTRALIZADO (Single Source of Truth) =====
    financial_summary = await financial_service.get_financial_summary(
        date, date, store_filter=current_user.get_store_filter()
    )
    
    # Extraer totales por método de pago desde cash_movements
    cash_revenue = financial_summary["by_payment_method"]["cash"]["income"]
    card_revenue = financial_summary["by_payment_method"]["card"]["income"]
    
    # Para online y other, buscar en cash_movements con payment_method específico
    # Multi-tenant: Filter by store
    other_methods = await db.cash_movements.aggregate([
        {"$match": {
            **current_user.get_store_filter(),
            "created_at": {"$gte": start, "$lte": end},
            "movement_type": "income",
            "payment_method": {"$nin": ["cash", "card"]}
        }},
        {"$group": {
            "_id": "$payment_method",
            "total": {"$sum": "$amount"}
        }}
    ]).to_list(10)
    
    online_revenue = 0
    other_revenue = 0
    for m in other_methods:
        if m["_id"] in ["online", "pago_online"]:
            online_revenue += m["total"]
        else:
            other_revenue += m["total"]
    
    # Get rentals count for the day (operational data, not financial) - Multi-tenant: Filter by store
    rentals_count = await db.rentals.count_documents({
        **current_user.get_store_filter(),
        "created_at": {"$gte": start, "$lte": end}
    })
    
    # Get returns for the day - Multi-tenant: Filter by store
    returns_count = await db.rentals.count_documents({
        **current_user.get_store_filter(),
        "status": "returned",
        "actual_return_date": {"$gte": start, "$lte": end}
    })
    
    # Get active rentals - Multi-tenant: Filter by store
    active_rentals = await db.rentals.count_documents({**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}})
    
    # Get pending returns - Multi-tenant: Filter by store
    pending_returns = await db.rentals.find(
        {**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    ).to_list(5000)
    
    pending_list = []
    for r in pending_returns:
        pending_items = [i for i in r.get("items", []) if not i.get("returned", False)]
        if pending_items:
            pending_list.append({
                "rental_id": r["id"],
                "customer_name": r.get("customer_name", ""),
                "customer_dni": r.get("customer_dni", ""),
                "end_date": r.get("end_date", ""),
                "pending_items": len(pending_items),
                "pending_amount": r.get("pending_amount", 0)
            })
    
    # Calculate inventory usage (percentage of items rented) - Multi-tenant: Filter by store
    total_items = await db.items.count_documents({**current_user.get_store_filter(), "status": {"$nin": ["deleted", "retired"]}})
    rented_items = await db.items.count_documents({**current_user.get_store_filter(), "status": "rented"})
    inventory_usage = (rented_items / total_items * 100) if total_items > 0 else 0
    
    total_revenue = cash_revenue + card_revenue + online_revenue + other_revenue
    
    return DailyReportResponse(
        date=date,
        total_revenue=total_revenue,
        cash_revenue=cash_revenue,
        card_revenue=card_revenue,
        online_revenue=online_revenue,
        other_revenue=other_revenue,
        new_rentals=rentals_count,
        returns=returns_count,
        active_rentals=active_rentals,
        pending_returns=pending_list,
        inventory_usage=round(inventory_usage, 1)
    )

@api_router.get("/reports/range", response_model=RangeReportResponse)
async def get_range_report(
    start_date: str,
    end_date: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Reporte por rango de fechas usando el servicio financiero centralizado.
    GARANTIZA coincidencia con la vista de Caja.
    Solo accesible para ADMIN y SUPER_ADMIN.
    
    Incluye:
    - Revenue breakdown by payment method (desde cash_movements)
    - Rentals and returns counts
    - External repairs revenue
    - Commission summary by provider
    - Pending returns
    """
    start_dt = f"{start_date}T00:00:00"
    end_dt = f"{end_date}T23:59:59"
    
    # ===== USAR SERVICIO CENTRALIZADO (Single Source of Truth) =====
    financial_summary = await financial_service.get_financial_summary(
        start_date, end_date, store_filter=current_user.get_store_filter()
    )
    
    # Extraer totales por método de pago desde cash_movements
    cash_revenue = financial_summary["by_payment_method"]["cash"]["income"]
    card_revenue = financial_summary["by_payment_method"]["card"]["income"]
    
    # Para online y other, buscar en cash_movements - Multi-tenant: Filter by store
    other_methods = await db.cash_movements.aggregate([
        {"$match": {
            **current_user.get_store_filter(),
            "created_at": {"$gte": start_dt, "$lte": end_dt},
            "movement_type": "income",
            "payment_method": {"$nin": ["cash", "card"]}
        }},
        {"$group": {
            "_id": "$payment_method",
            "total": {"$sum": "$amount"}
        }}
    ]).to_list(10)
    
    online_revenue = 0
    other_revenue = 0
    for m in other_methods:
        if m["_id"] in ["online", "pago_online"]:
            online_revenue += m["total"]
        else:
            other_revenue += m["total"]
    
    # Get rentals count in the range (operational data, not financial) - Multi-tenant: Filter by store
    rentals = await db.rentals.find({
        **current_user.get_store_filter(),
        "created_at": {"$gte": start_dt, "$lte": end_dt}
    }, {"_id": 0, "id": 1, "customer_id": 1, "paid_amount": 1}).to_list(5000)
    
    # Get returns in the range - Multi-tenant: Filter by store
    returns_count = await db.rentals.count_documents({
        **current_user.get_store_filter(),
        "status": "returned",
        "actual_return_date": {"$gte": start_dt, "$lte": end_dt}
    })
    
    # Get external repairs revenue (ya está en cash_movements pero también lo mostramos)
    repairs_revenue = financial_summary["by_category"].get("external_repair", {}).get("total", 0)
    
    # Calculate commissions by provider - Multi-tenant: Filter by store
    sources = await db.sources.find(current_user.get_store_filter(), {"_id": 0}).to_list(5000)
    commissions_list = []
    
    for source in sources:
        if source.get("commission_percent", 0) > 0:
            # Get customers from this source - Multi-tenant: Filter by store
            source_customers = await db.customers.find(
                {**current_user.get_store_filter(), "source_id": source["id"]},
                {"_id": 0, "id": 1}
            ).to_list(1000)
            
            customer_ids = [c["id"] for c in source_customers]
            
            if customer_ids:
                # Get rentals from these customers in the date range - Multi-tenant: Filter by store
                source_rentals = await db.rentals.find({
                    **current_user.get_store_filter(),
                    "customer_id": {"$in": customer_ids},
                    "created_at": {"$gte": start_dt, "$lte": end_dt}
                }, {"_id": 0, "paid_amount": 1}).to_list(1000)
                
                revenue_generated = sum(r.get("paid_amount", 0) for r in source_rentals)
                
                if revenue_generated > 0:
                    commission_amount = revenue_generated * (source.get("commission_percent", 0) / 100)
                    
                    commissions_list.append(CommissionSummary(
                        provider_name=source["name"],
                        provider_id=source["id"],
                        commission_percent=source.get("commission_percent", 0),
                        customer_count=len(customer_ids),
                        revenue_generated=revenue_generated,
                        commission_amount=commission_amount
                    ))
    
    # Get pending returns (all active/partial rentals) - Multi-tenant: Filter by store
    pending_returns = await db.rentals.find(
        {**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    ).to_list(200)
    
    pending_list = []
    for r in pending_returns:
        pending_items = [i for i in r.get("items", []) if not i.get("returned", False)]
        if pending_items:
            pending_list.append({
                "rental_id": r["id"],
                "customer_name": r.get("customer_name", ""),
                "customer_dni": r.get("customer_dni", ""),
                "end_date": r.get("end_date", ""),
                "pending_items": len(pending_items),
                "pending_amount": r.get("pending_amount", 0)
            })
    
    total_revenue = cash_revenue + card_revenue + online_revenue + other_revenue + repairs_revenue
    
    return RangeReportResponse(
        start_date=start_date,
        end_date=end_date,
        total_revenue=total_revenue,
        cash_revenue=cash_revenue,
        card_revenue=card_revenue,
        online_revenue=online_revenue,
        other_revenue=other_revenue,
        repairs_revenue=repairs_revenue,
        new_rentals=len(rentals),
        returns=returns_count,
        pending_returns=pending_list,
        commissions=commissions_list
    )

@api_router.get("/reports/reconciliation")
async def get_reconciliation_report(
    start_date: str,
    end_date: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Endpoint de reconciliación para depurar discrepancias entre Caja y Reportes.
    Solo accesible para ADMIN y SUPER_ADMIN.
    
    Compara:
    1. Totales de cash_movements (fuente de verdad)
    2. Totales de rentals.paid_amount (referencia)
    3. Identifica transacciones huérfanas en ambas direcciones
    
    Uso: Cuando los totales de Caja no coinciden con los de Reportes
    """
    return await financial_service.get_reconciliation_data(
        start_date, end_date, store_filter=current_user.get_store_filter()
    )

@api_router.get("/reports/financial-summary")
async def get_unified_financial_summary(
    start_date: str,
    end_date: str,
    include_manual: bool = True,
    include_deposits: bool = True,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Resumen financiero unificado usando el servicio centralizado.
    Solo accesible para ADMIN y SUPER_ADMIN.
    
    Este endpoint GARANTIZA que los totales coincidan con la vista de Caja.
    
    Args:
        start_date: Fecha inicio (YYYY-MM-DD)
        end_date: Fecha fin (YYYY-MM-DD)
        include_manual: Incluir movimientos manuales de caja (default: True)
        include_deposits: Incluir fianzas (default: True)
    """
    return await financial_service.get_financial_summary(
        start_date, 
        end_date,
        include_manual_movements=include_manual,
        include_deposits=include_deposits,
        store_filter=current_user.get_store_filter()  # Multi-tenant: Add store filter
    )

# ==================== DAILY REPORT ENDPOINT ====================

@api_router.get("/reports/stats")
async def get_stats(current_user: CurrentUser = Depends(get_current_user)):
    """
    Dashboard stats - revenue_today now comes from cash_movements (Single Source of Truth)
    This ensures Dashboard shows same value as Cash Register.
    
    AUDITED METRICS:
    - pending_returns: COUNT rentals pending return (today + overdue)
    - customers_today: COUNT DISTINCT customers with rentals created today (unique clients)
    - occupancy_percent: Calculated over rentable inventory (excludes retired/lost/deleted)
    
    TIMEZONE: Uses Europe/Madrid for consistent date comparison
    """
    import pytz
    
    # Use Europe/Madrid timezone for consistent date handling
    madrid_tz = pytz.timezone('Europe/Madrid')
    today = datetime.now(madrid_tz).strftime("%Y-%m-%d")
    start = f"{today}T00:00:00"
    end = f"{today}T23:59:59"
    
    # Today's rentals count (new contracts) - Multi-tenant: Filter by store
    today_rentals = await db.rentals.count_documents({
        **current_user.get_store_filter(),
        "created_at": {"$gte": start, "$lte": end}
    })
    
    # ========== UNIFIED REVENUE CALCULATION (Single Source of Truth) ==========
    # Revenue today = Sum of all cash movements from today's active session
    # This includes: new rentals + adjustments (extensions/reductions) - refunds
    
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": today, "status": "open"}})
    
    if active_session:
        # Use MongoDB aggregation to calculate total revenue from cash movements
        # EXCLUDE unpaid methods: pending
        UNPAID_METHODS = ["pending"]
        
        revenue_pipeline = [
            {"$match": {
                "session_id": active_session["id"],
                "payment_method": {"$nin": UNPAID_METHODS}  # Exclude unpaid methods
            }},
            {"$group": {
                "_id": "$movement_type",
                "total": {"$sum": "$amount"}
            }}
        ]
        revenue_results = await db.cash_movements.aggregate(revenue_pipeline).to_list(10)
        
        total_income = 0
        total_refunds = 0
        
        for r in revenue_results:
            if r["_id"] == "income":
                total_income = r["total"]
            elif r["_id"] == "refund":
                total_refunds = r["total"]
        
        # Net revenue = income - refunds (same formula as cash register balance)
        today_revenue = total_income - total_refunds
        
        # Calculate UNPAID amount separately for display - Multi-tenant: Filter by store
        unpaid_rentals = await db.rentals.find({
            **current_user.get_store_filter(),
            "created_at": {"$gte": start, "$lte": end},
            "payment_method": {"$in": UNPAID_METHODS}
        }, {"_id": 0, "total_amount": 1}).to_list(1000)
        unpaid_amount = sum(r.get("total_amount", 0) for r in unpaid_rentals)
    else:
        # No active session - fallback to rentals created today
        # Also exclude unpaid methods here - Multi-tenant: Filter by store
        UNPAID_METHODS = ["pending"]
        rentals = await db.rentals.find({
            **current_user.get_store_filter(),
            "created_at": {"$gte": start, "$lte": end},
            "payment_method": {"$nin": UNPAID_METHODS}
        }, {"_id": 0, "paid_amount": 1}).to_list(10000)
        today_revenue = sum(r.get("paid_amount", 0) for r in rentals)
        unpaid_amount = 0
    
    # ========== PENDING RETURNS (HOY + ATRASADAS) ==========
    # NEW LOGIC: Count ALL pending returns (today + overdue)
    # - Returns DUE TODAY: end_date = today
    # - Returns OVERDUE: end_date < today
    # - Only rentals with status: active, partial (exclude finalized, returned, cancelled)
    # - Count rentals (not items) that have at least 1 unreturned item
    # This MUST match the count in "Devoluciones" page
    # Multi-tenant: Filter by store
    
    # Find all active/partial rentals with end_date <= today
    rentals_pending_return = await db.rentals.find(
        {
            **current_user.get_store_filter(),
            "status": {"$in": ["active", "partial"]},
            "end_date": {"$lte": today}  # Today OR overdue
        },
        {"_id": 0, "id": 1, "items": 1}
    ).to_list(1000)
    
    # Count rentals that have at least 1 unreturned item
    pending_returns_count = 0
    for rental in rentals_pending_return:
        has_pending_item = False
        for item in rental.get("items", []):
            if not item.get("returned", False):
                has_pending_item = True
                break
        
        if has_pending_item:
            pending_returns_count += 1
    
    # ========== CUSTOMERS TODAY (COUNT DISTINCT customer_id) ==========
    # Count unique customers who had a rental created today
    # This prevents counting the same customer multiple times if they rented multiple times
    # Also excludes cancelled/deleted rentals - Multi-tenant: Filter by store
    customers_pipeline = [
        {
            "$match": {
                **current_user.get_store_filter(),
                "created_at": {"$gte": start, "$lte": end},
                "status": {"$nin": ["cancelled", "deleted"]}  # Exclude cancelled/deleted
            }
        },
        {
            "$group": {
                "_id": "$customer_id"  # Group by unique customer_id
            }
        },
        {
            "$count": "unique_customers"
        }
    ]
    customers_result = await db.rentals.aggregate(customers_pipeline).to_list(1)
    customers_today = customers_result[0]["unique_customers"] if customers_result else 0
    
    # Active rentals - Multi-tenant: Filter by store
    active_rentals = await db.rentals.count_documents({**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}})
    
    # Separate count for overdue returns (for dashboard alerts)
    # Multi-tenant: Filter by store
    overdue_returns = 0
    rentals_due_today = []
    
    for rental in rentals_pending_return:
        end_date = rental.get("end_date", "").split("T")[0]  # Remove timestamp if present
        has_pending_item = False
        for item in rental.get("items", []):
            if not item.get("returned", False):
                has_pending_item = True
                break
        
        if has_pending_item:
            # DEBUG: Log the comparison
            # print(f"DEBUG: end_date={end_date}, today={today}, comparison={end_date < today}")
            if end_date < today:  # Only overdue (not today)
                overdue_returns += 1
            elif end_date == today:
                rentals_due_today.append(rental)
    
    # Inventory stats (now with proper occupancy calculation)
    inventory = await get_inventory_stats(current_user)
    
    return {
        "today_rentals": today_rentals,
        "revenue_today": today_revenue,  # Unified with cash register - EXCLUDES unpaid
        "unpaid_amount": unpaid_amount,  # NEW: Separate tracking of unpaid (pending + reservations)
        "pending_returns": pending_returns_count,  # TOTAL pending returns (today + overdue)
        "customers_today": customers_today,  # COUNT DISTINCT customers served today
        "active_rentals": active_rentals,
        "overdue_returns": overdue_returns,  # Only overdue (for alerts)
        "inventory": inventory
    }

# ==================== GLOBAL LOOKUP / REVERSE SEARCH ====================

@api_router.get("/lookup/{code}")
async def global_lookup(code: str, current_user: CurrentUser = Depends(get_current_user)):
    """
    GLOBAL REVERSE LOOKUP - Scan-to-Action
    
    Searches for a code (item barcode/internal_code or customer name) and returns:
    - If it's an item currently rented: returns the rental info + customer + item details
    - If it's a customer name: returns matching customers with their active rentals
    
    This enables the "scan the ski and get the customer" workflow.
    """
    code_upper = code.strip().upper()
    code_lower = code.strip().lower()
    
    results = {
        "found": False,
        "type": None,  # "rented_item", "available_item", "customer", "multiple_customers"
        "rental": None,
        "customer": None,
        "item": None,
        "customers": [],
        "message": ""
    }
    
    # STEP 1: Check if it's an item barcode/internal_code
    # Search in items collection
    item = await db.items.find_one({
        "$or": [
            {"barcode": {"$regex": f"^{code}$", "$options": "i"}},
            {"internal_code": {"$regex": f"^{code}$", "$options": "i"}}
        ]
    }, {"_id": 0})
    
    if item:
        # Found an item - check if it's currently rented
        if item.get("status") == "rented":
            # Find the active rental that contains this item
            rental = await db.rentals.find_one({
                "status": {"$in": ["active", "partial"]},
                "$or": [
                    {"items.barcode": {"$regex": f"^{code}$", "$options": "i"}},
                    {"items.internal_code": {"$regex": f"^{code}$", "$options": "i"}}
                ]
            }, {"_id": 0})
            
            if rental:
                # Find the specific item in the rental
                rented_item = None
                for ri in rental.get("items", []):
                    if not ri.get("returned"):
                        ri_barcode = (ri.get("barcode") or "").upper()
                        ri_internal = (ri.get("internal_code") or "").upper()
                        if ri_barcode == code_upper or ri_internal == code_upper:
                            rented_item = ri
                            break
                
                # Get customer details
                customer = None
                if rental.get("customer_id"):
                    customer = await db.customers.find_one(
                        {"id": rental["customer_id"]}, 
                        {"_id": 0}
                    )
                
                # Calculate days remaining
                try:
                    end_date = datetime.strptime(rental.get("end_date", "")[:10], "%Y-%m-%d")
                    today = datetime.now()
                    days_remaining = max(0, (end_date - today).days + 1)
                except:
                    days_remaining = rental.get("days", 0)
                
                results["found"] = True
                results["type"] = "rented_item"
                results["rental"] = {
                    "id": rental["id"],
                    "customer_name": rental.get("customer_name"),
                    "customer_dni": rental.get("customer_dni"),
                    "customer_phone": rental.get("customer_phone"),
                    "start_date": rental.get("start_date"),
                    "end_date": rental.get("end_date"),
                    "days": rental.get("days"),
                    "days_remaining": days_remaining,
                    "total_amount": rental.get("total_amount"),
                    "pending_amount": rental.get("pending_amount", 0),
                    "items": [i for i in rental.get("items", []) if not i.get("returned")],
                    "item_count": len([i for i in rental.get("items", []) if not i.get("returned")])
                }
                results["customer"] = customer
                results["item"] = {
                    "id": item.get("id"),
                    "barcode": item.get("barcode"),
                    "internal_code": item.get("internal_code"),
                    "item_type": item.get("item_type"),
                    "brand": item.get("brand"),
                    "model": item.get("model"),
                    "size": item.get("size"),
                    "category": item.get("category", "STANDARD"),
                    "rental_item_data": rented_item
                }
                results["message"] = f"Artículo alquilado por {rental.get('customer_name')}"
                return results
        
        # Item exists but is not rented
        results["found"] = True
        results["type"] = "available_item"
        results["item"] = {
            "id": item.get("id"),
            "barcode": item.get("barcode"),
            "internal_code": item.get("internal_code"),
            "item_type": item.get("item_type"),
            "brand": item.get("brand"),
            "model": item.get("model"),
            "size": item.get("size"),
            "status": item.get("status"),
            "category": item.get("category", "STANDARD")
        }
        results["message"] = f"Artículo disponible ({item.get('status')})"
        return results
    
    # STEP 2: Check if it's a customer name/DNI search
    customers = await db.customers.find({
        "$or": [
            {"name": {"$regex": code, "$options": "i"}},
            {"dni": {"$regex": f"^{code}$", "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(10)
    
    if customers:
        # Find active rentals for these customers
        customers_with_rentals = []
        
        for customer in customers:
            # Check for active rentals
            active_rental = await db.rentals.find_one({
                "status": {"$in": ["active", "partial"]},
                "$or": [
                    {"customer_id": customer.get("id")},
                    {"customer_dni": {"$regex": f"^{customer.get('dni')}$", "$options": "i"}}
                ]
            }, {"_id": 0})
            
            if active_rental:
                # Calculate days remaining
                try:
                    end_date = datetime.strptime(active_rental.get("end_date", "")[:10], "%Y-%m-%d")
                    today = datetime.now()
                    days_remaining = max(0, (end_date - today).days + 1)
                except:
                    days_remaining = active_rental.get("days", 0)
                
                customers_with_rentals.append({
                    "customer": customer,
                    "rental": {
                        "id": active_rental["id"],
                        "customer_name": active_rental.get("customer_name"),
                        "customer_dni": active_rental.get("customer_dni"),
                        "start_date": active_rental.get("start_date"),
                        "end_date": active_rental.get("end_date"),
                        "days": active_rental.get("days"),
                        "days_remaining": days_remaining,
                        "total_amount": active_rental.get("total_amount"),
                        "pending_amount": active_rental.get("pending_amount", 0),
                        "items": [i for i in active_rental.get("items", []) if not i.get("returned")],
                        "item_count": len([i for i in active_rental.get("items", []) if not i.get("returned")])
                    }
                })
        
        if len(customers_with_rentals) == 1:
            # Single customer with active rental
            results["found"] = True
            results["type"] = "customer"
            results["customer"] = customers_with_rentals[0]["customer"]
            results["rental"] = customers_with_rentals[0]["rental"]
            results["message"] = f"Cliente encontrado: {customers_with_rentals[0]['customer'].get('name')}"
        elif len(customers_with_rentals) > 1:
            # Multiple customers found
            results["found"] = True
            results["type"] = "multiple_customers"
            results["customers"] = customers_with_rentals
            results["message"] = f"{len(customers_with_rentals)} clientes encontrados con alquileres activos"
        else:
            # Customers found but no active rentals
            results["found"] = True
            results["type"] = "customer_no_rental"
            results["customers"] = [{"customer": c, "rental": None} for c in customers]
            results["message"] = f"{len(customers)} cliente(s) encontrado(s) sin alquileres activos"
        
        return results
    
    # Nothing found
    results["message"] = f"No se encontró ningún artículo ni cliente con '{code}'"
    return results


# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(current_user: CurrentUser = Depends(get_current_user)):
    stats = await get_stats(current_user)
    
    # Recent activity
    recent_rentals = await db.rentals.find({**current_user.get_store_filter(), }, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    # Occupancy by Category (Gama) - EXCLUDING retired/deleted/lost items
    # Only count rentable items: available, rented, maintenance
    # Multi-tenant: Filter by store
    category_stats = await db.items.aggregate([
        {
            "$match": {
                **current_user.get_store_filter(),
                "status": {"$in": ["available", "rented", "maintenance"]}  # Exclude retired/deleted/lost
            }
        },
        {
            "$group": {
                "_id": {
                    "category": {"$ifNull": ["$category", "MEDIA"]},
                    "status": "$status"
                },
                "count": {"$sum": 1}
            }
        }
    ]).to_list(50)
    
    # Process category stats for occupancy calculation
    occupancy_by_category = {
        "SUPERIOR": {"total": 0, "rented": 0, "maintenance": 0, "available": 0, "percentage": 0},
        "ALTA": {"total": 0, "rented": 0, "maintenance": 0, "available": 0, "percentage": 0},
        "MEDIA": {"total": 0, "rented": 0, "maintenance": 0, "available": 0, "percentage": 0}
    }
    
    for stat in category_stats:
        category = stat["_id"].get("category", "MEDIA")
        status = stat["_id"].get("status", "available")
        count = stat["count"]
        
        if category in occupancy_by_category:
            occupancy_by_category[category]["total"] += count
            if status == "rented":
                occupancy_by_category[category]["rented"] += count
            elif status == "maintenance":
                occupancy_by_category[category]["maintenance"] += count
            elif status == "available":
                occupancy_by_category[category]["available"] += count
    
    # Calculate percentages (rented / rentable_total * 100)
    for category in occupancy_by_category:
        total = occupancy_by_category[category]["total"]
        rented = occupancy_by_category[category]["rented"]
        if total > 0:
            occupancy_by_category[category]["percentage"] = round((rented / total) * 100, 1)
    
    # Maintenance Alerts (grouped by category and item type)
    # Multi-tenant: Filter by store
    maintenance_items = await db.items.aggregate([
        {
            "$match": {
                **current_user.get_store_filter(),
                "$expr": {
                    "$gte": ["$days_used", "$maintenance_interval"]
                },
                "status": {"$in": ["available", "rented"]}
            }
        },
        {
            "$addFields": {
                "category": {"$ifNull": ["$category", "MEDIA"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "category": "$category",
                    "item_type": "$item_type"
                },
                "count": {"$sum": 1},
                "items": {
                    "$push": {
                        "id": "$id",
                        "barcode": "$barcode",
                        "brand": "$brand",
                        "model": "$model",
                        "days_used": "$days_used",
                        "maintenance_interval": "$maintenance_interval"
                    }
                }
            }
        }
    ]).to_list(50)
    
    # Build maintenance alerts
    maintenance_alerts = []
    for group in maintenance_items:
        category = group["_id"].get("category", "MEDIA")
        item_type = group["_id"].get("item_type", "unknown")
        count = group["count"]
        
        # Determine service type based on item type
        service_type = "mantenimiento general"
        if item_type in ["ski", "snowboard"]:
            service_type = "encerado"
        elif item_type == "boots":
            service_type = "revisión"
        
        maintenance_alerts.append({
            "type": "maintenance",
            "category": category,
            "item_type": item_type,
            "count": count,
            "service_type": service_type,
            "message": f"{count} {item_type} (Gama {category}) requieren {service_type}",
            "severity": "warning",
            "items": group["items"]
        })
    
    # Alerts
    alerts = maintenance_alerts
    
    # Overdue rentals - Multi-tenant: Filter by store
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue_rentals = await db.rentals.find(
        {**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}, "end_date": {"$lt": today}},
        {"_id": 0}
    ).to_list(10)
    for rental in overdue_rentals:
        alerts.append({
            "type": "overdue",
            "message": f"Alquiler vencido: {rental['customer_name']} - {rental['end_date']}",
            "severity": "critical"
        })
    
    return {
        "stats": stats,
        "occupancy_by_category": occupancy_by_category,
        "recent_activity": recent_rentals[:5],
        "alerts": alerts
    }

@api_router.get("/dashboard/returns-control")
async def get_returns_control(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get pending returns by item type for today - the 'control tower' for end of day
    Multi-tenant: Filters by store_id
    """
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    
    # Get all rentals that should return today and are not yet returned - Multi-tenant: Filter by store
    pending_returns = await db.rentals.find({
        **current_user.get_store_filter(),
        "end_date": today_str,
        "status": {"$in": ["active", "pending"]}
    }, {"_id": 0}).to_list(10000)
    
    # Get item details for all items in pending returns
    item_ids = []
    for rental in pending_returns:
        for item in rental.get("items", []):
            item_ids.append(item.get("item_id"))
    
    items_data = {}
    if item_ids:
        # Multi-tenant: Filter items by store
        items_cursor = await db.items.find(
            {**current_user.get_store_filter(), "id": {"$in": item_ids}},
            {"_id": 0, "id": 1, "item_type": 1, "brand": 1, "model": 1, "internal_code": 1}
        ).to_list(10000)
        for item in items_cursor:
            items_data[item["id"]] = item
    
    # Get all item types (dynamic categories) - Multi-tenant: Filter by store
    item_types = await db.item_types.find(current_user.get_store_filter(), {"_id": 0}).to_list(5000)
    type_labels = {t["value"]: t["label"] for t in item_types}
    
    # Count by item type
    counts_by_type = {}
    details_by_type = {}
    
    for rental in pending_returns:
        for item in rental.get("items", []):
            item_id = item.get("item_id")
            item_info = items_data.get(item_id, {})
            item_type = item_info.get("item_type", "unknown")
            
            if item_type not in counts_by_type:
                counts_by_type[item_type] = 0
                details_by_type[item_type] = []
            
            counts_by_type[item_type] += 1
            details_by_type[item_type].append({
                "rental_id": rental.get("id"),
                "customer_name": rental.get("customer_name"),
                "internal_code": item_info.get("internal_code", "-"),
                "brand": item_info.get("brand", "-"),
                "model": item_info.get("model", "-")
            })
    
    # Build response with label names
    pending_by_category = []
    for item_type, count in sorted(counts_by_type.items(), key=lambda x: -x[1]):
        label = type_labels.get(item_type, item_type.capitalize())
        pending_by_category.append({
            "item_type": item_type,
            "label": label,
            "count": count,
            "details": details_by_type.get(item_type, [])[:5]  # Limit details to 5
        })
    
    # Calculate total
    total_pending = sum(counts_by_type.values())
    
    # Get store closing hour (default 20:00)
    closing_hour = 20
    current_hour = today.hour
    is_past_closing = current_hour >= closing_hour
    
    return {
        "date": today_str,
        "total_pending": total_pending,
        "pending_by_category": pending_by_category,
        "is_past_closing": is_past_closing,
        "closing_hour": closing_hour,
        "current_hour": current_hour
    }

@api_router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get advanced analytics for dashboard:
    - Weekly availability calendar
    - Top rented items
    - Top revenue items
    - Stale stock
    
    Supports both predefined periods (today/week/month) and custom date ranges
    """
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    
    # Calculate date range based on parameters
    if start_date and end_date:
        # Custom date range mode
        analysis_start = start_date
        analysis_end = end_date
    elif period == "today":
        analysis_start = today_str
        analysis_end = today_str
    elif period == "week":
        analysis_start = today_str
        analysis_end = (today + timedelta(days=6)).strftime("%Y-%m-%d")
    else:  # month or default
        analysis_start = today.replace(day=1).strftime("%Y-%m-%d")
        analysis_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1).strftime("%Y-%m-%d")
    
    # ============ WEEKLY AVAILABILITY CALENDAR ============
    weekly_calendar = []
    
    # Get all items by category - Multi-tenant: Filter by store
    all_items = await db.items.find(
        {**current_user.get_store_filter(), "status": {"$in": ["available", "rented"]}},
        {"_id": 0, "id": 1, "category": 1, "status": 1}
    ).to_list(1000)
    
    # Count total by category
    totals_by_cat = {"SUPERIOR": 0, "ALTA": 0, "MEDIA": 0}
    for item in all_items:
        cat = item.get("category", "MEDIA")
        if cat in totals_by_cat:
            totals_by_cat[cat] += 1
    
    # Get active rentals - Multi-tenant: Filter by store
    active_rentals = await db.rentals.find(
        {**current_user.get_store_filter(), "status": {"$in": ["active", "partial"]}},
        {"_id": 0, "items": 1, "start_date": 1, "end_date": 1}
    ).to_list(10000)
    
    # Build 7-day calendar
    for day_offset in range(7):
        target_date = today + timedelta(days=day_offset)
        target_str = target_date.strftime("%Y-%m-%d")
        day_name = target_date.strftime("%a")
        day_num = target_date.day
        
        # Count rented items by category for this day
        rented_by_cat = {"SUPERIOR": 0, "ALTA": 0, "MEDIA": 0}
        deliveries = 0
        returns = 0
        
        for rental in active_rentals:
            rental_start = rental.get("start_date", "")[:10]
            rental_end = rental.get("end_date", "")[:10]
            
            # Check if rental is active on this day
            if rental_start <= target_str <= rental_end:
                for item in rental.get("items", []):
                    cat = item.get("category", "MEDIA")
                    if cat in rented_by_cat:
                        rented_by_cat[cat] += 1
            
            # Count deliveries (start date)
            if rental_start == target_str:
                deliveries += 1
            
            # Count returns (end date)
            if rental_end == target_str:
                returns += 1
        
        # Calculate availability percentages
        day_categories = {}
        for cat in ["SUPERIOR", "ALTA", "MEDIA"]:
            total = totals_by_cat[cat]
            rented = rented_by_cat[cat]
            available = total - rented
            percentage = round((available / total * 100), 1) if total > 0 else 100
            
            # Determine status color
            if percentage >= 50:
                status = "high"  # Green
            elif percentage >= 20:
                status = "medium"  # Yellow
            else:
                status = "low"  # Red
            
            day_categories[cat] = {
                "total": total,
                "rented": rented,
                "available": available,
                "percentage": percentage,
                "status": status
            }
        
        weekly_calendar.append({
            "date": target_str,
            "day_name": day_name,
            "day_num": day_num,
            "is_today": day_offset == 0,
            "categories": day_categories,
            "deliveries": deliveries,
            "returns": returns
        })
    
    # ============ TOP RENTED ITEMS ============
    # Get rental counts based on analysis period - Multi-tenant: Filter by store
    rental_item_counts = {}
    rentals_for_stats = await db.rentals.find(
        {**current_user.get_store_filter(), "created_at": {"$gte": analysis_start, "$lte": analysis_end}},
        {"_id": 0, "items": 1, "total_amount": 1, "days": 1}
    ).to_list(10000)
    
    for rental in rentals_for_stats:
        items = rental.get("items", [])
        total = rental.get("total_amount", 0)
        per_item_revenue = total / len(items) if items else 0
        
        for item in items:
            barcode = item.get("barcode", "")
            if barcode:
                if barcode not in rental_item_counts:
                    rental_item_counts[barcode] = {
                        "barcode": barcode,
                        "brand": item.get("brand", ""),
                        "model": item.get("model", ""),
                        "item_type": item.get("item_type", ""),
                        "size": item.get("size", ""),
                        "category": item.get("category", "STANDARD"),
                        "rental_count": 0,
                        "total_revenue": 0
                    }
                rental_item_counts[barcode]["rental_count"] += 1
                rental_item_counts[barcode]["total_revenue"] += per_item_revenue
    
    # Sort for top rented
    all_items_stats = list(rental_item_counts.values())
    top_rented = sorted(all_items_stats, key=lambda x: x["rental_count"], reverse=True)[:5]
    top_revenue = sorted(all_items_stats, key=lambda x: x["total_revenue"], reverse=True)[:5]
    
    # ============ STALE STOCK ============
    # Items not rented recently
    all_item_barcodes = set(item.get("barcode") for item in all_items if item.get("status") == "available")
    recently_rented_barcodes = set(rental_item_counts.keys())
    stale_barcodes = all_item_barcodes - recently_rented_barcodes
    
    stale_items = []
    if stale_barcodes:
        # Multi-tenant: Filter by store
        stale_item_data = await db.items.find(
            {**current_user.get_store_filter(), "barcode": {"$in": list(stale_barcodes)}, "status": "available"},
            {"_id": 0}
        ).to_list(10)
        
        for item in stale_item_data[:3]:
            # Calculate days idle based on custom period or default
            if start_date and end_date:
                # Custom range: approximate based on date difference
                days_idle = (datetime.strptime(analysis_end, "%Y-%m-%d") - datetime.strptime(analysis_start, "%Y-%m-%d")).days
            elif period == "month":
                days_idle = 30
            elif period == "week":
                days_idle = 7
            else:
                days_idle = 1
            
            stale_items.append({
                "barcode": item.get("barcode"),
                "brand": item.get("brand", ""),
                "model": item.get("model", ""),
                "item_type": item.get("item_type", ""),
                "size": item.get("size", ""),
                "category": item.get("category", "STANDARD"),
                "days_idle": days_idle
            })
    
    return {
        "weekly_calendar": weekly_calendar,
        "top_rented": top_rented,
        "top_revenue": top_revenue,
        "stale_stock": stale_items,
        "period": period,
        "date_range": {
            "start": analysis_start,
            "end": analysis_end
        }
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/")
async def root():
    return {"message": "AlpineFlow API v1.0"}

# ==================== SOURCES (PROVEEDORES) ROUTES ====================

class SourceCreate(BaseModel):
    name: str
    is_favorite: bool = False
    discount_percent: float = 0
    commission_percent: float = 0
    contact_person: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""
    active: bool = True

class SourceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    is_favorite: bool
    discount_percent: float = 0
    commission_percent: float = 0
    contact_person: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    active: bool = True
    customer_count: int = 0
    created_at: str = ""

@api_router.post("/sources", response_model=SourceResponse)
async def create_source(source: SourceCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Check existing within same store
    existing = await db.sources.find_one({**current_user.get_store_filter(), "name": source.name})
    if existing:
        raise HTTPException(status_code=400, detail="Source already exists")
    
    source_id = str(uuid.uuid4())
    doc = {
        "id": source_id,
        "store_id": current_user.store_id,  # Multi-tenant: Add store_id
        "name": source.name,
        "is_favorite": source.is_favorite,
        "discount_percent": source.discount_percent,
        "commission_percent": source.commission_percent,
        "contact_person": source.contact_person or "",
        "email": source.email or "",
        "phone": source.phone or "",
        "notes": source.notes or "",
        "active": source.active,
        "customer_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sources.insert_one(doc)
    return SourceResponse(**doc)

@api_router.get("/sources", response_model=List[SourceResponse])
async def get_sources(current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Filter by store_id
    sources = await db.sources.find(current_user.get_store_filter(), {"_id": 0}).sort([("is_favorite", -1), ("name", 1)]).to_list(5000)
    
    # Count customers per source (within same store)
    for source in sources:
        count = await db.customers.count_documents({**current_user.get_store_filter(), "source": source["name"]})
        source["customer_count"] = count
    
    return [SourceResponse(**s) for s in sources]

@api_router.delete("/sources/{source_id}")
async def delete_source(source_id: str, current_user: CurrentUser = Depends(get_current_user)):
    # SEGURIDAD: Solo ADMIN puede eliminar proveedores
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Solo los administradores pueden eliminar proveedores")
    
    # Multi-tenant: Check source exists in same store
    source = await db.sources.find_one({**current_user.get_store_filter(), "id": source_id})
    if not source:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # INTEGRIDAD: Verificar si hay clientes vinculados
    customer_count = await db.customers.count_documents({**current_user.get_store_filter(), "source": source["name"]})
    if customer_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el proveedor porque tiene {customer_count} cliente(s) asociado(s). Reasigna los clientes a otro proveedor primero."
        )
    
    # INTEGRIDAD: Verificar si hay artículos vinculados (por provider_id o source)
    items_by_provider_id = await db.items.count_documents({**current_user.get_store_filter(), "provider_id": source_id})
    items_by_source_name = await db.items.count_documents({**current_user.get_store_filter(), "source": source["name"]})
    total_items = items_by_provider_id + items_by_source_name
    
    if total_items > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el proveedor porque tiene {total_items} artículo(s) asociado(s). Reasigna los artículos a otro proveedor primero."
        )
    
    # Multi-tenant: Delete only from own store
    await db.sources.delete_one({**current_user.get_store_filter(), "id": source_id})
    return {"message": "Proveedor eliminado correctamente"}

@api_router.put("/sources/{source_id}", response_model=SourceResponse)
async def update_source(source_id: str, source: SourceCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Multi-tenant: Check existing in same store
    existing = await db.sources.find_one({**current_user.get_store_filter(), "id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Check if name changed and new name exists (within same store)
    if source.name != existing["name"]:
        name_exists = await db.sources.find_one({**current_user.get_store_filter(), "name": source.name, "id": {"$ne": source_id}})
        if name_exists:
            raise HTTPException(status_code=400, detail="Source name already exists")
    
    update_doc = {
        "name": source.name,
        "is_favorite": source.is_favorite,
        "discount_percent": source.discount_percent,
        "commission_percent": source.commission_percent,
        "contact_person": source.contact_person or "",
        "email": source.email or "",
        "phone": source.phone or "",
        "notes": source.notes or "",
        "active": source.active
    }
    # Multi-tenant: Update only in own store
    await db.sources.update_one({**current_user.get_store_filter(), "id": source_id}, {"$set": update_doc})
    
    updated = await db.sources.find_one({**current_user.get_store_filter(), "id": source_id}, {"_id": 0})
    # Count customers from same store
    count = await db.customers.count_documents({**current_user.get_store_filter(), "source": updated["name"]})
    updated["customer_count"] = count
    return SourceResponse(**updated)

@api_router.get("/sources/{source_id}/stats")
async def get_source_stats(source_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Get statistics for a specific provider/source"""
    # Multi-tenant: Check source exists in same store
    source = await db.sources.find_one({**current_user.get_store_filter(), "id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Get customers from this source (within same store)
    customers = await db.customers.find({**current_user.get_store_filter(), "source": source["name"]}, {"_id": 0}).to_list(1000)
    customer_ids = [c["id"] for c in customers]
    
    # Get rentals from these customers (within same store)
    rentals = await db.rentals.find(
        {**current_user.get_store_filter(), "customer_id": {"$in": customer_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Calculate statistics
    total_customers = len(customers)
    total_revenue = sum(r["total_amount"] for r in rentals)
    total_commission = total_revenue * (source["commission_percent"] / 100)
    average_ticket = total_revenue / len(rentals) if rentals else 0
    
    # Prepare detailed rental list
    rental_details = []
    for rental in rentals:
        commission = rental["total_amount"] * (source["commission_percent"] / 100)
        rental_details.append({
            "date": rental.get("created_at", ""),
            "customer_name": rental["customer_name"],
            "customer_dni": rental["customer_dni"],
            "amount": rental["total_amount"],
            "commission": commission,
            "rental_id": rental["id"]
        })
    
    return {
        "source": source,
        "stats": {
            "total_customers": total_customers,
            "total_revenue": total_revenue,
            "average_ticket": average_ticket,
            "total_commission": total_commission
        },
        "rentals": rental_details
    }

# ==================== CASH REGISTER (CAJA) ROUTES ====================

class CashMovementCreate(BaseModel):
    movement_type: str  # income, expense
    amount: float
    payment_method: str  # cash, card, transfer
    category: str
    concept: str
    reference_id: Optional[str] = None  # rental_id if from rental
    notes: Optional[str] = ""

class CashMovementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    operation_number: Optional[str] = None  # Format: AXXXXXX
    session_id: Optional[str] = None  # Cash session ID
    movement_type: str
    amount: float
    payment_method: str
    category: str
    concept: str
    reference_id: Optional[str] = None
    customer_name: Optional[str] = None
    notes: str
    created_at: str
    created_by: str
    # Rental details for ticket printing
    rental_items: Optional[List[dict]] = None  # Items from rental
    rental_days: Optional[int] = None  # Number of days
    rental_start_date: Optional[str] = None
    rental_end_date: Optional[str] = None

class CashClosingCreate(BaseModel):
    date: str
    physical_cash: float
    card_total: Optional[float] = 0
    expected_cash: Optional[float] = 0
    expected_card: Optional[float] = 0
    discrepancy_cash: Optional[float] = 0
    discrepancy_card: Optional[float] = 0
    discrepancy_total: Optional[float] = 0
    notes: Optional[str] = ""

class CashSessionCreate(BaseModel):
    opening_balance: float  # Fondo de caja inicial
    notes: Optional[str] = ""

class CashSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    session_number: int
    opened_at: str
    opened_by: str
    opening_balance: float
    status: str  # "open" or "closed"
    closed_at: Optional[str] = None
    closure_id: Optional[str] = None
    notes: str

class CashClosingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    session_id: Optional[str] = None
    total_income: float
    total_expense: float
    total_refunds: Optional[float] = 0
    expected_balance: float
    physical_cash: float
    card_total: Optional[float] = 0
    expected_cash: Optional[float] = 0
    expected_card: Optional[float] = 0
    discrepancy_cash: Optional[float] = 0
    discrepancy_card: Optional[float] = 0
    discrepancy_total: Optional[float] = 0
    difference: float
    notes: str
    closed_by: str
    closed_at: str
    movements_count: Optional[int] = 0
    by_payment_method: Optional[dict] = {}
    closure_number: Optional[int] = 1

# ==================== CASH SESSIONS ROUTES ====================

@api_router.post("/cash/sessions")
async def create_cash_session(session: CashSessionCreate, current_user: CurrentUser = Depends(get_current_user)):
    """Open a new cash session/shift (simple state change in DB)"""
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if there's already an open session for today
    existing_open = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    if existing_open:
        # Return existing session instead of error
        return CashSessionResponse(**{k: v for k, v in existing_open.items() if k != '_id'})
    
    # Get next session number for today
    sessions_today = await db.cash_sessions.count_documents({"date": date})
    session_number = sessions_today + 1
    
    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "store_id": current_user.store_id,  # CRITICAL: Multi-tenant isolation
        "date": date,
        "session_number": session_number,
        "opened_at": datetime.now(timezone.utc).isoformat(),
        "opened_by": current_user.username,
        "opening_balance": session.opening_balance or 0,
        "status": "open",
        "closed_at": None,
        "closure_id": None,
        "notes": ""
    }
    await db.cash_sessions.insert_one(doc)
    return CashSessionResponse(**doc)

@api_router.post("/cash/sessions/open")
async def open_cash_session(session: CashSessionCreate, current_user: CurrentUser = Depends(get_current_user)):
    """Open a new cash session/shift (alias for compatibility)"""
    return await create_cash_session(session, current_user)

@api_router.get("/cash/sessions/active")
async def get_active_session(current_user: CurrentUser = Depends(get_current_user)):
    """Get the currently active (open) cash session"""
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}}, {"_id": 0})
    
    if not session:
        return None
    
    return CashSessionResponse(**session)

@api_router.get("/cash/sessions")
async def get_cash_sessions(current_user: CurrentUser = Depends(get_current_user)):
    """Get all cash sessions (history)"""
    sessions = await db.cash_sessions.find({**current_user.get_store_filter(), }, {"_id": 0}).sort("opened_at", -1).to_list(5000)
    return [CashSessionResponse(**s) for s in sessions]

# ==================== CASH MOVEMENTS ROUTES ====================

async def get_next_operation_number():
    """
    Generate sequential operation number in format AXXXXXX (A + 6 digits).
    This is a GLOBAL counter for all cash movements (sales, refunds, expenses).
    """
    # Get or create the counter document
    counter = await db.counters.find_one_and_update(
        {"_id": "operation_number"},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=True
    )
    
    sequence = counter.get("sequence", 1)
    # Format as A + 6 digits (e.g., A000001, A000042, A123456)
    return f"A{sequence:06d}"

@api_router.post("/cash/movements")
async def create_cash_movement(movement: CashMovementCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Check if there's an active session
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    if not active_session:
        raise HTTPException(status_code=400, detail="No active cash session. Please open the cash register first.")
    
    movement_id = str(uuid.uuid4())
    operation_number = await get_next_operation_number()
    
    doc = {
        "id": movement_id,
        "operation_number": operation_number,
        "session_id": active_session["id"],
        "movement_type": movement.movement_type,
        "amount": movement.amount,
        "payment_method": movement.payment_method,
        "category": movement.category,
        "concept": movement.concept,
        "reference_id": movement.reference_id,
        "notes": movement.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.username
    }
    await db.cash_movements.insert_one(doc)
    return CashMovementResponse(**doc)

@api_router.get("/cash/movements")
async def get_cash_movements(
    date: Optional[str] = None,
    movement_type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get movements for ACTIVE SESSION only"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find active session
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    if not active_session:
        return []  # No active session = no movements to show
    
    # Query movements by session_id
    query = {**current_user.get_store_filter(), "session_id": active_session["id"]}
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.cash_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return [CashMovementResponse(**m) for m in movements]

@api_router.patch("/cash/movements/{movement_id}")
async def update_cash_movement(
    movement_id: str, 
    update_data: dict, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a cash movement (e.g., change payment method)"""
    # Find the movement
    movement = await db.cash_movements.find_one({**current_user.get_store_filter(), **{"id": movement_id}})
    
    if not movement:
        raise HTTPException(status_code=404, detail="Movement not found")
    
    # Only allow updating payment_method for now
    allowed_fields = {"payment_method"}
    filtered_update = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Validate payment_method
    if "payment_method" in filtered_update:
        if filtered_update["payment_method"] not in ["cash", "card"]:
            raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # Update the movement
    await db.cash_movements.update_one(
        {"id": movement_id},
        {"$set": filtered_update}
    )
    
    return {"status": "success", "updated_fields": list(filtered_update.keys())}

@api_router.get("/cash/summary")
async def get_cash_summary(date: Optional[str] = None, current_user: CurrentUser = Depends(get_current_user)):
    """Get cash summary for ACTIVE SESSION only (not full day)"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find active session for this date
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    # If no active session, return zeros
    if not active_session:
        return {
            "date": date,
            "session_id": None,
            "session_active": False,
            "opening_balance": 0,
            "total_income": 0,
            "total_expense": 0,
            "total_refunds": 0,
            "balance": 0,
            "by_payment_method": {},
            "movements_count": 0
        }
    
    # Get movements ONLY for active session
    movements = await db.cash_movements.find(
        {"session_id": active_session["id"]},
        {"_id": 0}
    ).to_list(10000)
    
    total_income = sum(m["amount"] for m in movements if m["movement_type"] == "income")
    total_expense = sum(m["amount"] for m in movements if m["movement_type"] == "expense")
    total_refunds = sum(m["amount"] for m in movements if m["movement_type"] == "refund")
    total_adjustments = sum(m["amount"] for m in movements if m["movement_type"] == "adjustment")
    
    # Group by payment method
    by_method = {}
    for m in movements:
        method = m["payment_method"]
        if method not in by_method:
            by_method[method] = {"income": 0, "expense": 0, "refund": 0, "adjustment": 0}
        movement_type = m["movement_type"]
        if movement_type in by_method[method]:
            by_method[method][movement_type] += m["amount"]
    
    # Net balance = Opening balance + Income - Expenses - Refunds + Adjustments
    balance = active_session["opening_balance"] + total_income - total_expense - total_refunds + total_adjustments
    
    return {
        "date": date,
        "session_id": active_session["id"],
        "session_active": True,
        "session_number": active_session.get("session_number", 1),
        "opening_balance": active_session["opening_balance"],
        "total_income": total_income,
        "total_expense": total_expense,
        "total_refunds": total_refunds,
        "total_adjustments": total_adjustments,
        "balance": balance,
        "by_payment_method": by_method,
        "movements_count": len(movements)
    }

@api_router.post("/cash/audit-sync")
async def audit_and_sync_cash_movements(current_user: CurrentUser = Depends(get_current_user)):
    """
    AUDITORÍA Y SINCRONIZACIÓN FORZADA DE CAJA
    Detecta alquileres/servicios pagados sin movimiento de caja y los crea automáticamente.
    Este endpoint asegura la integridad contable total.
    """
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find active session
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    if not active_session:
        raise HTTPException(status_code=400, detail="No hay sesión de caja activa. Abre la caja primero.")
    
    session_id = active_session["id"]
    session_opened_at = active_session.get("opened_at", date)
    
    # Get all existing movement reference_ids for this session
    existing_movements = await db.cash_movements.find(
        {"session_id": session_id},
        {"reference_id": 1}
    ).to_list(1000)
    existing_refs = set(m.get("reference_id") for m in existing_movements if m.get("reference_id"))
    
    created_movements = []
    
    # 1. AUDIT RENTALS - Find paid rentals created after session opened without corresponding movement
    rentals_query = {
        "paid_amount": {"$gt": 0},
        "created_at": {"$gte": session_opened_at}
    }
    rentals = await db.rentals.find(rentals_query, {"_id": 0}).to_list(10000)
    
    for rental in rentals:
        if rental["id"] not in existing_refs:
            # Missing movement! Create it
            cash_movement_id = str(uuid.uuid4())
            operation_number = await get_next_operation_number()
            cash_doc = {
                "id": cash_movement_id,
                "operation_number": operation_number,
                "session_id": session_id,
                "movement_type": "income",
                "amount": rental["paid_amount"],
                "payment_method": rental.get("payment_method", "cash"),
                "category": "rental",
                "concept": f"[SYNC] Alquiler #{rental['id'][:8]} - {rental.get('customer_name', 'Cliente')}",
                "reference_id": rental["id"],
                "customer_name": rental.get("customer_name", ""),
                "notes": f"Movimiento sincronizado automáticamente. Alquiler del {rental.get('start_date', date)}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username
            }
            await db.cash_movements.insert_one(cash_doc)
            created_movements.append({
                "type": "rental",
                "operation_number": operation_number,
                "rental_id": rental["id"][:8],
                "amount": rental["paid_amount"],
                "payment_method": rental.get("payment_method", "cash")
            })
    
    # 2. AUDIT WORKSHOP REPAIRS - Find paid repairs without movement
    repairs_query = {
        "status": "delivered",
        "price": {"$gt": 0},
        "delivery_date": {"$gte": session_opened_at}
    }
    repairs = await db.external_repairs.find(repairs_query, {"_id": 0}).to_list(10000)
    
    for repair in repairs:
        if repair["id"] not in existing_refs:
            cash_movement_id = str(uuid.uuid4())
            operation_number = await get_next_operation_number()
            cash_doc = {
                "id": cash_movement_id,
                "operation_number": operation_number,
                "session_id": session_id,
                "movement_type": "income",
                "amount": repair.get("price", 0),
                "payment_method": repair.get("payment_method", "cash"),
                "category": "workshop",
                "concept": f"[SYNC] Taller: {repair.get('customer_name', 'Cliente')}",
                "reference_id": repair["id"],
                "customer_name": repair.get("customer_name", ""),
                "notes": f"Movimiento sincronizado automáticamente. Reparación: {repair.get('description', '')[:50]}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.username
            }
            await db.cash_movements.insert_one(cash_doc)
            created_movements.append({
                "type": "workshop",
                "operation_number": operation_number,
                "repair_id": repair["id"][:8],
                "amount": repair.get("price", 0),
                "payment_method": repair.get("payment_method", "cash")
            })
    
    # Get updated summary
    summary = await get_cash_summary(date, current_user)
    
    return {
        "message": "Auditoría completada",
        "movements_created": len(created_movements),
        "details": created_movements,
        "updated_summary": {
            "total_income": summary["total_income"],
            "total_expense": summary["total_expense"],
            "total_refunds": summary["total_refunds"],
            "balance": summary["balance"],
            "movements_count": summary["movements_count"]
        }
    }

@api_router.get("/cash/summary/realtime")
async def get_cash_summary_realtime(date: Optional[str] = None, current_user: CurrentUser = Depends(get_current_user)):
    """
    RESUMEN DE CAJA EN TIEMPO REAL - LÓGICA CORREGIDA
    
    Variables maestras:
    A. FONDO_INICIAL: Dinero con el que se abrió la caja
    B. FLUJO_OPERATIVO_HOY: Entradas - Salidas - Devoluciones (Neto Real)
    C. CAJA_ESPERADA: Fondo + Flujo Operativo (solo efectivo para arqueo físico)
    
    Fórmulas:
    - INGRESOS_BRUTOS = SUM(income) donde income > 0
    - TOTAL_SALIDAS = SUM(expense) + SUM(refund)  
    - BALANCE_NETO_DIA = Ingresos Brutos - Total Salidas (SIN fondo inicial)
    - EFECTIVO_ESPERADO = Fondo + (Ingresos Efectivo - Salidas Efectivo)
    - TARJETA_ESPERADA = Ingresos Tarjeta - Salidas Tarjeta
    """
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find active session
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": date, "status": "open"}})
    
    empty_response = {
        "date": date,
        "session_id": None,
        "session_active": False,
        "opening_balance": 0,
        # KPIs principales (sin fondo)
        "ingresos_brutos": 0,
        "total_salidas": 0,
        "balance_neto_dia": 0,
        # Arqueo por método de pago
        "efectivo_esperado": 0,
        "tarjeta_esperada": 0,
        # Desglose detallado
        "by_payment_method": {
            "cash": {"income": 0, "expense": 0, "refund": 0, "neto": 0},
            "card": {"income": 0, "expense": 0, "refund": 0, "neto": 0}
        },
        "movements_count": 0,
        # Legacy fields for compatibility
        "total_income": 0,
        "total_expense": 0,
        "total_refunds": 0,
        "balance": 0
    }
    
    if not active_session:
        return empty_response
    
    session_id = active_session["id"]
    opening_balance = active_session.get("opening_balance", 0)
    
    # Agregación por tipo de movimiento y método de pago
    pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {
            "_id": {
                "movement_type": "$movement_type",
                "payment_method": "$payment_method"
            },
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.cash_movements.aggregate(pipeline).to_list(5000)
    
    # Inicializar acumuladores
    by_method = {
        "cash": {"income": 0, "expense": 0, "refund": 0},
        "card": {"income": 0, "expense": 0, "refund": 0}
    }
    movements_count = 0
    
    # Procesar resultados
    for r in results:
        movement_type = r["_id"]["movement_type"]
        payment_method = r["_id"]["payment_method"] or "cash"
        amount = r["total"]
        count = r["count"]
        movements_count += count
        
        # Asegurar que el método existe
        if payment_method not in by_method:
            by_method[payment_method] = {"income": 0, "expense": 0, "refund": 0}
        
        # Acumular por tipo
        if movement_type == "income":
            by_method[payment_method]["income"] += amount
        elif movement_type == "expense":
            by_method[payment_method]["expense"] += amount
        elif movement_type == "refund":
            by_method[payment_method]["refund"] += amount
    
    # ========== CÁLCULOS MAESTROS ==========
    
    # 1. INGRESOS BRUTOS = Todas las entradas positivas
    ingresos_brutos = sum(m["income"] for m in by_method.values())
    
    # 2. TOTAL SALIDAS = Gastos + Devoluciones (todo lo que sale)
    total_gastos = sum(m["expense"] for m in by_method.values())
    total_devoluciones = sum(m["refund"] for m in by_method.values())
    total_salidas = total_gastos + total_devoluciones
    
    # 3. BALANCE NETO DEL DÍA = Ingresos - Salidas (SIN incluir fondo inicial)
    balance_neto_dia = ingresos_brutos - total_salidas
    
    # 4. EFECTIVO ESPERADO EN CAJÓN = Fondo + (Entradas Efectivo - Salidas Efectivo)
    cash_data = by_method.get("cash", {"income": 0, "expense": 0, "refund": 0})
    efectivo_neto = cash_data["income"] - cash_data["expense"] - cash_data["refund"]
    efectivo_esperado = opening_balance + efectivo_neto
    
    # 5. TARJETA ESPERADA = Entradas Tarjeta - Salidas Tarjeta
    card_data = by_method.get("card", {"income": 0, "expense": 0, "refund": 0})
    tarjeta_esperada = card_data["income"] - card_data["expense"] - card_data["refund"]
    
    # Añadir neto a cada método para UI
    for method in by_method:
        m = by_method[method]
        m["neto"] = m["income"] - m["expense"] - m["refund"]
    
    return {
        "date": date,
        "session_id": session_id,
        "session_active": True,
        "session_number": active_session.get("session_number", 1),
        "opening_balance": opening_balance,
        
        # ===== KPIs PRINCIPALES (Panel Superior) =====
        "ingresos_brutos": round(ingresos_brutos, 2),
        "total_salidas": round(total_salidas, 2),
        "balance_neto_dia": round(balance_neto_dia, 2),
        
        # ===== ARQUEO (Panel Secundario) =====
        "efectivo_esperado": round(efectivo_esperado, 2),
        "tarjeta_esperada": round(tarjeta_esperada, 2),
        
        # ===== DESGLOSE DETALLADO =====
        "by_payment_method": by_method,
        "movements_count": movements_count,
        
        # ===== LEGACY (compatibilidad) =====
        "total_income": round(ingresos_brutos, 2),
        "total_expense": round(total_gastos, 2),
        "total_refunds": round(total_devoluciones, 2),
        "balance": round(opening_balance + balance_neto_dia, 2)
    }

async def get_next_closure_number(date: str) -> int:
    """Get the next closure number for a given date (supports multiple closures per day) - atomic operation"""
    # Use aggregation to get max closure_number atomically
    pipeline = [
        {"$match": {"date": date}},
        {"$group": {"_id": None, "max_number": {"$max": "$closure_number"}}}
    ]
    result = await db.cash_closings.aggregate(pipeline).to_list(1)
    
    if result and result[0].get("max_number"):
        return result[0]["max_number"] + 1
    return 1

@api_router.post("/cash/close")
async def close_cash_register(closing: CashClosingCreate, current_user: CurrentUser = Depends(get_current_user)):
    """Close the active cash session and create closing record with corrected financial logic"""
    
    # Find active session
    active_session = await db.cash_sessions.find_one({**current_user.get_store_filter(), **{"date": closing.date, "status": "open"}})
    
    if not active_session:
        raise HTTPException(status_code=400, detail="No active cash session found for this date")
    
    # Get realtime summary (corrected logic)
    summary = await get_cash_summary_realtime(closing.date, current_user)
    
    if not summary.get("session_active"):
        raise HTTPException(status_code=400, detail="No active session to close")
    
    # Extract values from corrected summary
    opening_balance = summary.get("opening_balance", 0)
    ingresos_brutos = summary.get("ingresos_brutos", 0)
    total_salidas = summary.get("total_salidas", 0)
    balance_neto_dia = summary.get("balance_neto_dia", 0)
    efectivo_esperado = summary.get("efectivo_esperado", 0)
    tarjeta_esperada = summary.get("tarjeta_esperada", 0)
    
    # Create closing record with corrected fields
    closing_id = str(uuid.uuid4())
    closing_doc = {
        "id": closing_id,
        "date": closing.date,
        "session_id": active_session["id"],
        "opening_balance": opening_balance,
        
        # KPIs principales
        "ingresos_brutos": ingresos_brutos,
        "total_salidas": total_salidas,
        "balance_neto_dia": balance_neto_dia,
        
        # Arqueo esperado vs real
        "expected_cash": efectivo_esperado,
        "expected_card": tarjeta_esperada,
        "physical_cash": closing.physical_cash,
        "card_total": closing.card_total,
        
        # Descuadres
        "discrepancy_cash": closing.discrepancy_cash,
        "discrepancy_card": closing.discrepancy_card,
        "discrepancy_total": closing.discrepancy_total,
        
        # Metadata
        "notes": closing.notes or "",
        "closed_by": current_user.username,
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "movements_count": summary.get("movements_count", 0),
        "by_payment_method": summary.get("by_payment_method", {}),
        "closure_number": active_session.get("session_number", 1),
        
        # Legacy fields for compatibility
        "total_income": ingresos_brutos,
        "total_expense": summary.get("total_expense", 0),
        "total_refunds": summary.get("total_refunds", 0),
        "expected_balance": opening_balance + balance_neto_dia,
        "difference": closing.physical_cash - efectivo_esperado
    }
    await db.cash_closings.insert_one(closing_doc)
    
    # Mark session as closed
    await db.cash_sessions.update_one(
        {"id": active_session["id"]},
        {
            "$set": {
                "status": "closed",
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "closure_id": closing_id
            }
        }
    )
    
    return CashClosingResponse(**closing_doc)

@api_router.get("/cash/closings")
async def get_cash_closings(current_user: CurrentUser = Depends(get_current_user)):
    closings = await db.cash_closings.find({**current_user.get_store_filter(), }, {"_id": 0}).sort("date", -1).to_list(5000)
    return [CashClosingResponse(**c) for c in closings]

@api_router.get("/cash/movements/search")
async def search_cash_movements(
    date_from: str = Query(..., description="Fecha inicio YYYY-MM-DD"),
    date_to: str = Query(..., description="Fecha fin YYYY-MM-DD"),
    search: Optional[str] = Query(None, description="Buscar por cliente, ticket ID o concepto"),
    payment_method: Optional[str] = Query(None, description="Filtrar por método de pago"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Advanced search for cash movements with pagination.
    Searches across all historical data without session restrictions.
    """
    query = {
        "created_at": {
            "$gte": date_from + "T00:00:00",
            "$lte": date_to + "T23:59:59"
        }
    }
    
    # Payment method filter
    if payment_method and payment_method != "all":
        query["payment_method"] = payment_method
    
    # Text search - search in multiple fields
    if search and search.strip():
        search_term = search.strip()
        query["$or"] = [
            {"concept": {"$regex": search_term, "$options": "i"}},
            {"description": {"$regex": search_term, "$options": "i"}},
            {"customer_name": {"$regex": search_term, "$options": "i"}},
            {"operation_number": {"$regex": search_term, "$options": "i"}},
            {"reference_id": {"$regex": search_term, "$options": "i"}},
            {"notes": {"$regex": search_term, "$options": "i"}}
        ]
    
    # Get total count
    total = await db.cash_movements.count_documents(query)
    
    # Get paginated results
    movements = await db.cash_movements.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with rental/customer data if available
    for mov in movements:
        if mov.get("reference_id") and mov.get("reference_type") == "rental":
            rental = await db.rentals.find_one({**current_user.get_store_filter(), **{"id": mov["reference_id"]}}, {"_id": 0, "customer_name": 1, "customer_dni": 1, "items": 1})
            if rental:
                mov["customer_name"] = rental.get("customer_name", mov.get("customer_name"))
                mov["customer_dni"] = rental.get("customer_dni", "")
                if not mov.get("items"):
                    mov["items"] = rental.get("items", [])
    
    return {
        "results": movements,
        "total": total,
        "page": (skip // limit) + 1,
        "pages": (total + limit - 1) // limit,
        "has_more": skip + limit < total
    }

@api_router.get("/cash/movements/history")
async def get_cash_movements_history(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    movement_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get all cash movements with optional filters for historic view"""
    query = {**current_user.get_store_filter()}
    
    # Date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from + "T00:00:00"
        if date_to:
            date_query["$lte"] = date_to + "T23:59:59"
        if date_query:
            query["created_at"] = date_query
    
    # Movement type filter
    if movement_type and movement_type != "all":
        query["movement_type"] = movement_type
    
    # Search filter
    if search:
        query["$or"] = [
            {"concept": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    movements = await db.cash_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return movements

@api_router.post("/cash/validate-orphans")
async def validate_and_fix_orphan_movements(current_user: CurrentUser = Depends(get_current_user)):
    """
    Validate and fix orphan movements (movements without session_id).
    Links them to the appropriate session or reports them.
    """
    # Find orphan movements from last 24 hours
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    orphans = await db.cash_movements.find({
        "session_id": {"$exists": False},
        "created_at": {"$gte": yesterday}
    }, {"_id": 0}).to_list(1000)
    
    fixed_count = 0
    errors = []
    
    for movement in orphans:
        try:
            # Get the date of the movement
            movement_date = movement["created_at"][:10]  # YYYY-MM-DD
            
            # Find active session for that date
            session = await db.cash_sessions.find_one({
                "date": movement_date,
                "status": "open"
            })
            
            if session:
                # Link movement to session
                await db.cash_movements.update_one(
                    {"id": movement["id"]},
                    {"$set": {"session_id": session["id"]}}
                )
                fixed_count += 1
            else:
                # No session found - movement is truly orphan
                errors.append({
                    "movement_id": movement["id"],
                    "date": movement_date,
                    "amount": movement["amount"],
                    "concept": movement["concept"],
                    "reason": "No active session found for this date"
                })
        except Exception as e:
            errors.append({
                "movement_id": movement["id"],
                "reason": str(e)
            })
    
    return {
        "total_orphans_found": len(orphans),
        "fixed_count": fixed_count,
        "orphans_remaining": len(errors),
        "errors": errors
    }

@api_router.delete("/cash/closings/{closing_id}")
async def revert_cash_closing(closing_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Revert/delete a specific cash closing to allow a new closure"""
    existing = await db.cash_closings.find_one({**current_user.get_store_filter(), **{"id": closing_id}})
    if not existing:
        raise HTTPException(status_code=404, detail="Cash closing not found")
    
    await db.cash_closings.delete_one({**current_user.get_store_filter(), "id": closing_id})
    return {"message": "Cash closing has been reverted", "id": closing_id}

# ==================== INTEGRATIONS CONFIG ROUTES ====================

class IntegrationConfig(BaseModel):
    integration_type: str  # whatsapp, tpv, email, calendar
    enabled: bool = False
    config: dict = {}

@api_router.post("/integrations/config")
async def save_integration_config(config: IntegrationConfig, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.integrations.find_one({"integration_type": config.integration_type})
    
    doc = {
        "integration_type": config.integration_type,
        "enabled": config.enabled,
        "config": config.config,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.username
    }
    
    if existing:
        await db.integrations.update_one(
            {"integration_type": config.integration_type},
            {"$set": doc}
        )
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.integrations.insert_one(doc)
    
    return {"message": "Configuration saved", "integration_type": config.integration_type}

@api_router.get("/integrations/config")
async def get_integrations_config(current_user: CurrentUser = Depends(get_current_user)):
    configs = await db.integrations.find({}, {"_id": 0}).to_list(20)
    return configs

@api_router.get("/integrations/config/{integration_type}")
async def get_integration_config(integration_type: str, current_user: CurrentUser = Depends(get_current_user)):
    config = await db.integrations.find_one({"integration_type": integration_type}, {"_id": 0})
    if not config:
        return {"integration_type": integration_type, "enabled": False, "config": {}}
    return config


@api_router.post("/admin/fix-return-dates")
async def fix_return_dates(current_user: CurrentUser = Depends(get_current_user)):
    """
    MIGRATION UTILITY: Fix rentals that are 'returned' but missing actual_return_date.
    This sets actual_return_date to end_date for historical rentals.
    """
    # Find all returned rentals without actual_return_date
    rentals_to_fix = await db.rentals.find({
        "status": "returned",
        "$or": [
            {"actual_return_date": {"$exists": False}},
            {"actual_return_date": None}
        ]
    }, {"_id": 0, "id": 1, "end_date": 1, "created_at": 1}).to_list(1000)
    
    fixed_count = 0
    for rental in rentals_to_fix:
        # Use end_date as fallback, or created_at if end_date is missing
        return_date = rental.get("end_date") or rental.get("created_at") or datetime.now(timezone.utc).isoformat()
        
        await db.rentals.update_one(
            {"id": rental["id"]},
            {"$set": {"actual_return_date": return_date}}
        )
        fixed_count += 1
    
    return {
        "message": f"Fixed {fixed_count} rentals with missing actual_return_date",
        "fixed_count": fixed_count
    }


# ==================== BUSINESS SETTINGS/CONFIGURATION ====================

class BusinessSettings(BaseModel):
    company_logo: Optional[str] = None  # Base64 encoded image
    ticket_header: Optional[str] = ""
    ticket_footer: Optional[str] = ""
    ticket_terms: Optional[str] = ""
    show_dni_on_ticket: bool = True
    show_vat_on_ticket: bool = False
    default_vat: float = 21.0
    vat_included_in_prices: bool = True
    language: str = "es"

# ==================== HELP CENTER MODELS ====================

class VideoTutorial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: str
    order: int = 0
    active: bool = True
    store_id: Optional[int] = None
    created_at: str

class VideoTutorialCreate(BaseModel):
    title: str
    description: str
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: str
    order: int = 0
    active: bool = True

class FAQ(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    question: str
    answer: str
    order: int = 0
    active: bool = True
    store_id: Optional[int] = None
    created_at: str

class FAQCreate(BaseModel):
    question: str
    answer: str
    order: int = 0
    active: bool = True
    dark_mode: bool = False
    auto_print: bool = False

@api_router.get("/settings")
async def get_settings(current_user: CurrentUser = Depends(get_current_user)):
    """Get business settings from database"""
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    
    if not settings:
        # Return defaults
        return {
            "company_logo": None,
            "ticket_header": "",
            "ticket_footer": "",
            "ticket_terms": "",
            "show_dni_on_ticket": True,
            "show_vat_on_ticket": False,
            "default_vat": 21.0,
            "vat_included_in_prices": True,
            "language": "es",
            "dark_mode": False,
            "auto_print": False
        }
    
    return settings

@api_router.post("/settings")
async def save_settings(settings: BusinessSettings, current_user: CurrentUser = Depends(get_current_user)):
    """Save business settings to database"""
    settings_dict = settings.dict()
    settings_dict["type"] = "business"
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_dict["updated_by"] = current_user.get("username", "system")
    
    # Log logo size for debugging
    if settings.company_logo:
        logo_size_kb = len(settings.company_logo) * 0.75 / 1024
        print(f"[Settings] Saving logo: {logo_size_kb:.1f}KB")
    
    # Upsert the settings document
    await db.settings.update_one(
        {"type": "business"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Configuración guardada"}


# ==================== PLAN & TRIAL MANAGEMENT ROUTES ====================

class PlanStatusResponse(BaseModel):
    plan_type: str
    plan_name: str
    is_trial: bool
    trial_days_remaining: int
    trial_hours_remaining: int = 0  # NEW: Horas restantes si menos de 24h
    trial_expired: bool
    current_items: int
    current_customers: int
    current_users: int
    max_items: int
    max_customers: int
    max_users: int
    price: int
    trial_end_date: str = ""  # NEW: Fecha exacta de fin de trial

class PlanSelectionRequest(BaseModel):
    plan_type: str  # 'basic', 'pro', 'enterprise'

@api_router.get("/plan/status", response_model=PlanStatusResponse)
async def get_plan_status(current_user: CurrentUser = Depends(get_current_user)):
    """
    Get current plan status including trial information.
    Returns remaining trial days and current usage.
    """
    # SUPER_ADMIN BYPASS: Always return active status
    if current_user.role == "super_admin":
        return PlanStatusResponse(
            plan_type="enterprise",
            plan_name="Admin Master (Bypass)",
            is_trial=False,
            trial_days_remaining=0,
            trial_expired=False,
            current_items=0,
            current_customers=0,
            current_users=0,
            max_items=999999,
            max_customers=999999,
            max_users=999,
            price=0
        )
    
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get current plan or default to trial
    plan_type = store.get("plan_type", "trial")
    trial_start = store.get("trial_start_date")
    
    # Calculate trial status
    is_trial = plan_type == "trial"
    trial_days_remaining = 0
    trial_hours_remaining = 0
    trial_expired = False
    trial_end_date = ""
    
    if is_trial:
        if trial_start:
            # Parse trial start date
            if isinstance(trial_start, str):
                trial_start_dt = datetime.fromisoformat(trial_start.replace('Z', '+00:00'))
            else:
                trial_start_dt = trial_start
            
            # Calculate exact time remaining
            trial_end_dt = trial_start_dt + timedelta(days=15)
            trial_end_date = trial_end_dt.isoformat()
            time_remaining = trial_end_dt - datetime.now(timezone.utc)
            
            if time_remaining.total_seconds() > 0:
                trial_days_remaining = time_remaining.days
                # If less than 24 hours, show hours
                if trial_days_remaining == 0:
                    trial_hours_remaining = int(time_remaining.total_seconds() // 3600)
            else:
                trial_expired = True
        else:
            # No trial start date, set it now
            await db.stores.update_one(
                {"store_id": current_user.store_id},
                {"$set": {"trial_start_date": datetime.now(timezone.utc).isoformat()}}
            )
            trial_days_remaining = 15
            trial_end_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    
    # Get plan limits
    plan_info = PLAN_LIMITS.get(plan_type, PLAN_LIMITS["trial"])
    
    # Count current usage
    store_filter = current_user.get_store_filter()
    current_items = await db.items.count_documents(store_filter)
    current_customers = await db.customers.count_documents(store_filter)
    current_users = await db.users.count_documents(store_filter)
    
    return PlanStatusResponse(
        plan_type=plan_type,
        plan_name=plan_info["name"],
        is_trial=is_trial,
        trial_days_remaining=trial_days_remaining,
        trial_hours_remaining=trial_hours_remaining,
        trial_expired=trial_expired,
        trial_end_date=trial_end_date,
        current_items=current_items,
        current_customers=current_customers,
        current_users=current_users,
        max_items=plan_info["max_items"],
        max_customers=plan_info["max_customers"],
        max_users=plan_info["max_users"],
        price=plan_info.get("price", 0)
    )

@api_router.get("/plan/available")
async def get_available_plans():
    """Get all available plans with their limits and prices - Dynamically from PLAN_LIMITS."""
    
    # Build plans list dynamically from PLAN_LIMITS
    plans = []
    
    # Basic Plan
    basic = PLAN_LIMITS["basic"]
    plans.append({
        "id": "basic",
        "name": basic["name"],
        "max_items": basic["max_items"],
        "max_customers": basic["max_customers"],
        "max_users": basic["max_users"],
        "price": basic["price"],
        "price_display": f"{basic['price']}€/año",
        "features": [
            f"{basic['max_items']:,} artículos",
            f"{basic['max_customers']:,} clientes",
            f"{basic['max_users']} usuarios",
            "Soporte por email"
        ]
    })
    
    # PRO Plan
    pro = PLAN_LIMITS["pro"]
    plans.append({
        "id": "pro",
        "name": pro["name"],
        "max_items": pro["max_items"],
        "max_customers": pro["max_customers"],
        "max_users": pro["max_users"],
        "price": pro["price"],
        "price_display": f"{pro['price']}€/año",
        "recommended": True,
        "features": [
            f"{pro['max_items']:,} artículos",
            f"{pro['max_customers']:,} clientes",
            f"{pro['max_users']} usuarios",
            "Soporte prioritario",
            "Informes avanzados"
        ]
    })
    
    # Enterprise Plan
    enterprise = PLAN_LIMITS["enterprise"]
    plans.append({
        "id": "enterprise",
        "name": enterprise["name"],
        "max_items": -1,  # Unlimited
        "max_customers": -1,  # Unlimited
        "max_users": enterprise["max_users"],
        "price": enterprise["price"],
        "price_display": f"{enterprise['price']}€/año",
        "features": [
            "Artículos ilimitados",
            "Clientes ilimitados",
            f"{enterprise['max_users']} usuarios",
            "Soporte 24/7",
            "API personalizada",
            "Integraciones premium"
        ]
    })
    
    return {"plans": plans}

@api_router.post("/plan/select")
async def select_plan(
    request: PlanSelectionRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Select a plan for the store. 
    Validates that current data doesn't exceed plan limits.
    Only ADMIN can change plan.
    """
    plan_type = request.plan_type
    
    if plan_type not in ["basic", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plan inválido. Opciones: basic, pro, enterprise")
    
    plan_info = PLAN_LIMITS[plan_type]
    store_filter = current_user.get_store_filter()
    
    # Count current usage
    current_items = await db.items.count_documents(store_filter)
    current_customers = await db.customers.count_documents(store_filter)
    
    # Validate limits
    errors = []
    if plan_info["max_items"] != 999999 and current_items > plan_info["max_items"]:
        errors.append(f"Tu inventario actual ({current_items} artículos) supera el límite del {plan_info['name']} ({plan_info['max_items']})")
    
    if plan_info["max_customers"] != 999999 and current_customers > plan_info["max_customers"]:
        errors.append(f"Tu base de clientes ({current_customers}) supera el límite del {plan_info['name']} ({plan_info['max_customers']})")
    
    if errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Tu uso actual supera los límites del plan seleccionado",
                "errors": errors,
                "suggestion": "Elimina artículos/clientes o elige un plan superior"
            }
        )
    
    # Update store plan (for direct activation without payment)
    await db.stores.update_one(
        {"store_id": current_user.store_id},
        {
            "$set": {
                "plan_type": plan_type,
                "plan_activated_at": datetime.now(timezone.utc).isoformat(),
                "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "settings.max_items": plan_info["max_items"],
                "settings.max_customers": plan_info["max_customers"],
                "settings.max_users": plan_info["max_users"]
            },
            "$unset": {
                "trial_start_date": ""  # Remove trial info
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Plan {plan_info['name']} activado correctamente",
        "plan": plan_type,
        "plan_name": plan_info["name"]
    }


# ==================== STRIPE PAYMENT INTEGRATION ====================

class CreateCheckoutRequest(BaseModel):
    plan_type: str  # 'basic', 'pro', 'enterprise'
    origin_url: str  # Frontend origin for redirect URLs

@api_router.post("/plan/checkout")
async def create_stripe_checkout(
    request: CreateCheckoutRequest,
    http_request: Request,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Create a Stripe Checkout session for plan payment.
    Returns checkout URL to redirect user to Stripe.
    """
    plan_type = request.plan_type
    
    if plan_type not in ["basic", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    plan_info = PLAN_LIMITS[plan_type]
    store_filter = current_user.get_store_filter()
    
    # Validate limits BEFORE creating checkout
    current_items = await db.items.count_documents(store_filter)
    current_customers = await db.customers.count_documents(store_filter)
    
    errors = []
    if plan_info["max_items"] != 999999 and current_items > plan_info["max_items"]:
        errors.append(f"Tu inventario actual ({current_items}) supera el límite del plan ({plan_info['max_items']})")
    if plan_info["max_customers"] != 999999 and current_customers > plan_info["max_customers"]:
        errors.append(f"Tus clientes ({current_customers}) superan el límite del plan ({plan_info['max_customers']})")
    
    if errors:
        raise HTTPException(status_code=400, detail={"message": "Datos superan límites del plan", "errors": errors})
    
    # Get Stripe API key
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    # Build URLs from frontend origin
    origin_url = request.origin_url.rstrip("/")
    success_url = f"{origin_url}/pago-exitoso?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/seleccionar-plan"
    
    # Webhook URL
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    # Initialize Stripe
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Get amount from server-side definition (SECURITY: Never accept amount from frontend)
    amount = float(plan_info["price"])  # EUR
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "store_id": str(current_user.store_id),
            "plan_type": plan_type,
            "user_id": current_user.user_id,
            "username": current_user.username
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record BEFORE redirect
    payment_transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "store_id": current_user.store_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "plan_type": plan_type,
        "plan_name": plan_info["name"],
        "amount": amount,
        "currency": "EUR",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(payment_transaction)
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id
    }


@api_router.get("/plan/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Check status of a Stripe checkout session and update payment accordingly.
    """
    # Find the payment transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    # Verify ownership (unless super_admin)
    if current_user.role != "super_admin" and transaction.get("store_id") != current_user.store_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # If already processed, return current status
    if transaction.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan_type": transaction.get("plan_type"),
            "message": "Pago ya procesado"
        }
    
    # Get Stripe API key
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    # Check status with Stripe
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Error checking Stripe status: {e}")
        return {
            "status": "pending",
            "payment_status": "pending",
            "message": "Verificando pago..."
        }
    
    # Update based on Stripe status
    if checkout_status.payment_status == "paid":
        # Process successful payment
        plan_type = transaction.get("plan_type")
        store_id = transaction.get("store_id")
        plan_info = PLAN_LIMITS.get(plan_type, {})
        
        # Update store with new plan
        await db.stores.update_one(
            {"store_id": store_id},
            {
                "$set": {
                    "plan_type": plan_type,
                    "plan_activated_at": datetime.now(timezone.utc).isoformat(),
                    "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                    "status": "active",
                    "settings.max_items": plan_info.get("max_items", 3000),
                    "settings.max_customers": plan_info.get("max_customers", 10000),
                    "settings.max_users": plan_info.get("max_users", 10)
                },
                "$unset": {"trial_start_date": ""}
            }
        )
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "stripe_payment_status": checkout_status.payment_status
                }
            }
        )
        
        # Create billing payment record
        invoice_number = f"ALF-{datetime.now().year}-{store_id:04d}-{str(uuid.uuid4())[:4].upper()}"
        
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "store_id": store_id,
            "date": datetime.now(timezone.utc).isoformat(),
            "plan": plan_type,
            "plan_name": plan_info.get("name", plan_type),
            "amount": transaction.get("amount", 0),
            "status": "paid",
            "invoice_number": invoice_number,
            "stripe_session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan_type": plan_type,
            "plan_name": plan_info.get("name"),
            "message": f"¡Pago exitoso! Plan {plan_info.get('name')} activado."
        }
    
    elif checkout_status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired"}}
        )
        return {
            "status": "expired",
            "payment_status": "expired",
            "message": "La sesión de pago ha expirado"
        }
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "message": "Procesando pago..."
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events (checkout.session.completed).
    """
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    # Get webhook body and signature
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            # Find transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                store_id = int(metadata.get("store_id", transaction.get("store_id")))
                plan_type = metadata.get("plan_type", transaction.get("plan_type"))
                plan_info = PLAN_LIMITS.get(plan_type, {})
                
                # Update store
                await db.stores.update_one(
                    {"store_id": store_id},
                    {
                        "$set": {
                            "plan_type": plan_type,
                            "plan_activated_at": datetime.now(timezone.utc).isoformat(),
                            "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                            "status": "active",
                            "settings.max_items": plan_info.get("max_items", 3000),
                            "settings.max_customers": plan_info.get("max_customers", 10000),
                            "settings.max_users": plan_info.get("max_users", 10)
                        },
                        "$unset": {"trial_start_date": ""}
                    }
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "paid_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Create billing record
                invoice_number = f"ALF-{datetime.now().year}-{store_id:04d}-{str(uuid.uuid4())[:4].upper()}"
                await db.payments.insert_one({
                    "id": str(uuid.uuid4()),
                    "store_id": store_id,
                    "date": datetime.now(timezone.utc).isoformat(),
                    "plan": plan_type,
                    "plan_name": plan_info.get("name", plan_type),
                    "amount": transaction.get("amount", 0),
                    "status": "paid",
                    "invoice_number": invoice_number,
                    "stripe_session_id": session_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                logger.info(f"Webhook: Payment processed for store {store_id}, plan {plan_type}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@api_router.post("/plan/simulate-payment")
async def simulate_payment(
    request: PlanSelectionRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Simulate payment success and activate plan.
    For testing purposes - bypasses Stripe.
    """
    # First validate and select the plan
    return await select_plan(request, current_user)


# ==================== PLAN UPGRADE/DOWNGRADE WITH PRORATION ====================

class PlanChangeRequest(BaseModel):
    new_plan_type: str  # 'basic', 'pro', 'enterprise'
    origin_url: str = ""

class PlanChangeCalculation(BaseModel):
    current_plan: str
    new_plan: str
    current_price: float
    new_price: float
    days_used: int
    days_remaining: int
    credit_amount: float  # Amount to credit from current plan
    prorate_amount: float  # Amount to charge for new plan (prorated)
    amount_to_pay: float  # Final amount (new_prorated - credit)
    is_upgrade: bool
    can_change: bool
    blockers: list = []

@api_router.get("/plan/change/calculate/{new_plan_type}")
async def calculate_plan_change(
    new_plan_type: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Calculate the prorated amount for a plan change.
    Returns: credit from current plan, cost of new plan, and amount to pay.
    """
    if new_plan_type not in ["basic", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    current_plan = store.get("plan_type", "trial")
    
    # If on trial, no proration needed
    if current_plan == "trial":
        new_plan_info = PLAN_LIMITS[new_plan_type]
        return {
            "current_plan": "trial",
            "new_plan": new_plan_type,
            "current_price": 0,
            "new_price": new_plan_info["price"],
            "days_used": 0,
            "days_remaining": 365,
            "credit_amount": 0,
            "prorate_amount": new_plan_info["price"],
            "amount_to_pay": new_plan_info["price"],
            "is_upgrade": True,
            "can_change": True,
            "blockers": []
        }
    
    # Get current plan info
    current_plan_info = PLAN_LIMITS.get(current_plan, PLAN_LIMITS["basic"])
    new_plan_info = PLAN_LIMITS[new_plan_type]
    
    # Calculate days used/remaining
    plan_activated_at = store.get("plan_activated_at")
    if plan_activated_at:
        if isinstance(plan_activated_at, str):
            activated_dt = datetime.fromisoformat(plan_activated_at.replace('Z', '+00:00'))
        else:
            activated_dt = plan_activated_at
        days_used = (datetime.now(timezone.utc) - activated_dt).days
        days_remaining = max(0, 365 - days_used)
    else:
        days_used = 0
        days_remaining = 365
    
    # Calculate proration
    current_daily_rate = current_plan_info["price"] / 365
    new_daily_rate = new_plan_info["price"] / 365
    
    # Credit = unused portion of current plan
    credit_amount = round(current_daily_rate * days_remaining, 2)
    
    # New plan cost = prorated for remaining days
    prorate_amount = round(new_daily_rate * days_remaining, 2)
    
    # Amount to pay = new cost - credit
    amount_to_pay = round(max(0, prorate_amount - credit_amount), 2)
    
    is_upgrade = new_plan_info["price"] > current_plan_info["price"]
    
    # Check for blockers (downgrade validation)
    blockers = []
    store_filter = current_user.get_store_filter()
    current_items = await db.items.count_documents(store_filter)
    current_customers = await db.customers.count_documents(store_filter)
    current_users = await db.users.count_documents(store_filter)
    
    if new_plan_info["max_items"] != 999999 and current_items > new_plan_info["max_items"]:
        excess = current_items - new_plan_info["max_items"]
        blockers.append({
            "type": "items",
            "current": current_items,
            "limit": new_plan_info["max_items"],
            "excess": excess,
            "message": f"Debes eliminar {excess} artículo(s) para cambiar al plan {new_plan_info['name']}"
        })
    
    if new_plan_info["max_customers"] != 999999 and current_customers > new_plan_info["max_customers"]:
        excess = current_customers - new_plan_info["max_customers"]
        blockers.append({
            "type": "customers",
            "current": current_customers,
            "limit": new_plan_info["max_customers"],
            "excess": excess,
            "message": f"Debes eliminar {excess} cliente(s) para cambiar al plan {new_plan_info['name']}"
        })
    
    if current_users > new_plan_info["max_users"]:
        excess = current_users - new_plan_info["max_users"]
        blockers.append({
            "type": "users",
            "current": current_users,
            "limit": new_plan_info["max_users"],
            "excess": excess,
            "message": f"Debes eliminar {excess} usuario(s) para cambiar al plan {new_plan_info['name']}"
        })
    
    can_change = len(blockers) == 0
    
    return {
        "current_plan": current_plan,
        "current_plan_name": current_plan_info["name"],
        "new_plan": new_plan_type,
        "new_plan_name": new_plan_info["name"],
        "current_price": current_plan_info["price"],
        "new_price": new_plan_info["price"],
        "days_used": days_used,
        "days_remaining": days_remaining,
        "credit_amount": credit_amount,
        "prorate_amount": prorate_amount,
        "amount_to_pay": amount_to_pay,
        "is_upgrade": is_upgrade,
        "can_change": can_change,
        "blockers": blockers
    }


@api_router.post("/plan/upgrade")
async def upgrade_plan(
    request: PlanChangeRequest,
    http_request: Request,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Create a Stripe checkout session for plan upgrade with proration.
    Calculates the difference to pay and charges only that amount.
    """
    new_plan_type = request.new_plan_type
    
    if new_plan_type not in ["basic", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    # Calculate proration
    calculation = await calculate_plan_change(new_plan_type, current_user)
    
    # Check if change is allowed
    if not calculation["can_change"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No puedes cambiar a este plan",
                "blockers": calculation["blockers"]
            }
        )
    
    # If amount to pay is 0 or negative (credit), just activate
    if calculation["amount_to_pay"] <= 0:
        # Direct activation with credit
        plan_info = PLAN_LIMITS[new_plan_type]
        await db.stores.update_one(
            {"store_id": current_user.store_id},
            {
                "$set": {
                    "plan_type": new_plan_type,
                    "plan_activated_at": datetime.now(timezone.utc).isoformat(),
                    "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                    "settings.max_items": plan_info["max_items"],
                    "settings.max_customers": plan_info["max_customers"],
                    "settings.max_users": plan_info["max_users"]
                },
                "$unset": {"trial_start_date": ""}
            }
        )
        
        return {
            "success": True,
            "message": f"Plan cambiado a {plan_info['name']}. Tienes un crédito de €{abs(calculation['amount_to_pay']):.2f}",
            "requires_payment": False,
            "plan": new_plan_type
        }
    
    # Get Stripe API key
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe no configurado")
    
    # Build URLs
    origin_url = request.origin_url.rstrip("/") if request.origin_url else str(http_request.base_url).rstrip("/")
    success_url = f"{origin_url}/pago-exitoso?session_id={{CHECKOUT_SESSION_ID}}&upgrade=true"
    cancel_url = f"{origin_url}/facturacion"
    
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Amount to charge (the difference)
    amount = calculation["amount_to_pay"]
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "store_id": str(current_user.store_id),
            "plan_type": new_plan_type,
            "user_id": current_user.user_id,
            "username": current_user.username,
            "is_upgrade": "true",
            "previous_plan": calculation["current_plan"],
            "credit_amount": str(calculation["credit_amount"]),
            "prorate_amount": str(calculation["prorate_amount"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Record the transaction
    plan_info = PLAN_LIMITS[new_plan_type]
    payment_transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "store_id": current_user.store_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "plan_type": new_plan_type,
        "plan_name": plan_info["name"],
        "previous_plan": calculation["current_plan"],
        "amount": amount,
        "full_price": plan_info["price"],
        "credit_amount": calculation["credit_amount"],
        "prorate_amount": calculation["prorate_amount"],
        "currency": "EUR",
        "payment_status": "pending",
        "is_upgrade": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(payment_transaction)
    
    return {
        "success": True,
        "requires_payment": True,
        "checkout_url": session.url,
        "session_id": session.session_id,
        "amount_to_pay": amount,
        "calculation": calculation
    }


# ==================== BILLING ROUTES (ADMIN ONLY) ====================

# Platform fiscal data (AlpineFlow SaaS)
PLATFORM_FISCAL_DATA = {
    "company_name": "AlpineFlow Software S.L.",
    "cif": "B12345678",
    "address": "Calle Tecnología 123, 28001 Madrid, España",
    "email": "facturacion@alpineflow.es",
    "phone": "+34 900 123 456"
}

class BillingDataUpdate(BaseModel):
    company_name: Optional[str] = None
    cif_nif: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "España"

class PaymentRecord(BaseModel):
    id: str
    date: str
    plan: str
    plan_name: str
    amount: float
    status: str  # 'paid', 'pending'
    invoice_number: str

@api_router.get("/billing/data")
async def get_billing_data(current_user: CurrentUser = Depends(require_admin)):
    """Get store billing/fiscal data - ADMIN ONLY"""
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    billing_data = store.get("billing_data", {})
    return {
        "company_name": billing_data.get("company_name", store.get("name", "")),
        "cif_nif": billing_data.get("cif_nif", ""),
        "address": billing_data.get("address", ""),
        "city": billing_data.get("city", ""),
        "postal_code": billing_data.get("postal_code", ""),
        "country": billing_data.get("country", "España")
    }

@api_router.put("/billing/data")
async def update_billing_data(
    data: BillingDataUpdate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update store billing/fiscal data - ADMIN ONLY"""
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    await db.stores.update_one(
        {"store_id": current_user.store_id},
        {"$set": {f"billing_data.{k}": v for k, v in update_dict.items()}}
    )
    
    return {"success": True, "message": "Datos de facturación actualizados"}

@api_router.get("/billing/payments")
async def get_payment_history(current_user: CurrentUser = Depends(require_admin)):
    """Get payment history for the store - ADMIN ONLY"""
    payments = await db.payments.find(
        {"store_id": current_user.store_id}
    ).sort("date", -1).to_list(100)
    
    return {
        "payments": [
            {
                "id": p.get("id", str(p.get("_id", ""))),
                "date": p.get("date", ""),
                "plan": p.get("plan", ""),
                "plan_name": p.get("plan_name", ""),
                "amount": p.get("amount", 0),
                "status": p.get("status", "pending"),
                "invoice_number": p.get("invoice_number", "")
            }
            for p in payments
        ]
    }

@api_router.post("/billing/payments")
async def create_payment_record(
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Create a payment record when plan is activated.
    In production, this would be called by payment gateway webhook.
    """
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    plan_type = store.get("plan_type", "trial")
    if plan_type == "trial":
        raise HTTPException(status_code=400, detail="No hay plan activo para facturar")
    
    plan_info = PLAN_LIMITS.get(plan_type, {})
    
    # Generate invoice number: ALF-YEAR-STOREID-SEQUENCE
    year = datetime.now().year
    last_payment = await db.payments.find_one(
        {"store_id": current_user.store_id},
        sort=[("created_at", -1)]
    )
    sequence = 1
    if last_payment and last_payment.get("invoice_number", "").startswith(f"ALF-{year}"):
        try:
            sequence = int(last_payment["invoice_number"].split("-")[-1]) + 1
        except:
            pass
    
    invoice_number = f"ALF-{year}-{current_user.store_id:04d}-{sequence:04d}"
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "store_id": current_user.store_id,
        "date": datetime.now(timezone.utc).isoformat(),
        "plan": plan_type,
        "plan_name": plan_info.get("name", plan_type),
        "amount": plan_info.get("price", 0),
        "status": "paid",
        "invoice_number": invoice_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    
    return {
        "success": True,
        "payment_id": payment_doc["id"],
        "invoice_number": invoice_number
    }

@api_router.get("/billing/invoice/{payment_id}/download")
async def download_invoice(
    payment_id: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Generate and download invoice PDF - ADMIN ONLY
    The PDF is generated on-demand and secured per store_id
    """
    from bson import ObjectId
    
    # Find payment record - try both id field and _id (ObjectId)
    payment = await db.payments.find_one({
        "store_id": current_user.store_id,
        "id": payment_id
    })
    
    # If not found by 'id', try by ObjectId
    if not payment:
        try:
            payment = await db.payments.find_one({
                "store_id": current_user.store_id,
                "_id": ObjectId(payment_id)
            })
        except:
            pass
    
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Get store data
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    billing_data = store.get("billing_data", {})
    
    # Create PDF directory if not exists
    pdf_dir = Path("/app/backend/invoices")
    pdf_dir.mkdir(exist_ok=True)
    
    # Generate PDF filename
    invoice_number = payment.get("invoice_number", payment_id)
    pdf_filename = f"{invoice_number}.pdf"
    pdf_path = pdf_dir / pdf_filename
    
    # Generate PDF
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    # Title style
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#1e40af')
    )
    
    # Header
    story.append(Paragraph("FACTURA", title_style))
    story.append(Spacer(1, 20))
    
    # Invoice info
    invoice_info = f"""
    <b>Número de Factura:</b> {invoice_number}<br/>
    <b>Fecha:</b> {payment.get('date', '')[:10]}<br/>
    <b>Estado:</b> {'Pagado' if payment.get('status') == 'paid' else 'Pendiente'}
    """
    story.append(Paragraph(invoice_info, styles['Normal']))
    story.append(Spacer(1, 30))
    
    # Two column layout for fiscal data
    # Emisor (Platform)
    emisor_text = f"""
    <b>EMISOR</b><br/>
    {PLATFORM_FISCAL_DATA['company_name']}<br/>
    CIF: {PLATFORM_FISCAL_DATA['cif']}<br/>
    {PLATFORM_FISCAL_DATA['address']}<br/>
    {PLATFORM_FISCAL_DATA['email']}
    """
    
    # Receptor (Store)
    store_name = billing_data.get('company_name') or store.get('name', 'N/A')
    store_cif = billing_data.get('cif_nif', 'N/A')
    store_address = billing_data.get('address', 'N/A')
    store_city = billing_data.get('city', '')
    store_postal = billing_data.get('postal_code', '')
    store_full_address = f"{store_address}"
    if store_postal or store_city:
        store_full_address += f", {store_postal} {store_city}"
    
    receptor_text = f"""
    <b>CLIENTE</b><br/>
    {store_name}<br/>
    NIF/CIF: {store_cif}<br/>
    {store_full_address}
    """
    
    # Create table for two columns
    fiscal_data = [[
        Paragraph(emisor_text, styles['Normal']),
        Paragraph(receptor_text, styles['Normal'])
    ]]
    fiscal_table = Table(fiscal_data, colWidths=[8*cm, 8*cm])
    fiscal_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(fiscal_table)
    story.append(Spacer(1, 40))
    
    # Invoice details table
    plan_name = payment.get('plan_name', payment.get('plan', 'N/A'))
    amount = payment.get('amount', 0)
    iva = amount * 0.21  # 21% IVA
    total = amount + iva
    
    details_data = [
        ['Concepto', 'Cantidad', 'Precio', 'Total'],
        [f'Suscripción Anual - {plan_name}', '1', f'{amount:.2f} €', f'{amount:.2f} €'],
        ['', '', '', ''],
        ['', '', 'Base Imponible:', f'{amount:.2f} €'],
        ['', '', 'IVA (21%):', f'{iva:.2f} €'],
        ['', '', 'TOTAL:', f'{total:.2f} €'],
    ]
    
    details_table = Table(details_data, colWidths=[8*cm, 2*cm, 3*cm, 3*cm])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, 1), 1, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (2, 3), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, -1), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (3, -1), (3, -1), 12),
        ('LINEABOVE', (2, 3), (-1, 3), 1, colors.HexColor('#e2e8f0')),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 40))
    
    # Footer
    footer_text = """
    <b>Forma de pago:</b> Transferencia bancaria / Tarjeta de crédito<br/><br/>
    <i>Esta factura ha sido generada electrónicamente y es válida sin firma.</i><br/>
    <i>AlpineFlow Software S.L. - Todos los derechos reservados</i>
    """
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748b')
    )
    story.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(story)
    
    # Return file
    return FileResponse(
        path=str(pdf_path),
        filename=pdf_filename,
        media_type="application/pdf"
    )


# ==================== STORE MANAGEMENT ROUTES (SUPER_ADMIN ONLY) ====================

@api_router.get("/stores", response_model=List[StoreResponse])
async def get_all_stores(current_user: CurrentUser = Depends(require_super_admin)):
    """Get all stores - SUPER_ADMIN only"""
    stores = await db.stores.find({}, {"_id": 0}).to_list(1000)
    return stores

@api_router.post("/stores", response_model=StoreResponse)
async def create_store(store: StoreCreate, current_user: CurrentUser = Depends(require_super_admin)):
    """Create new store - SUPER_ADMIN only
    Automatically creates an admin user for the new store
    """
    # Get next store_id
    last_store = await db.stores.find_one(sort=[("store_id", -1)])
    next_id = (last_store.get("store_id", 0) + 1) if last_store else 2
    
    store_doc = {
        "store_id": next_id,
        "name": store.name,
        "status": "active",
        "plan": store.plan,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "max_users": store.max_users,
            "max_items": store.max_items,
            "max_customers": store.max_customers
        },
        "contact": {
            "email": store.contact_email or "",
            "phone": store.contact_phone or "",
            "address": store.address or ""
        }
    }
    
    await db.stores.insert_one(store_doc)
    
    # ============ AUTO-CREATE ADMIN USER FOR NEW STORE ============
    # Generate username from store name (lowercase, no spaces)
    store_name_normalized = store.name.lower().replace(" ", "_").replace("-", "_")
    username = f"{store_name_normalized}_admin"
    default_password = "admin123"  # User should change this after first login
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": username})
    if not existing_user:
        import bcrypt
        user_id = str(uuid.uuid4())
        hashed_pw = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin_user = {
            "id": user_id,
            "username": username,
            "password": hashed_pw,
            "role": "admin",
            "store_id": next_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
        
        # Add admin credentials to response
        store_doc["admin_credentials"] = {
            "username": username,
            "password": default_password,
            "message": "IMPORTANTE: Cambia la contraseña después del primer login"
        }
    # ============================================================
    
    return store_doc

@api_router.get("/stores/{store_id}", response_model=StoreResponse)
async def get_store(store_id: int, current_user: CurrentUser = Depends(require_super_admin)):
    """Get specific store - SUPER_ADMIN only"""
    store = await db.stores.find_one({"store_id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@api_router.put("/stores/{store_id}")
async def update_store(store_id: int, updates: StoreUpdate, current_user: CurrentUser = Depends(require_super_admin)):
    """Update store - SUPER_ADMIN only"""
    update_dict = {}
    
    # Basic fields
    if updates.name is not None:
        update_dict["name"] = updates.name
    if updates.status is not None:
        update_dict["status"] = updates.status
    if updates.plan is not None:
        update_dict["plan"] = updates.plan
    if updates.company_logo is not None:
        update_dict["company_logo"] = updates.company_logo
    if updates.ticket_footer is not None:
        update_dict["ticket_footer"] = updates.ticket_footer
    
    # Contact info
    if any([updates.contact_email is not None, updates.contact_phone is not None, updates.address is not None]):
        # Get existing contact first
        store = await db.stores.find_one({"store_id": store_id})
        contact = store.get("contact", {})
        
        if updates.contact_email is not None:
            contact["email"] = updates.contact_email
        if updates.contact_phone is not None:
            contact["phone"] = updates.contact_phone
        if updates.address is not None:
            contact["address"] = updates.address
        
        update_dict["contact"] = contact
    
    # Settings/limits
    if any([updates.max_users is not None, updates.max_items is not None, updates.max_customers is not None]):
        store = await db.stores.find_one({"store_id": store_id})
        settings = store.get("settings", {})
        
        if updates.max_users is not None:
            settings["max_users"] = updates.max_users
        if updates.max_items is not None:
            settings["max_items"] = updates.max_items
        if updates.max_customers is not None:
            settings["max_customers"] = updates.max_customers
        
        update_dict["settings"] = settings
    
    if update_dict:
        await db.stores.update_one(
            {"store_id": store_id},
            {"$set": update_dict}
        )
    
    return {"message": "Store updated successfully"}

@api_router.delete("/stores/{store_id}")
async def delete_store(store_id: int, current_user: CurrentUser = Depends(require_super_admin)):
    """Delete a store - SUPER_ADMIN only
    
    WARNING: This will:
    1. Delete the store record
    2. Delete all users associated with the store
    3. Optionally delete all store data (customers, items, rentals)
    
    Use with caution!
    """
    # Prevent deleting store 1 (main store)
    if store_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete the main store (Store 1)")
    
    # Check if store exists
    store = await db.stores.find_one({"store_id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Delete all users associated with this store
    users_result = await db.users.delete_many({"store_id": store_id})
    
    # Delete the store
    await db.stores.delete_one({"store_id": store_id})
    
    # Optional: Delete all store data (customers, items, rentals, etc.)
    # For now, we'll just delete the store and users
    # The data will remain but won't be accessible
    
    return {
        "message": f"Store {store_id} deleted successfully",
        "deleted_users": users_result.deleted_count,
        "store_name": store.get("name"),
        "warning": "Store data (customers, items, rentals) still exists in database but is inaccessible"
    }

@api_router.post("/stores/{store_id}/impersonate")
async def impersonate_store(store_id: int, current_user: CurrentUser = Depends(require_super_admin)):
    """Impersonate a store - SUPER_ADMIN only - Access as that store's admin"""
    # Find any admin user of that store
    admin_user = await db.users.find_one({"store_id": store_id, "role": "admin"})
    
    if not admin_user:
        # Create a temporary admin for impersonation
        raise HTTPException(status_code=404, detail="No admin user found for this store")
    
    # Create token for that user
    token = create_token(
        admin_user["id"],
        admin_user["username"],
        admin_user["role"],
        store_id
    )
    
    return {
        "access_token": token,
        "message": f"Impersonating store {store_id} as {admin_user['username']}"
    }

@api_router.get("/stores/{store_id}/stats")
async def get_store_stats(store_id: int, current_user: CurrentUser = Depends(require_super_admin)):
    """Get store statistics - SUPER_ADMIN only"""
    customers = await db.customers.count_documents({"store_id": store_id})
    items = await db.items.count_documents({"store_id": store_id, "status": {"$ne": "deleted"}})
    rentals = await db.rentals.count_documents({"store_id": store_id})
    users = await db.users.count_documents({"store_id": store_id})
    
    return {
        "store_id": store_id,
        "customers": customers,
        "items": items,
        "rentals": rentals,
        "users": users
    }


# ==================== TEAM MANAGEMENT ENDPOINTS ====================

@api_router.get("/team/members")
async def get_team_members(current_user: CurrentUser = Depends(get_current_user)):
    """Get all team members of the current store - ADMIN and STAFF can view"""
    store_filter = current_user.get_store_filter()
    
    # Get all users from this store
    users = await db.users.find(store_filter, {"_id": 0, "hashed_password": 0}).to_list(100)
    
    return [{
        "id": u["id"],
        "username": u["username"],
        "email": u.get("email", ""),
        "role": u.get("role", "staff"),
        "store_id": u.get("store_id"),
        "created_at": u.get("created_at", ""),
        "is_active": u.get("is_active", True)
    } for u in users]

@api_router.post("/team/members")
async def create_team_member(
    member: UserCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Create new team member (STAFF) - ADMIN ONLY. Respects plan limits."""
    
    store_filter = current_user.get_store_filter()
    
    # Get store and plan info for limit validation
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    plan_info = get_plan_limits(store)
    max_users = plan_info["max_users"]
    plan_name = store.get("plan") or store.get("plan_type", "trial")
    
    # Check if trial expired (only applies to trial plans, not paid plans)
    if plan_name == "trial" and store:
        trial_start = store.get("trial_start_date")
        if trial_start:
            if isinstance(trial_start, str):
                trial_start_dt = datetime.fromisoformat(trial_start.replace('Z', '+00:00'))
            else:
                trial_start_dt = trial_start
            days_since_start = (datetime.now(timezone.utc) - trial_start_dt).days
            if days_since_start > 15:
                raise HTTPException(
                    status_code=403,
                    detail="Tu período de prueba ha expirado. Por favor, selecciona un plan para continuar."
                )
    
    # VALIDATION: Count existing users in this store
    current_users_count = await db.users.count_documents(store_filter)
    
    # PLAN LIMIT: Check max_users from plan
    if max_users != 999 and current_users_count >= max_users:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "PLAN_LIMIT_EXCEEDED",
                "limit_type": "users",
                "current_count": current_users_count,
                "max_allowed": max_users,
                "plan_name": plan_info["name"],
                "message": f"Límite de usuarios alcanzado ({max_users}). Actualiza tu plan para añadir más."
            }
        )
    
    # SECURITY: Check if username already exists globally
    existing_user = await db.users.find_one({"username": member.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    # SECURITY: STAFF cannot create admin users
    if member.role not in ["staff", "employee"]:
        if current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="Solo puedes crear usuarios tipo 'staff'")
    
    # Create user
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": member.username,
        "email": member.username,  # Use username as email by default
        "hashed_password": pwd_context.hash(member.password),
        "role": "staff",  # Force staff role for team members
        "store_id": current_user.store_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.user_id,
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "id": user_doc["id"],
        "username": user_doc["username"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "store_id": user_doc["store_id"],
        "created_at": user_doc["created_at"]
    }

@api_router.put("/team/members/{user_id}")
async def update_team_member(
    user_id: str,
    updates: dict,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update team member - ADMIN ONLY"""
    
    store_filter = current_user.get_store_filter()
    
    # SECURITY: Can only update users from same store
    user = await db.users.find_one({**store_filter, "id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # SECURITY: Cannot modify super_admin or change role to admin
    if user.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="No puedes modificar al super admin")
    
    if "role" in updates and updates["role"] not in ["staff", "employee"]:
        if current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="No puedes cambiar roles a admin")
    
    # Update allowed fields
    allowed_fields = ["username", "email", "is_active"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one(
            {**store_filter, "id": user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({**store_filter, "id": user_id}, {"_id": 0, "hashed_password": 0})
    return updated_user

class ResetPasswordRequest(BaseModel):
    new_password: str

@api_router.put("/team/members/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    request: ResetPasswordRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Reset user password - ADMIN ONLY
    Admins can reset passwords for users in their store
    """
    
    store_filter = current_user.get_store_filter()
    
    # Validate new password length
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # SECURITY: Can only reset passwords for users from same store
    user = await db.users.find_one({**store_filter, "id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en tu tienda")
    
    # SECURITY: Cannot reset super_admin password unless you are super_admin
    if user.get("role") == "super_admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="No puedes cambiar la contraseña del super admin")
    
    # Hash the new password
    new_password_hash = hash_password(request.new_password)
    
    # Update password (remove old hashed_password field if exists)
    await db.users.update_one(
        {**store_filter, "id": user_id},
        {
            "$set": {"password": new_password_hash},
            "$unset": {"hashed_password": ""}
        }
    )
    
    return {
        "message": "Contraseña actualizada correctamente",
        "username": user.get("username")
    }

@api_router.delete("/team/members/{user_id}")
async def delete_team_member(
    user_id: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete team member - ADMIN ONLY. Cannot delete yourself or other admins."""
    
    store_filter = current_user.get_store_filter()
    
    # SECURITY: Cannot delete yourself
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    # SECURITY: Can only delete users from same store
    user = await db.users.find_one({**store_filter, "id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # SECURITY: Cannot delete admin or super_admin
    if user.get("role") in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="No puedes eliminar a un administrador")
    
    result = await db.users.delete_one({**store_filter, "id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario eliminado correctamente"}

@api_router.get("/team/count")
async def get_team_count(current_user: CurrentUser = Depends(get_current_user)):
    """Get current team member count for limit validation"""
    store_filter = current_user.get_store_filter()
    
    # Get plan info for limits
    store = await db.stores.find_one({"store_id": current_user.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    plan_info = get_plan_limits(store)
    max_users = plan_info["max_users"]
    
    # Count all users (admin + staff)
    total_count = await db.users.count_documents(store_filter)
    
    # Count by role
    admin_count = await db.users.count_documents({**store_filter, "role": "admin"})
    staff_count = await db.users.count_documents({**store_filter, "role": {"$in": ["staff", "employee"]}})
    
    return {
        "total": total_count,
        "admin": admin_count,
        "staff": staff_count,
        "max_users": max_users,
        "max_staff": max_users - 1 if max_users != 999 else 999,  # Reserve 1 for admin
        "can_add_more": total_count < max_users,
        "plan_name": plan_info["name"]
    }

# ==================== HELP CENTER ENDPOINTS ====================

@api_router.get("/help/videos", response_model=List[VideoTutorial])
async def get_video_tutorials(current_user: CurrentUser = Depends(get_current_user)):
    """Get all active video tutorials - GLOBAL CONTENT (visible for all stores)"""
    # GLOBAL: No filter by store_id - all stores see the same help content
    videos = await db.video_tutorials.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [VideoTutorial(**v) for v in videos]

@api_router.get("/help/videos/all", response_model=List[VideoTutorial])
async def get_all_video_tutorials(current_user: CurrentUser = Depends(require_super_admin)):
    """Get all video tutorials (including inactive) - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    videos = await db.video_tutorials.find(
        {}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [VideoTutorial(**v) for v in videos]

@api_router.post("/help/videos", response_model=VideoTutorial)
async def create_video_tutorial(
    video: VideoTutorialCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Create new video tutorial - SUPER ADMIN ONLY (GLOBAL CONTENT)"""
    video_doc = {
        "id": str(uuid.uuid4()),
        "store_id": None,  # GLOBAL: No store_id - visible for all stores
        "created_at": datetime.now(timezone.utc).isoformat(),
        **video.model_dump()
    }
    await db.video_tutorials.insert_one(video_doc)
    return VideoTutorial(**video_doc)

@api_router.put("/help/videos/{video_id}", response_model=VideoTutorial)
async def update_video_tutorial(
    video_id: str,
    video: VideoTutorialCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Update video tutorial - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    update_data = video.model_dump()
    result = await db.video_tutorials.update_one(
        {"id": video_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    updated = await db.video_tutorials.find_one({"id": video_id}, {"_id": 0})
    return VideoTutorial(**updated)

@api_router.delete("/help/videos/{video_id}")
async def delete_video_tutorial(
    video_id: str,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Delete video tutorial - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    result = await db.video_tutorials.delete_one({"id": video_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    return {"message": "Video eliminado correctamente"}

# FAQ ENDPOINTS
async def get_video_tutorials(current_user: CurrentUser = Depends(get_current_user)):
    """Get all active video tutorials - GLOBAL CONTENT (visible for all stores)"""
    # GLOBAL: No filter by store_id - all stores see the same help content
    videos = await db.video_tutorials.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [VideoTutorial(**v) for v in videos]

@api_router.get("/help/videos/all", response_model=List[VideoTutorial])
async def get_all_video_tutorials(current_user: CurrentUser = Depends(require_super_admin)):
    """Get all video tutorials (including inactive) - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    videos = await db.video_tutorials.find(
        {}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [VideoTutorial(**v) for v in videos]

@api_router.post("/help/videos", response_model=VideoTutorial)
async def create_video_tutorial(
    video: VideoTutorialCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Create new video tutorial - SUPER ADMIN ONLY (GLOBAL CONTENT)"""
    video_doc = {
        "id": str(uuid.uuid4()),
        "store_id": None,  # GLOBAL: No store_id - visible for all stores
        "created_at": datetime.now(timezone.utc).isoformat(),
        **video.model_dump()
    }
    await db.video_tutorials.insert_one(video_doc)
    return VideoTutorial(**video_doc)

@api_router.put("/help/videos/{video_id}", response_model=VideoTutorial)
async def update_video_tutorial(
    video_id: str,
    video: VideoTutorialCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Update video tutorial - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    update_data = video.model_dump()
    result = await db.video_tutorials.update_one(
        {"id": video_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    updated = await db.video_tutorials.find_one({"id": video_id}, {"_id": 0})
    return VideoTutorial(**updated)

@api_router.delete("/help/videos/{video_id}")
async def delete_video_tutorial(
    video_id: str,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Delete video tutorial - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    result = await db.video_tutorials.delete_one({"id": video_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    return {"message": "Video eliminado correctamente"}

# FAQ ENDPOINTS

@api_router.get("/help/faqs", response_model=List[FAQ])
async def get_faqs(current_user: CurrentUser = Depends(get_current_user)):
    """Get all active FAQs - GLOBAL CONTENT (visible for all stores)"""
    # GLOBAL: No filter by store_id - all stores see the same help content
    faqs = await db.faqs.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [FAQ(**f) for f in faqs]

@api_router.get("/help/faqs/all", response_model=List[FAQ])
async def get_all_faqs(current_user: CurrentUser = Depends(require_super_admin)):
    """Get all FAQs (including inactive) - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    faqs = await db.faqs.find(
        {}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return [FAQ(**f) for f in faqs]

@api_router.post("/help/faqs", response_model=FAQ)
async def create_faq(
    faq: FAQCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Create new FAQ - SUPER ADMIN ONLY (GLOBAL CONTENT)"""
    faq_doc = {
        "id": str(uuid.uuid4()),
        "store_id": None,  # GLOBAL: No store_id - visible for all stores
        "created_at": datetime.now(timezone.utc).isoformat(),
        **faq.model_dump()
    }
    await db.faqs.insert_one(faq_doc)
    return FAQ(**faq_doc)

@api_router.put("/help/faqs/{faq_id}", response_model=FAQ)
async def update_faq(
    faq_id: str,
    faq: FAQCreate,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Update FAQ - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    update_data = faq.model_dump()
    result = await db.faqs.update_one(
        {"id": faq_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="FAQ no encontrado")
    
    updated = await db.faqs.find_one({"id": faq_id}, {"_id": 0})
    return FAQ(**updated)

@api_router.delete("/help/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    current_user: CurrentUser = Depends(require_super_admin)
):
    """Delete FAQ - SUPER ADMIN ONLY"""
    # GLOBAL: No filter by store_id
    result = await db.faqs.delete_one({"id": faq_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ no encontrado")
    
    return {"message": "FAQ eliminado correctamente"}


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_indexes():
    """Create database indexes for performance optimization"""
    try:
        # Customer indexes for fast search and filtering (multi-tenant aware)
        # Note: DNI uniqueness is enforced per store via unique_dni_per_store index
        await db.customers.create_index([("store_id", 1), ("dni", 1)])
        await db.customers.create_index("name")
        await db.customers.create_index("phone")
        await db.customers.create_index("created_at")
        await db.customers.create_index("source")
        
        # Rental indexes for status filtering
        await db.rentals.create_index("status")
        await db.rentals.create_index("customer_id")
        await db.rentals.create_index("customer_dni")
        await db.rentals.create_index("start_date")
        await db.rentals.create_index("end_date")
        
        # ITEM INDEXES: Multi-field search optimization for barcode scanner
        # Compound indexes with store_id for multi-tenant performance
        await db.items.create_index([("store_id", 1), ("internal_code", 1)])
        await db.items.create_index([("store_id", 1), ("barcode", 1)])
        await db.items.create_index([("store_id", 1), ("barcode_2", 1)])
        await db.items.create_index([("store_id", 1), ("serial_number", 1)])
        await db.items.create_index([("store_id", 1), ("status", 1)])
        await db.items.create_index([("store_id", 1), ("item_type", 1)])
        # Text index for general search
        await db.items.create_index([
            ("internal_code", "text"), 
            ("barcode", "text"), 
            ("brand", "text"), 
            ("model", "text")
        ], default_language="spanish")
        
        logger.info("✅ Database indexes created successfully")
    except Exception as e:
        logger.warning(f"⚠️ Index creation error (may already exist): {e}")
    
    # MULTI-TENANT SECURITY: Validate data isolation on startup
    await validate_multitenant_isolation()


async def validate_multitenant_isolation():
    """
    CRITICAL SECURITY CHECK: Validate multi-tenant data isolation.
    Runs on every server startup to detect anomalies.
    """
    try:
        # Get all valid store IDs
        stores = await db.stores.distinct("store_id")
        valid_store_ids = set(stores)
        
        # Check for items without store_id
        orphan_items = await db.items.count_documents({
            "$or": [
                {"store_id": {"$exists": False}},
                {"store_id": None},
                {"store_id": {"$nin": list(valid_store_ids)}}
            ]
        })
        
        if orphan_items > 0:
            logger.error(f"🚨 SECURITY ALERT: {orphan_items} items without valid store_id!")
        
        # Check for customers without store_id
        orphan_customers = await db.customers.count_documents({
            "$or": [
                {"store_id": {"$exists": False}},
                {"store_id": None}
            ]
        })
        
        if orphan_customers > 0:
            logger.error(f"🚨 SECURITY ALERT: {orphan_customers} customers without store_id!")
        
        # Check for rentals without store_id
        orphan_rentals = await db.rentals.count_documents({
            "$or": [
                {"store_id": {"$exists": False}},
                {"store_id": None}
            ]
        })
        
        if orphan_rentals > 0:
            logger.error(f"🚨 SECURITY ALERT: {orphan_rentals} rentals without store_id!")
        
        # Summary
        total_orphans = orphan_items + orphan_customers + orphan_rentals
        if total_orphans == 0:
            logger.info("✅ Multi-tenant isolation: ALL DATA PROPERLY ISOLATED")
        else:
            logger.error(f"🚨 MULTI-TENANT VIOLATION: {total_orphans} records without proper store_id!")
            
    except Exception as e:
        logger.error(f"Error validating multi-tenant isolation: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

