from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import csv
import io

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr


# -----------------------------------------------------------------------------
# App & DB Setup
# -----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Sri Venkataramana Cement Traders API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
BUSINESS_WHATSAPP = os.environ.get('BUSINESS_WHATSAPP', '919440828759')


# -----------------------------------------------------------------------------
# Password + JWT helpers
# -----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(email: str) -> str:
    payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("email")
        admin = await db.admins.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class BrandOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    stock: int


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str  # "Cement Bags", "TMT Steel Rods", ...
    unit: str  # "Bag", "Ton", "KG", "Bundle"
    description: str = ""
    image_url: str = ""
    brands: List[BrandOption] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProductCreate(BaseModel):
    title: str
    category: str
    unit: str
    description: str = ""
    image_url: str = ""
    brands: List[BrandOption] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    brands: Optional[List[BrandOption]] = None


class UpiAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    upi_id: str
    holder_name: str
    limit_2day: float = 300000.0
    manual_active: Optional[bool] = None  # if set, overrides rotation
    enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UpiCreate(BaseModel):
    upi_id: str
    holder_name: str
    limit_2day: float = 300000.0
    enabled: bool = True


class UpiUpdate(BaseModel):
    upi_id: Optional[str] = None
    holder_name: Optional[str] = None
    limit_2day: Optional[float] = None
    manual_active: Optional[bool] = None
    enabled: Optional[bool] = None


class OrderItem(BaseModel):
    product_id: str
    product_title: str
    brand_name: str
    unit: str
    quantity: float
    unit_price: float
    subtotal: float


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_address: str
    site_contact: str = ""
    urgency_date: str = ""
    notes: str = ""
    items: List[OrderItem]
    total_amount: float


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_phone: str
    delivery_address: str
    site_contact: str = ""
    urgency_date: str = ""
    notes: str = ""
    items: List[OrderItem]
    total_amount: float
    assigned_upi_id: str = ""
    status: str = "Pending"  # Pending, Paid, Confirmed, Delivered, Cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OrderStatusUpdate(BaseModel):
    status: str


class MeetingCreate(BaseModel):
    full_name: str
    mobile: str
    site_location: str
    materials_required: str = ""
    preferred_datetime: str = ""
    notes: str = ""


class Meeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    mobile: str
    site_location: str
    materials_required: str = ""
    preferred_datetime: str = ""
    notes: str = ""
    status: str = "New"  # New, Scheduled, Completed, Cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MeetingStatusUpdate(BaseModel):
    status: str


# -----------------------------------------------------------------------------
# Auth Endpoints
# -----------------------------------------------------------------------------
@api_router.post("/auth/login")
async def admin_login(payload: LoginRequest):
    email = payload.email.lower()
    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(email)
    return {"token": token, "email": email, "name": admin.get("name", "Admin")}


@api_router.get("/auth/me")
async def get_me(admin=Depends(get_current_admin)):
    return admin


# -----------------------------------------------------------------------------
# Public: Products
# -----------------------------------------------------------------------------
@api_router.get("/products", response_model=List[Product])
async def list_products(category: Optional[str] = None):
    query = {}
    if category and category != "All":
        query["category"] = category
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


# Admin: Products
@api_router.post("/admin/products", response_model=Product)
async def create_product(payload: ProductCreate, admin=Depends(get_current_admin)):
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api_router.patch("/admin/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductUpdate, admin=Depends(get_current_admin)):
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "brands" in update_data:
        # ensure each brand has an id
        for b in update_data["brands"]:
            if not b.get("id"):
                b["id"] = str(uuid.uuid4())
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin=Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api_router.post("/admin/products/bulk-csv")
async def bulk_import_csv(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    """Import products from CSV.

    Expected columns (case-insensitive):
      title, category, unit, description, image_url, brand_name, brand_price, brand_stock

    Multiple rows sharing the same title/category are grouped as different brands
    for the same product. If a product with the same title already exists, its
    brands are upserted (matched by brand name).
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = (await file.read()).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))

    # Normalize field names -> lowercase
    def norm(row):
        return {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}

    grouped: dict = {}  # key = title lowercased, value = { product fields + brands list }
    errors: list = []
    row_num = 1
    for row in reader:
        row_num += 1
        r = norm(row)
        title = r.get("title", "")
        brand_name = r.get("brand_name", "")
        if not title or not brand_name:
            errors.append(f"Row {row_num}: missing title or brand_name")
            continue
        try:
            price = float(r.get("brand_price", "0") or 0)
            stock = int(float(r.get("brand_stock", "0") or 0))
        except ValueError:
            errors.append(f"Row {row_num}: invalid price or stock")
            continue

        key = title.lower()
        if key not in grouped:
            grouped[key] = {
                "title": title,
                "category": r.get("category", "Other") or "Other",
                "unit": r.get("unit", "Piece") or "Piece",
                "description": r.get("description", ""),
                "image_url": r.get("image_url", ""),
                "brands": [],
            }
        grouped[key]["brands"].append({
            "name": brand_name,
            "price": price,
            "stock": stock,
        })

    created = 0
    updated = 0
    for _, payload in grouped.items():
        existing = await db.products.find_one({"title": payload["title"]}, {"_id": 0})
        if existing:
            # Upsert brands: match by name (case-insensitive)
            existing_brands = existing.get("brands", [])
            for new_b in payload["brands"]:
                match = next((b for b in existing_brands if b["name"].lower() == new_b["name"].lower()), None)
                if match:
                    match["price"] = new_b["price"]
                    match["stock"] = new_b["stock"]
                else:
                    existing_brands.append({"id": str(uuid.uuid4()), **new_b})
            update_data = {
                "category": payload["category"],
                "unit": payload["unit"],
                "description": payload["description"] or existing.get("description", ""),
                "image_url": payload["image_url"] or existing.get("image_url", ""),
                "brands": existing_brands,
            }
            await db.products.update_one({"id": existing["id"]}, {"$set": update_data})
            updated += 1
        else:
            product = Product(
                title=payload["title"],
                category=payload["category"],
                unit=payload["unit"],
                description=payload["description"],
                image_url=payload["image_url"],
                brands=[BrandOption(**b) for b in payload["brands"]],
            )
            await db.products.insert_one(product.model_dump())
            created += 1

    return {
        "created": created,
        "updated": updated,
        "total_rows": row_num - 1,
        "errors": errors,
    }


@api_router.get("/admin/products/csv-template")
async def csv_template(admin=Depends(get_current_admin)):
    """Return CSV template content for bulk import."""
    lines = [
        "title,category,unit,description,image_url,brand_name,brand_price,brand_stock",
        "OPC 53 Grade Cement,Cement Bags,Bag (50 Kg),Premium OPC 53 cement,,UltraTech,420,500",
        "OPC 53 Grade Cement,Cement Bags,Bag (50 Kg),Premium OPC 53 cement,,Ambuja Cement,410,380",
        "TMT Steel Rods - Fe500D,TMT Steel Rods,Ton,High-strength TMT bars,,Tata Tiscon,62500,45",
    ]
    return {"csv": "\n".join(lines) + "\n"}


# -----------------------------------------------------------------------------
# Public: UPI Info (active UPI for payment)
# -----------------------------------------------------------------------------
async def _compute_upi_totals():
    """Return dict {upi_id: total_amount_last_2days}."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "assigned_upi_id": {"$ne": ""}, "status": {"$ne": "Cancelled"}}},
        {"$group": {"_id": "$assigned_upi_id", "total": {"$sum": "$total_amount"}}},
    ]
    totals = {}
    async for row in db.orders.aggregate(pipeline):
        totals[row["_id"]] = row["total"]
    return totals


async def _pick_active_upi():
    """Pick active UPI using rotation logic."""
    upis = await db.upi_accounts.find({"enabled": True}, {"_id": 0}).sort("created_at", 1).to_list(100)
    if not upis:
        return None, {}
    totals = await _compute_upi_totals()

    # Manual override wins
    for u in upis:
        if u.get("manual_active"):
            return u, totals

    # Pick first UPI with usage below limit
    for u in upis:
        used = totals.get(u["upi_id"], 0)
        if used < u["limit_2day"]:
            return u, totals

    # All exhausted; return first anyway
    return upis[0], totals


@api_router.get("/upi/active")
async def get_active_upi():
    upi, totals = await _pick_active_upi()
    if not upi:
        return {"active": None, "usage_2day": 0, "limit_2day": 0}
    used = totals.get(upi["upi_id"], 0)
    return {
        "active": upi,
        "usage_2day": used,
        "limit_2day": upi["limit_2day"],
    }


# Admin: UPI CRUD
@api_router.get("/admin/upi", response_model=List[UpiAccount])
async def list_upi(admin=Depends(get_current_admin)):
    docs = await db.upi_accounts.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return docs


@api_router.get("/admin/upi/usage")
async def upi_usage(admin=Depends(get_current_admin)):
    upis = await db.upi_accounts.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    totals = await _compute_upi_totals()
    result = []
    for u in upis:
        used = totals.get(u["upi_id"], 0)
        result.append({**u, "usage_2day": used})
    return result


@api_router.post("/admin/upi", response_model=UpiAccount)
async def create_upi(payload: UpiCreate, admin=Depends(get_current_admin)):
    upi = UpiAccount(**payload.model_dump())
    await db.upi_accounts.insert_one(upi.model_dump())
    return upi


@api_router.patch("/admin/upi/{upi_id}", response_model=UpiAccount)
async def update_upi(upi_id: str, payload: UpiUpdate, admin=Depends(get_current_admin)):
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    # If setting manual_active=true, clear others
    if update_data.get("manual_active") is True:
        await db.upi_accounts.update_many({}, {"$set": {"manual_active": False}})
    result = await db.upi_accounts.update_one({"id": upi_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="UPI not found")
    doc = await db.upi_accounts.find_one({"id": upi_id}, {"_id": 0})
    return doc


@api_router.delete("/admin/upi/{upi_id}")
async def delete_upi(upi_id: str, admin=Depends(get_current_admin)):
    result = await db.upi_accounts.delete_one({"id": upi_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="UPI not found")
    return {"ok": True}


# -----------------------------------------------------------------------------
# Public: Orders
# -----------------------------------------------------------------------------
@api_router.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate):
    upi, _ = await _pick_active_upi()
    order = Order(
        **payload.model_dump(),
        assigned_upi_id=upi["upi_id"] if upi else "",
    )
    await db.orders.insert_one(order.model_dump())
    return order


# Admin: Orders
@api_router.get("/admin/orders", response_model=List[Order])
async def list_orders(admin=Depends(get_current_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.patch("/admin/orders/{order_id}", response_model=Order)
async def update_order_status(order_id: str, payload: OrderStatusUpdate, admin=Depends(get_current_admin)):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": payload.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return doc


@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, admin=Depends(get_current_admin)):
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Public: Meetings
# -----------------------------------------------------------------------------
@api_router.post("/meetings", response_model=Meeting)
async def create_meeting(payload: MeetingCreate):
    meeting = Meeting(**payload.model_dump())
    await db.meetings.insert_one(meeting.model_dump())
    return meeting


@api_router.get("/admin/meetings", response_model=List[Meeting])
async def list_meetings(admin=Depends(get_current_admin)):
    docs = await db.meetings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.patch("/admin/meetings/{meeting_id}", response_model=Meeting)
async def update_meeting_status(meeting_id: str, payload: MeetingStatusUpdate, admin=Depends(get_current_admin)):
    result = await db.meetings.update_one({"id": meeting_id}, {"$set": {"status": payload.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    doc = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return doc


@api_router.delete("/admin/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, admin=Depends(get_current_admin)):
    await db.meetings.delete_one({"id": meeting_id})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Public: Business info
# -----------------------------------------------------------------------------
@api_router.get("/business")
async def business_info():
    return {
        "name": os.environ.get("BUSINESS_NAME", "Sri Venkataramana Cement Traders"),
        "whatsapp": BUSINESS_WHATSAPP,
    }


@api_router.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "Pending"})
    meetings_count = await db.meetings.count_documents({})
    new_meetings = await db.meetings.count_documents({"status": "New"})
    upi_count = await db.upi_accounts.count_documents({"enabled": True})

    # Revenue last 30 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "status": {"$ne": "Cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    revenue = 0
    async for row in db.orders.aggregate(pipeline):
        revenue = row["total"]

    return {
        "products": products_count,
        "orders": orders_count,
        "pending_orders": pending_orders,
        "meetings": meetings_count,
        "new_meetings": new_meetings,
        "upi_accounts": upi_count,
        "revenue_30day": revenue,
    }


# -----------------------------------------------------------------------------
# Seeding
# -----------------------------------------------------------------------------
async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.admins.find_one({"email": email})
    if not existing:
        await db.admins.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "name": "Owner",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.admins.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def seed_data():
    if await db.upi_accounts.count_documents({}) == 0:
        for u in [
            {"upi_id": "srivenkataramana1@ybl", "holder_name": "Sri Venkataramana Traders - PhonePe", "limit_2day": 300000, "enabled": True},
            {"upi_id": "srivenkataramana2@icici", "holder_name": "Sri Venkataramana Traders - ICICI", "limit_2day": 300000, "enabled": True},
        ]:
            acc = UpiAccount(**u)
            await db.upi_accounts.insert_one(acc.model_dump())

    if await db.products.count_documents({}) == 0:
        defaults = [
            {
                "title": "OPC 53 Grade Cement",
                "category": "Cement Bags",
                "unit": "Bag (50 Kg)",
                "description": "Premium OPC 53 Grade cement for high-strength structural concrete work. Ideal for RCC, slabs, columns.",
                "image_url": "https://images.unsplash.com/photo-1563166423-482a8c14b2d6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "UltraTech", "price": 420.0, "stock": 500},
                    {"id": str(uuid.uuid4()), "name": "Ambuja Cement", "price": 410.0, "stock": 380},
                    {"id": str(uuid.uuid4()), "name": "Ramco Cement", "price": 395.0, "stock": 220},
                    {"id": str(uuid.uuid4()), "name": "Maha Cement", "price": 385.0, "stock": 640},
                ],
            },
            {
                "title": "PPC Cement",
                "category": "Cement Bags",
                "unit": "Bag (50 Kg)",
                "description": "Portland Pozzolana Cement — durable, better workability, ideal for plastering and masonry.",
                "image_url": "https://images.unsplash.com/photo-1621189914379-25b09149c5e6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "UltraTech", "price": 400.0, "stock": 320},
                    {"id": str(uuid.uuid4()), "name": "Ambuja Cement", "price": 390.0, "stock": 210},
                    {"id": str(uuid.uuid4()), "name": "Ramco Cement", "price": 375.0, "stock": 500},
                ],
            },
            {
                "title": "TMT Steel Rods - Fe500D",
                "category": "TMT Steel Rods",
                "unit": "Ton",
                "description": "High-strength TMT bars, earthquake resistant, superior bendability. Available 8mm-32mm.",
                "image_url": "https://images.unsplash.com/photo-1761479867761-7a8b11f54449?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "Tata Tiscon", "price": 62500.0, "stock": 45},
                    {"id": str(uuid.uuid4()), "name": "JSW Neosteel", "price": 60500.0, "stock": 62},
                    {"id": str(uuid.uuid4()), "name": "Vizag Steel", "price": 59500.0, "stock": 80},
                ],
            },
            {
                "title": "TMT Steel Rods - Fe550",
                "category": "TMT Steel Rods",
                "unit": "Ton",
                "description": "Fe550 grade TMT bars for heavy structural applications. High yield strength.",
                "image_url": "https://images.unsplash.com/photo-1530863506128-dc9eb5c3e0fc?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "Tata Tiscon", "price": 64500.0, "stock": 30},
                    {"id": str(uuid.uuid4()), "name": "JSW Neosteel", "price": 62500.0, "stock": 48},
                ],
            },
            {
                "title": "River Sand",
                "category": "Sand & Aggregates",
                "unit": "Ton",
                "description": "Clean, washed river sand for concrete and plastering work.",
                "image_url": "https://images.unsplash.com/photo-1615461476249-718ef8bc369c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "Standard Grade", "price": 1800.0, "stock": 200},
                    {"id": str(uuid.uuid4()), "name": "Premium Grade", "price": 2200.0, "stock": 150},
                ],
            },
            {
                "title": "20mm Blue Metal Aggregate",
                "category": "Sand & Aggregates",
                "unit": "Ton",
                "description": "Crushed 20mm blue metal aggregate for concrete mixing.",
                "image_url": "https://images.unsplash.com/photo-1621189914379-25b09149c5e6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "Standard Grade", "price": 1400.0, "stock": 300},
                ],
            },
            {
                "title": "GI Binding Wire",
                "category": "Binding Wire & Accessories",
                "unit": "KG",
                "description": "Galvanized iron binding wire (18 gauge) for tying TMT bars in RCC work.",
                "image_url": "https://images.unsplash.com/photo-1567521464027-f127ff144326?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                "brands": [
                    {"id": str(uuid.uuid4()), "name": "Standard", "price": 85.0, "stock": 500},
                    {"id": str(uuid.uuid4()), "name": "Premium GI", "price": 105.0, "stock": 250},
                ],
            },
        ]
        for d in defaults:
            p = Product(**d)
            await db.products.insert_one(p.model_dump())


# -----------------------------------------------------------------------------
# Register router & middleware
# -----------------------------------------------------------------------------
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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_admin()
    await seed_data()
    logger.info("Seeding complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
