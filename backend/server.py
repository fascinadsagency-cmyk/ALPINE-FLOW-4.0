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
    rentals = await db.rentals.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
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
    
    return {
        "rentals": rentals,
        "preferred_sizes": sizes,
        "total_rentals": len(rentals)
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
    existing = await db.items.find_one({"barcode": item.barcode})
    if existing:
        raise HTTPException(status_code=400, detail="Item with this barcode already exists")
    
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
        query["$or"] = [
            {"barcode": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"size": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(query, {"_id": 0}).to_list(500)
    return [ItemResponse(**i) for i in items]

@api_router.get("/items/barcode/{barcode}", response_model=ItemResponse)
async def get_item_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"barcode": barcode}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemResponse(**item)

@api_router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, item: ItemCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if barcode changed and new barcode exists
    if item.barcode != existing["barcode"]:
        barcode_exists = await db.items.find_one({"barcode": item.barcode, "id": {"$ne": item_id}})
        if barcode_exists:
            raise HTTPException(status_code=400, detail="Barcode already exists")
    
    update_doc = {
        "barcode": item.barcode,
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
                "pending_amount": r["pending_amount"]
            })
    
    # Inventory usage
    total_items = await db.items.count_documents({})
    rented_items = await db.items.count_documents({"status": "rented"})
    usage = (rented_items / total_items * 100) if total_items > 0 else 0
    
    return DailyReportResponse(
        date=date,
        total_revenue=cash_revenue + card_revenue + online_revenue + other_revenue,
        cash_revenue=cash_revenue,
        card_revenue=card_revenue,
        online_revenue=online_revenue,
        other_revenue=other_revenue,
        new_rentals=len(rentals),
        returns=returns_count,
        active_rentals=active_rentals,
        pending_returns=pending_list,
        inventory_usage=round(usage, 1)
    )

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
    reference_id: Optional[str]
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
    
    # Group by payment method
    by_method = {}
    for m in movements:
        method = m["payment_method"]
        if method not in by_method:
            by_method[method] = {"income": 0, "expense": 0}
        by_method[method][m["movement_type"]] += m["amount"]
    
    return {
        "date": date,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
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
