from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import csv
import io
from fastapi import UploadFile, File

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
    address: Optional[str] = ""
    city: Optional[str] = ""
    source: Optional[str] = ""  # Proveedor/Fuente
    notes: Optional[str] = ""  # Observaciones internas

class CustomerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    dni: str
    name: str
    phone: str
    address: str
    city: str
    source: str = ""
    notes: str = ""
    created_at: str
    total_rentals: int = 0

class ItemCreate(BaseModel):
    barcode: str
    internal_code: str  # Internal shop code (REQUIRED - main identifier)
    item_type: str  # ski, snowboard, boots, helmet, poles
    brand: str
    model: str
    size: str
    purchase_price: float
    purchase_date: str
    location: str = ""
    maintenance_interval: int = 30  # days between maintenance
    category: str = "MEDIA"  # SUPERIOR, ALTA, MEDIA

class BulkItemCreate(BaseModel):
    items: List[ItemCreate]

class GenerateBarcodeRequest(BaseModel):
    prefix: str = "SKI"
    count: int = 1

class ItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barcode: str
    internal_code: str  # Internal shop code (main identifier)
    item_type: str
    brand: str
    model: str
    size: str
    status: str  # available, rented, maintenance, retired
    purchase_price: float
    purchase_date: str
    location: str
    days_used: int
    amortization: float
    category: str = "MEDIA"
    maintenance_interval: int = 30
    created_at: str

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
    deposit: float
    status: str  # active, returned, partial
    notes: str
    created_at: str

class ReturnInput(BaseModel):
    barcodes: List[str]

class MaintenanceCreate(BaseModel):
    item_id: str
    maintenance_type: str
    description: str
    cost: float = 0
    scheduled_date: Optional[str] = None

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

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
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
    
    token = create_token(user_id, user.username, user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, username=user.username, role=user.role)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(db_user["id"], db_user["username"], db_user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=db_user["id"], username=db_user["username"], role=db_user["role"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["sub"],
        username=current_user["username"],
        role=current_user["role"]
    )

# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"dni": customer.dni})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this DNI already exists")
    
    customer_id = str(uuid.uuid4())
    doc = {
        "id": customer_id,
        "dni": customer.dni.upper(),
        "name": customer.name,
        "phone": customer.phone or "",
        "address": customer.address or "",
        "city": customer.city or "",
        "source": customer.source or "",
        "notes": customer.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_rentals": 0
    }
    await db.customers.insert_one(doc)
    return CustomerResponse(**doc)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"dni": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        }
    customers = await db.customers.find(query, {"_id": 0}).to_list(100)
    return [CustomerResponse(**c) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

@api_router.get("/customers/dni/{dni}", response_model=CustomerResponse)
async def get_customer_by_dni(dni: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"dni": dni.upper()}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer)

@api_router.get("/customers/{customer_id}/history")
async def get_customer_history(customer_id: str, current_user: dict = Depends(get_current_user)):
    # Get customer info first
    customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    
    rentals = await db.rentals.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
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
        ).sort("created_at", -1).to_list(100)
        
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
    current_user: dict = Depends(get_current_user)
):
    existing = await db.customers.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if DNI is being changed and if new DNI already exists
    if customer.dni.upper() != existing["dni"]:
        dni_exists = await db.customers.find_one({"dni": customer.dni.upper()})
        if dni_exists:
            raise HTTPException(status_code=400, detail="Customer with this DNI already exists")
    
    update_doc = {
        "dni": customer.dni.upper(),
        "name": customer.name,
        "phone": customer.phone or "",
        "address": customer.address or "",
        "city": customer.city or "",
        "source": customer.source or "",
        "notes": customer.notes or ""
    }
    
    await db.customers.update_one({"id": customer_id}, {"$set": update_doc})
    updated_customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return CustomerResponse(**updated_customer)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer has active rentals
    active_rentals = await db.rentals.count_documents({
        "customer_id": customer_id,
        "status": "active"
    })
    
    if active_rentals > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer with {active_rentals} active rental(s). Please complete or cancel them first."
        )
    
    await db.customers.delete_one({"id": customer_id})
    return {"message": "Customer deleted successfully"}

# ==================== INVENTORY ROUTES ====================

@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, current_user: dict = Depends(get_current_user)):
    # Check for duplicate internal_code (primary identifier)
    existing_internal = await db.items.find_one({"internal_code": item.internal_code})
    if existing_internal:
        raise HTTPException(status_code=400, detail=f"Item with internal code '{item.internal_code}' already exists")
    
    # Check for duplicate barcode
    existing_barcode = await db.items.find_one({"barcode": item.barcode})
    if existing_barcode:
        raise HTTPException(status_code=400, detail=f"Item with barcode '{item.barcode}' already exists")
    
    item_id = str(uuid.uuid4())
    doc = {
        "id": item_id,
        "barcode": item.barcode,
        "internal_code": item.internal_code,
        "item_type": item.item_type,
        "brand": item.brand,
        "model": item.model,
        "size": item.size,
        "status": "available",
        "purchase_price": item.purchase_price,
        "purchase_date": item.purchase_date,
        "location": item.location or "",
        "category": item.category or "MEDIA",
        "maintenance_interval": item.maintenance_interval or 30,
        "days_used": 0,
        "amortization": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.items.insert_one(doc)
    return ItemResponse(**doc)

@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(
    status: Optional[str] = None,
    item_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if item_type:
        query["item_type"] = item_type
    if category:
        query["category"] = category
    if search:
        # Prioritize internal_code search first
        query["$or"] = [
            {"internal_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"size": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(query, {"_id": 0}).to_list(500)
    return [ItemResponse(**i) for i in items]

@api_router.get("/items/barcode/{barcode}", response_model=ItemResponse)
async def get_item_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    # Try internal_code first, then barcode
    item = await db.items.find_one({"internal_code": barcode}, {"_id": 0})
    if not item:
        item = await db.items.find_one({"barcode": barcode}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemResponse(**item)

@api_router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, item: ItemCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if internal_code changed and new code exists
    if item.internal_code != existing.get("internal_code", ""):
        code_exists = await db.items.find_one({"internal_code": item.internal_code, "id": {"$ne": item_id}})
        if code_exists:
            raise HTTPException(status_code=400, detail=f"Internal code '{item.internal_code}' already exists")
    
    # Check if barcode changed and new barcode exists
    if item.barcode != existing["barcode"]:
        barcode_exists = await db.items.find_one({"barcode": item.barcode, "id": {"$ne": item_id}})
        if barcode_exists:
            raise HTTPException(status_code=400, detail="Barcode already exists")
    
    update_doc = {
        "barcode": item.barcode,
        "internal_code": item.internal_code,
        "item_type": item.item_type,
        "brand": item.brand,
        "model": item.model,
        "size": item.size,
        "purchase_price": item.purchase_price,
        "purchase_date": item.purchase_date,
        "location": item.location or "",
        "category": item.category or "MEDIA",
        "maintenance_interval": item.maintenance_interval or 30
    }
    await db.items.update_one({"id": item_id}, {"$set": update_doc})
    
    updated = await db.items.find_one({"id": item_id}, {"_id": 0})
    return ItemResponse(**updated)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if item is currently rented
    if item["status"] == "rented":
        raise HTTPException(status_code=400, detail="Cannot delete: item is currently rented")
    
    # Move to retired status instead of deleting for traceability
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"status": "retired", "retired_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Item retired successfully"}

@api_router.put("/items/{item_id}/status")
async def update_item_status(item_id: str, status: str = Query(...), current_user: dict = Depends(get_current_user)):
    result = await db.items.update_one({"id": item_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Status updated"}

@api_router.post("/items/bulk")
async def create_items_bulk(data: BulkItemCreate, current_user: dict = Depends(get_current_user)):
    """Create multiple items at once"""
    created = []
    errors = []
    
    for item in data.items:
        existing = await db.items.find_one({"barcode": item.barcode})
        if existing:
            errors.append({"barcode": item.barcode, "error": "Already exists"})
            continue
        
        item_id = str(uuid.uuid4())
        doc = {
            "id": item_id,
            "barcode": item.barcode,
            "item_type": item.item_type,
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
async def import_items_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Import items from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = []
    errors = []
    
    for row in reader:
        try:
            barcode = row.get('barcode', row.get('codigo', '')).strip()
            if not barcode:
                errors.append({"row": row, "error": "Missing barcode"})
                continue
            
            existing = await db.items.find_one({"barcode": barcode})
            if existing:
                errors.append({"barcode": barcode, "error": "Already exists"})
                continue
            
            item_id = str(uuid.uuid4())
            doc = {
                "id": item_id,
                "barcode": barcode,
                "item_type": row.get('item_type', row.get('tipo', 'ski')).strip().lower(),
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
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.items.insert_one(doc)
            created.append({"barcode": barcode})
        except Exception as e:
            errors.append({"barcode": row.get('barcode', 'unknown'), "error": str(e)})
    
    return {"created": len(created), "errors": errors, "total_rows": len(created) + len(errors)}

@api_router.post("/items/generate-barcodes")
async def generate_barcodes(data: GenerateBarcodeRequest, current_user: dict = Depends(get_current_user)):
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
async def export_items_csv(current_user: dict = Depends(get_current_user)):
    """Export all items as CSV"""
    items = await db.items.find({}, {"_id": 0}).to_list(10000)
    
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
async def get_inventory_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    stats = await db.items.aggregate(pipeline).to_list(10)
    
    result = {"available": 0, "rented": 0, "maintenance": 0, "retired": 0, "total": 0}
    for s in stats:
        if s["_id"] in result:
            result[s["_id"]] = s["count"]
        result["total"] += s["count"]
    
    return result

# ==================== TARIFF ROUTES ====================

@api_router.post("/tariffs", response_model=TariffResponse)
async def create_tariff(tariff: TariffCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.tariffs.find_one({"item_type": tariff.item_type})
    if existing:
        await db.tariffs.update_one({"item_type": tariff.item_type}, {"$set": tariff.model_dump()})
        updated = await db.tariffs.find_one({"item_type": tariff.item_type}, {"_id": 0})
        return TariffResponse(**updated)
    
    tariff_id = str(uuid.uuid4())
    doc = {"id": tariff_id, **tariff.model_dump()}
    await db.tariffs.insert_one(doc)
    return TariffResponse(**doc)

@api_router.get("/tariffs", response_model=List[TariffResponse])
async def get_tariffs(current_user: dict = Depends(get_current_user)):
    tariffs = await db.tariffs.find({}, {"_id": 0}).to_list(20)
    return [TariffResponse(**t) for t in tariffs]

@api_router.get("/tariffs/{item_type}", response_model=TariffResponse)
async def get_tariff(item_type: str, current_user: dict = Depends(get_current_user)):
    tariff = await db.tariffs.find_one({"item_type": item_type}, {"_id": 0})
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return TariffResponse(**tariff)

# ==================== PACK ROUTES ====================

class PackCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str = "MEDIA"  # SUPERIOR, ALTA, MEDIA
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
    category: str = "MEDIA"
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
async def create_pack(pack: PackCreate, current_user: dict = Depends(get_current_user)):
    pack_id = str(uuid.uuid4())
    doc = {
        "id": pack_id,
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
async def get_packs(current_user: dict = Depends(get_current_user)):
    packs = await db.packs.find({}, {"_id": 0}).to_list(50)
    return [PackResponse(**p) for p in packs]

@api_router.put("/packs/{pack_id}", response_model=PackResponse)
async def update_pack(pack_id: str, pack: PackCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.packs.find_one({"id": pack_id})
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
    await db.packs.update_one({"id": pack_id}, {"$set": update_doc})
    
    updated = await db.packs.find_one({"id": pack_id}, {"_id": 0})
    return PackResponse(**updated)

@api_router.delete("/packs/{pack_id}")
async def delete_pack(pack_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.packs.delete_one({"id": pack_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"message": "Pack deleted"}

# ==================== RENTAL ROUTES ====================

def calculate_days(start_date: str, end_date: str) -> int:
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    return max(1, (end - start).days + 1)

@api_router.post("/rentals", response_model=RentalResponse)
async def create_rental(rental: RentalCreate, current_user: dict = Depends(get_current_user)):
    # Validate customer
    customer = await db.customers.find_one({"id": rental.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate and get items
    items_data = []
    for item_input in rental.items:
        item = await db.items.find_one({"barcode": item_input.barcode}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_input.barcode} not found")
        if item["status"] != "available":
            raise HTTPException(status_code=400, detail=f"Item {item_input.barcode} is not available")
        
        items_data.append({
            "item_id": item["id"],
            "barcode": item["barcode"],
            "item_type": item["item_type"],
            "brand": item["brand"],
            "model": item["model"],
            "size": item["size"],
            "person_name": item_input.person_name or "",
            "returned": False
        })
        
        # Mark item as rented
        await db.items.update_one({"id": item["id"]}, {"$set": {"status": "rented"}})
    
    days = calculate_days(rental.start_date, rental.end_date)
    rental_id = str(uuid.uuid4())
    
    doc = {
        "id": rental_id,
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
    
    await db.rentals.insert_one(doc)
    await db.customers.update_one({"id": rental.customer_id}, {"$inc": {"total_rentals": 1}})
    
    # AUTO-REGISTER in CAJA: Create cash movement for the paid amount
    if rental.paid_amount > 0:
        cash_movement_id = str(uuid.uuid4())
        cash_doc = {
            "id": cash_movement_id,
            "movement_type": "income",
            "amount": rental.paid_amount,
            "payment_method": rental.payment_method,
            "category": "rental",
            "concept": f"Alquiler #{rental_id[:8]} - {customer['name']}",
            "reference_id": rental_id,
            "customer_name": customer["name"],
            "notes": f"Alquiler {days} días ({rental.start_date} a {rental.end_date})",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["username"]
        }
        await db.cash_movements.insert_one(cash_doc)
    
    return RentalResponse(**doc)

@api_router.get("/rentals", response_model=List[RentalResponse])
async def get_rentals(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    
    rentals = await db.rentals.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [RentalResponse(**r) for r in rentals]

@api_router.get("/rentals/{rental_id}", response_model=RentalResponse)
async def get_rental(rental_id: str, current_user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    return RentalResponse(**rental)

@api_router.get("/rentals/barcode/{barcode}")
async def get_rental_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one(
        {"items.barcode": barcode, "status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    )
    if not rental:
        raise HTTPException(status_code=404, detail="No active rental found for this item")
    return RentalResponse(**rental)

@api_router.get("/rentals/pending/returns")
async def get_pending_returns(current_user: dict = Depends(get_current_user)):
    """Get all rentals with pending returns, grouped by date"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Get all active and partial rentals
    rentals = await db.rentals.find(
        {"status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    ).sort("end_date", 1).to_list(200)
    
    today_returns = []
    other_returns = []
    
    for rental in rentals:
        end_date = rental["end_date"].split("T")[0]  # Get just the date part
        pending_items = [i for i in rental["items"] if not i.get("returned", False)]
        
        if not pending_items:
            continue
            
        rental_info = {
            "id": rental["id"],
            "customer_name": rental["customer_name"],
            "customer_dni": rental["customer_dni"],
            "end_date": end_date,
            "pending_items": pending_items,
            "pending_amount": rental["pending_amount"],
            "days_overdue": 0
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
async def process_return(rental_id: str, return_input: ReturnInput, current_user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    returned_items = []
    pending_items = []
    days = rental["days"]
    
    for item in rental["items"]:
        if item["barcode"] in return_input.barcodes:
            item["returned"] = True
            returned_items.append(item)
            # Update item status and days used
            await db.items.update_one(
                {"id": item["item_id"]},
                {"$set": {"status": "available"}, "$inc": {"days_used": days}}
            )
            # Update amortization
            item_doc = await db.items.find_one({"id": item["item_id"]})
            if item_doc:
                tariff = await db.tariffs.find_one({"item_type": item_doc["item_type"]})
                if tariff:
                    daily_rate = tariff.get("days_1", 0)
                    amortization = item_doc.get("days_used", 0) * daily_rate
                    await db.items.update_one(
                        {"id": item["item_id"]},
                        {"$set": {"amortization": amortization}}
                    )
        elif not item.get("returned", False):
            pending_items.append(item)
    
    # Update rental status
    new_status = "returned" if len(pending_items) == 0 else "partial"
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": {"items": rental["items"], "status": new_status}}
    )
    
    return {
        "message": "Return processed",
        "returned_items": returned_items,
        "pending_items": pending_items,
        "status": new_status,
        "pending_amount": rental["pending_amount"]
    }

@api_router.post("/rentals/{rental_id}/payment")
async def process_payment(rental_id: str, amount: float = Query(...), current_user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one({"id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    new_paid = rental["paid_amount"] + amount
    new_pending = rental["total_amount"] - new_paid
    
    await db.rentals.update_one(
        {"id": rental_id},
        {"$set": {"paid_amount": new_paid, "pending_amount": max(0, new_pending)}}
    )
    
    return {"message": "Payment processed", "paid_amount": new_paid, "pending_amount": max(0, new_pending)}

class UpdateRentalDaysRequest(BaseModel):
    days: int
    new_total: float

@api_router.patch("/rentals/{rental_id}/days")
async def update_rental_days(rental_id: str, update_data: UpdateRentalDaysRequest, current_user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one({"id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    if rental["status"] not in ["active", "partial"]:
        raise HTTPException(status_code=400, detail="Cannot modify closed rental")
    
    # Calculate new end date
    start_date = datetime.fromisoformat(rental["start_date"].replace('Z', '+00:00'))
    new_end_date = start_date + timedelta(days=update_data.days - 1)
    
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
    
    updated = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    return RentalResponse(**updated)

# Refund request model
class RefundRequest(BaseModel):
    days_to_refund: int
    refund_amount: float
    payment_method: str = "cash"
    reason: str = ""

@api_router.post("/rentals/{rental_id}/refund")
async def process_refund(rental_id: str, refund: RefundRequest, current_user: dict = Depends(get_current_user)):
    """
    Process a partial refund for unused days.
    Creates a negative entry in the cash register.
    """
    rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
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
    customer = await db.customers.find_one({"id": rental["customer_id"]}, {"_id": 0})
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
    
    # Create NEGATIVE cash movement (refund)
    refund_movement_id = str(uuid.uuid4())
    refund_doc = {
        "id": refund_movement_id,
        "movement_type": "refund",  # Special type for refunds
        "amount": refund.refund_amount,
        "payment_method": refund.payment_method,
        "category": "refund",
        "concept": f"Devolución Alquiler #{rental_id[:8]} - {customer_name}",
        "reference_id": rental_id,
        "customer_name": customer_name,
        "notes": f"Reembolso {refund.days_to_refund} día(s) no disfrutado(s). {refund.reason}".strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["username"]
    }
    await db.cash_movements.insert_one(refund_doc)
    
    updated_rental = await db.rentals.find_one({"id": rental_id}, {"_id": 0})
    
    return {
        "message": "Reembolso procesado correctamente",
        "refund_amount": refund.refund_amount,
        "days_refunded": refund.days_to_refund,
        "new_days": new_days,
        "new_total": new_total,
        "cash_movement_id": refund_movement_id,
        "rental": RentalResponse(**updated_rental)
    }

# ==================== MAINTENANCE ROUTES ====================

@api_router.post("/maintenance", response_model=MaintenanceResponse)
async def create_maintenance(maintenance: MaintenanceCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": maintenance.item_id}, {"_id": 0})
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
    await db.items.update_one({"id": maintenance.item_id}, {"$set": {"status": "maintenance"}})
    
    return MaintenanceResponse(**doc)

@api_router.get("/maintenance", response_model=List[MaintenanceResponse])
async def get_maintenance(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    records = await db.maintenance.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [MaintenanceResponse(**r) for r in records]

@api_router.post("/maintenance/{maintenance_id}/complete")
async def complete_maintenance(maintenance_id: str, current_user: dict = Depends(get_current_user)):
    maintenance = await db.maintenance.find_one({"id": maintenance_id})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    
    await db.maintenance.update_one(
        {"id": maintenance_id},
        {"$set": {"status": "completed", "completed_date": datetime.now(timezone.utc).isoformat()}}
    )
    await db.items.update_one({"id": maintenance["item_id"]}, {"$set": {"status": "available"}})
    
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
async def create_external_repair(repair: ExternalRepairCreate, current_user: dict = Depends(get_current_user)):
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
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status and status != "all":
        query["status"] = status
    
    repairs = await db.external_repairs.find(query, {"_id": 0}).sort("delivery_date", 1).to_list(200)
    return [ExternalRepairResponse(**r) for r in repairs]

@api_router.get("/external-repairs/{repair_id}", response_model=ExternalRepairResponse)
async def get_external_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    repair = await db.external_repairs.find_one({"id": repair_id}, {"_id": 0})
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    return ExternalRepairResponse(**repair)

@api_router.put("/external-repairs/{repair_id}")
async def update_external_repair(repair_id: str, repair: ExternalRepairCreate, current_user: dict = Depends(get_current_user)):
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
async def complete_external_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
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
    current_user: dict = Depends(get_current_user)
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
        cash_movement_id = str(uuid.uuid4())
        # Build description from notes or services
        work_desc = repair.get("notes", "") or ", ".join(repair.get("services", ["Reparación"]))
        cash_doc = {
            "id": cash_movement_id,
            "movement_type": "income",
            "amount": repair["price"],
            "payment_method": delivery.payment_method,
            "category": "workshop",
            "concept": f"Servicio Taller: {repair['customer_name']}",
            "reference_id": repair_id,
            "customer_name": repair["customer_name"],
            "notes": f"{repair['equipment_description']} - {work_desc[:50]}",
            "created_at": now,
            "created_by": current_user["username"]
        }
        await db.cash_movements.insert_one(cash_doc)
    
    return {"message": "Repair delivered and charged", "amount": repair["price"]}

@api_router.delete("/external-repairs/{repair_id}")
async def delete_external_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.external_repairs.delete_one({"id": repair_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Repair not found")
    return {"message": "Repair deleted"}

@api_router.get("/external-services")
async def get_external_services(current_user: dict = Depends(get_current_user)):
    """Returns available services and their default prices"""
    return EXTERNAL_SERVICES

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/daily", response_model=DailyReportResponse)
async def get_daily_report(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    # Get rentals for the day
    rentals = await db.rentals.find({
        "created_at": {"$gte": start, "$lte": end}
    }, {"_id": 0}).to_list(500)
    
    # Calculate revenue by payment method
    cash_revenue = sum(r["paid_amount"] for r in rentals if r["payment_method"] == "cash")
    card_revenue = sum(r["paid_amount"] for r in rentals if r["payment_method"] == "card")
    online_revenue = sum(r["paid_amount"] for r in rentals if r["payment_method"] in ["online", "pago_online"])
    other_revenue = sum(r["paid_amount"] for r in rentals if r["payment_method"] in ["pending", "other"])
    
    # Get returns for the day
    returns_count = await db.rentals.count_documents({
        "status": "returned",
        "created_at": {"$gte": start, "$lte": end}
    })
    
    # Get active rentals
    active_rentals = await db.rentals.count_documents({"status": "active"})
    
    # Get pending returns
    pending_returns = await db.rentals.find(
        {"status": {"$in": ["active", "partial"]}},
        {"_id": 0}
    ).to_list(100)
    
    pending_list = []
    for r in pending_returns:
        pending_items = [i for i in r["items"] if not i.get("returned", False)]
        if pending_items:
            pending_list.append({
                "rental_id": r["id"],
                "customer_name": r["customer_name"],
                "customer_dni": r["customer_dni"],
                "end_date": r["end_date"],
                "pending_items": len(pending_items),
                "pending_amount": r.get("pending_amount", 0)
            })

@api_router.get("/reports/range", response_model=RangeReportResponse)
async def get_range_report(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive report for a date range including:
    - Revenue breakdown by payment method
    - Rentals and returns
    - External repairs revenue
    - Commission summary by provider
    - Pending returns
    """
    start_dt = f"{start_date}T00:00:00"
    end_dt = f"{end_date}T23:59:59"
    
    # Get rentals in the range
    rentals = await db.rentals.find({
        "created_at": {"$gte": start_dt, "$lte": end_dt}
    }, {"_id": 0}).to_list(5000)
    
    # Calculate revenue by payment method
    cash_revenue = sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") == "cash")
    card_revenue = sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") == "card")
    online_revenue = sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") in ["online", "pago_online"])
    other_revenue = sum(r.get("paid_amount", 0) for r in rentals if r.get("payment_method") in ["pending", "other"])
    
    # Get returns in the range
    returns_count = await db.rentals.count_documents({
        "status": "returned",
        "created_at": {"$gte": start_dt, "$lte": end_dt}
    })
    
    # Get external repairs revenue
    repairs = await db.external_repairs.find({
        "created_at": {"$gte": start_dt, "$lte": end_dt},
        "status": {"$in": ["completed", "delivered"]}
    }, {"_id": 0, "price": 1}).to_list(1000)
    repairs_revenue = sum(r.get("price", 0) for r in repairs)
    
    # Calculate commissions by provider
    sources = await db.sources.find({}, {"_id": 0}).to_list(100)
    commissions_list = []
    
    for source in sources:
        if source.get("commission_percent", 0) > 0:
            # Get customers from this source
            source_customers = await db.customers.find(
                {"source_id": source["id"]},
                {"_id": 0, "id": 1}
            ).to_list(1000)
            
            customer_ids = [c["id"] for c in source_customers]
            
            if customer_ids:
                # Get rentals from these customers in the date range
                source_rentals = await db.rentals.find({
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
    
    # Get pending returns (all active/partial rentals)
    pending_returns = await db.rentals.find(
        {"status": {"$in": ["active", "partial"]}},
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

# ==================== DAILY REPORT ENDPOINT ====================

@api_router.get("/reports/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = f"{today}T00:00:00"
    end = f"{today}T23:59:59"
    
    # Today's rentals
    today_rentals = await db.rentals.count_documents({
        "created_at": {"$gte": start, "$lte": end}
    })
    
    # Today's revenue
    rentals = await db.rentals.find({
        "created_at": {"$gte": start, "$lte": end}
    }, {"_id": 0, "paid_amount": 1}).to_list(500)
    today_revenue = sum(r["paid_amount"] for r in rentals)
    
    # Active rentals
    active_rentals = await db.rentals.count_documents({"status": "active"})
    
    # Pending returns (overdue)
    overdue = await db.rentals.count_documents({
        "status": {"$in": ["active", "partial"]},
        "end_date": {"$lt": today}
    })
    
    # Inventory stats
    inventory = await get_inventory_stats(current_user)
    
    return {
        "today_rentals": today_rentals,
        "today_revenue": today_revenue,
        "active_rentals": active_rentals,
        "overdue_returns": overdue,
        "inventory": inventory
    }

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    stats = await get_stats(current_user)
    
    # Recent activity
    recent_rentals = await db.rentals.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    # Occupancy by Category (Gama)
    category_stats = await db.items.aggregate([
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
        "SUPERIOR": {"total": 0, "rented": 0, "percentage": 0},
        "ALTA": {"total": 0, "rented": 0, "percentage": 0},
        "MEDIA": {"total": 0, "rented": 0, "percentage": 0}
    }
    
    for stat in category_stats:
        category = stat["_id"].get("category", "MEDIA")
        status = stat["_id"].get("status", "available")
        count = stat["count"]
        
        if category in occupancy_by_category:
            occupancy_by_category[category]["total"] += count
            if status == "rented":
                occupancy_by_category[category]["rented"] += count
    
    # Calculate percentages
    for category in occupancy_by_category:
        total = occupancy_by_category[category]["total"]
        rented = occupancy_by_category[category]["rented"]
        if total > 0:
            occupancy_by_category[category]["percentage"] = round((rented / total) * 100, 1)
    
    # Maintenance Alerts (grouped by category and item type)
    maintenance_items = await db.items.aggregate([
        {
            "$match": {
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
    
    # Overdue rentals
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue_rentals = await db.rentals.find(
        {"status": {"$in": ["active", "partial"]}, "end_date": {"$lt": today}},
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

@api_router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
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
    
    # Get all items by category
    all_items = await db.items.find(
        {"status": {"$in": ["available", "rented"]}},
        {"_id": 0, "id": 1, "category": 1, "status": 1}
    ).to_list(1000)
    
    # Count total by category
    totals_by_cat = {"SUPERIOR": 0, "ALTA": 0, "MEDIA": 0}
    for item in all_items:
        cat = item.get("category", "MEDIA")
        if cat in totals_by_cat:
            totals_by_cat[cat] += 1
    
    # Get active rentals
    active_rentals = await db.rentals.find(
        {"status": {"$in": ["active", "partial"]}},
        {"_id": 0, "items": 1, "start_date": 1, "end_date": 1}
    ).to_list(500)
    
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
    # Get rental counts based on analysis period
    rental_item_counts = {}
    rentals_for_stats = await db.rentals.find(
        {"created_at": {"$gte": analysis_start, "$lte": analysis_end}},
        {"_id": 0, "items": 1, "total_amount": 1, "days": 1}
    ).to_list(500)
    
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
                        "category": item.get("category", "MEDIA"),
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
        stale_item_data = await db.items.find(
            {"barcode": {"$in": list(stale_barcodes)}, "status": "available"},
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
                "category": item.get("category", "MEDIA"),
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
async def create_source(source: SourceCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.sources.find_one({"name": source.name})
    if existing:
        raise HTTPException(status_code=400, detail="Source already exists")
    
    source_id = str(uuid.uuid4())
    doc = {
        "id": source_id,
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
async def get_sources(current_user: dict = Depends(get_current_user)):
    sources = await db.sources.find({}, {"_id": 0}).sort([("is_favorite", -1), ("name", 1)]).to_list(100)
    
    # Count customers per source
    for source in sources:
        count = await db.customers.count_documents({"source": source["name"]})
        source["customer_count"] = count
    
    return [SourceResponse(**s) for s in sources]

@api_router.delete("/sources/{source_id}")
async def delete_source(source_id: str, current_user: dict = Depends(get_current_user)):
    source = await db.sources.find_one({"id": source_id})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Check if source is used
    count = await db.customers.count_documents({"source": source["name"]})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {count} customers using this source")
    
    await db.sources.delete_one({"id": source_id})
    return {"message": "Source deleted"}

@api_router.put("/sources/{source_id}", response_model=SourceResponse)
async def update_source(source_id: str, source: SourceCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.sources.find_one({"id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Check if name changed and new name exists
    if source.name != existing["name"]:
        name_exists = await db.sources.find_one({"name": source.name, "id": {"$ne": source_id}})
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
    await db.sources.update_one({"id": source_id}, {"$set": update_doc})
    
    updated = await db.sources.find_one({"id": source_id}, {"_id": 0})
    count = await db.customers.count_documents({"source": updated["name"]})
    updated["customer_count"] = count
    return SourceResponse(**updated)

@api_router.get("/sources/{source_id}/stats")
async def get_source_stats(source_id: str, current_user: dict = Depends(get_current_user)):
    """Get statistics for a specific provider/source"""
    source = await db.sources.find_one({"id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Get customers from this source
    customers = await db.customers.find({"source": source["name"]}, {"_id": 0}).to_list(1000)
    customer_ids = [c["id"] for c in customers]
    
    # Get rentals from these customers
    rentals = await db.rentals.find(
        {"customer_id": {"$in": customer_ids}},
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

class CashClosingCreate(BaseModel):
    date: str
    physical_cash: float
    notes: Optional[str] = ""

class CashClosingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    total_income: float
    total_expense: float
    expected_balance: float
    physical_cash: float
    difference: float
    notes: str
    closed_by: str
    closed_at: str

@api_router.post("/cash/movements")
async def create_cash_movement(movement: CashMovementCreate, current_user: dict = Depends(get_current_user)):
    movement_id = str(uuid.uuid4())
    doc = {
        "id": movement_id,
        "movement_type": movement.movement_type,
        "amount": movement.amount,
        "payment_method": movement.payment_method,
        "category": movement.category,
        "concept": movement.concept,
        "reference_id": movement.reference_id,
        "notes": movement.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["username"]
    }
    await db.cash_movements.insert_one(doc)
    return CashMovementResponse(**doc)

@api_router.get("/cash/movements")
async def get_cash_movements(
    date: Optional[str] = None,
    movement_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    query = {"created_at": {"$gte": start, "$lte": end}}
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.cash_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [CashMovementResponse(**m) for m in movements]

@api_router.get("/cash/summary")
async def get_cash_summary(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    movements = await db.cash_movements.find(
        {"created_at": {"$gte": start, "$lte": end}},
        {"_id": 0}
    ).to_list(500)
    
    total_income = sum(m["amount"] for m in movements if m["movement_type"] == "income")
    total_expense = sum(m["amount"] for m in movements if m["movement_type"] == "expense")
    total_refunds = sum(m["amount"] for m in movements if m["movement_type"] == "refund")
    
    # Group by payment method
    by_method = {}
    for m in movements:
        method = m["payment_method"]
        if method not in by_method:
            by_method[method] = {"income": 0, "expense": 0, "refund": 0}
        movement_type = m["movement_type"]
        if movement_type in by_method[method]:
            by_method[method][movement_type] += m["amount"]
    
    # Net balance = Income - Expenses - Refunds
    balance = total_income - total_expense - total_refunds
    
    return {
        "date": date,
        "total_income": total_income,
        "total_expense": total_expense,
        "total_refunds": total_refunds,
        "balance": balance,
        "by_payment_method": by_method,
        "movements_count": len(movements)
    }

@api_router.post("/cash/close")
async def close_cash_register(closing: CashClosingCreate, current_user: dict = Depends(get_current_user)):
    # Check if already closed
    existing = await db.cash_closings.find_one({"date": closing.date})
    if existing:
        raise HTTPException(status_code=400, detail="Cash register already closed for this date")
    
    # Get summary
    summary = await get_cash_summary(closing.date, current_user)
    
    closing_id = str(uuid.uuid4())
    doc = {
        "id": closing_id,
        "date": closing.date,
        "total_income": summary["total_income"],
        "total_expense": summary["total_expense"],
        "expected_balance": summary["balance"],
        "physical_cash": closing.physical_cash,
        "difference": closing.physical_cash - summary["balance"],
        "notes": closing.notes or "",
        "closed_by": current_user["username"],
        "closed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cash_closings.insert_one(doc)
    return CashClosingResponse(**doc)

@api_router.get("/cash/closings")
async def get_cash_closings(current_user: dict = Depends(get_current_user)):
    closings = await db.cash_closings.find({}, {"_id": 0}).sort("date", -1).to_list(100)
    return [CashClosingResponse(**c) for c in closings]

# ==================== INTEGRATIONS CONFIG ROUTES ====================

class IntegrationConfig(BaseModel):
    integration_type: str  # whatsapp, tpv, email, calendar
    enabled: bool = False
    config: dict = {}

@api_router.post("/integrations/config")
async def save_integration_config(config: IntegrationConfig, current_user: dict = Depends(get_current_user)):
    existing = await db.integrations.find_one({"integration_type": config.integration_type})
    
    doc = {
        "integration_type": config.integration_type,
        "enabled": config.enabled,
        "config": config.config,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["username"]
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
async def get_integrations_config(current_user: dict = Depends(get_current_user)):
    configs = await db.integrations.find({}, {"_id": 0}).to_list(20)
    return configs

@api_router.get("/integrations/config/{integration_type}")
async def get_integration_config(integration_type: str, current_user: dict = Depends(get_current_user)):
    config = await db.integrations.find_one({"integration_type": integration_type}, {"_id": 0})
    if not config:
        return {"integration_type": integration_type, "enabled": False, "config": {}}
    return config

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
