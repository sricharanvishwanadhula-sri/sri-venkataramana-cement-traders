from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import csv
import uuid
import string
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import jwt
import bcrypt
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Auth helpers
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
# Order-code generator (Crockford-ish base32, avoids I O 0 1)
# -----------------------------------------------------------------------------
_BASE32 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def gen_code(prefix: str, length: int = 8) -> str:
    return f"{prefix}-" + "".join(secrets.choice(_BASE32) for _ in range(length))


# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
CalcType = Literal["per_bag", "per_ton", "per_piece", "fixed", "disabled"]


class HamaliConfig(BaseModel):
    """Hamali (loading/unloading) fee configuration."""
    enabled: bool = False
    calc_type: CalcType = "disabled"
    rate: float = 0.0
    label: str = "Loading + unloading"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class BrandOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    stock: int
    wholesale_price: Optional[float] = None
    wholesale_min_qty: Optional[int] = None
    low_stock_threshold: int = 20


class BrandOptionPublic(BaseModel):
    """Public view of a brand — no wholesale, no threshold."""
    id: str
    name: str
    price: float
    stock: int


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    unit: str
    description: str = ""
    image_url: str = ""
    hsn_code: str = ""
    gst_rate: float = 0.0
    brands: List[BrandOption] = Field(default_factory=list)
    hamali: Optional[HamaliConfig] = None  # None => inherit from category
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProductCreate(BaseModel):
    title: str
    category: str
    unit: str
    description: str = ""
    image_url: str = ""
    hsn_code: str = ""
    gst_rate: float = 0.0
    brands: List[BrandOption] = Field(default_factory=list)
    hamali: Optional[HamaliConfig] = None


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    brands: Optional[List[BrandOption]] = None
    hamali: Optional[HamaliConfig] = None
    is_active: Optional[bool] = None


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    sort_order: int = 0
    is_active: bool = True
    hamali_default: HamaliConfig = Field(default_factory=HamaliConfig)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CategoryCreate(BaseModel):
    name: str
    hamali_default: HamaliConfig = Field(default_factory=HamaliConfig)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    hamali_default: Optional[HamaliConfig] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class UpiAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    upi_id: str
    holder_name: str
    limit_2day: float = 300000.0
    manual_active: Optional[bool] = None
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


class CartItemIn(BaseModel):
    product_id: str
    brand_id: str
    quantity: float


class OrderItemLine(BaseModel):
    product_id: str
    product_title: str
    brand_id: str
    brand_name: str
    hsn_code: str = ""
    gst_rate: float = 0.0
    unit: str
    quantity: float
    unit_price: float
    subtotal_ex_gst: float
    gst_amount: float
    hamali: HamaliConfig
    hamali_amount: float


class OrderPayment(BaseModel):
    verified: bool = False
    verified_at: str = ""
    utr_ref: str = ""
    screenshot_url: str = ""


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    notes: str = ""
    items: List[CartItemIn]
    advance_percent: int = 50  # 25 / 50 / 100


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_code: str = Field(default_factory=lambda: gen_code("SVCT"))
    customer_name: str
    customer_phone: str
    notes: str = ""
    items: List[OrderItemLine]
    subtotal_ex_gst: float
    hamali_total: float
    gst_total: float
    total_amount: float
    advance_percent: int = 50
    advance_amount: float
    balance_amount: float
    assigned_upi_id: str = ""
    payment: OrderPayment = Field(default_factory=OrderPayment)
    status: str = "PendingVerification"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    verified: Optional[bool] = None
    utr_ref: Optional[str] = None
    screenshot_url: Optional[str] = None


ALLOWED_STATUSES = {"PendingVerification", "AdvanceReceived", "ReadyForPickup", "Completed", "Cancelled"}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def strip_brand_public(b: dict) -> dict:
    return {
        "id": b["id"],
        "name": b["name"],
        "price": b["price"],
        "stock": b.get("stock", 0),
    }


def to_public_product(p: dict, category_map: dict) -> dict:
    """Strip admin-only fields and resolve hamali from category if needed."""
    hamali = p.get("hamali")
    if not hamali or not hamali.get("enabled"):
        # Inherit from category
        cat = category_map.get(p.get("category", ""))
        if cat and cat.get("hamali_default", {}).get("enabled"):
            hamali = cat["hamali_default"]
        else:
            hamali = {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}
    return {
        "id": p["id"],
        "title": p["title"],
        "category": p["category"],
        "unit": p["unit"],
        "description": p.get("description", ""),
        "image_url": p.get("image_url", ""),
        "hsn_code": p.get("hsn_code", ""),
        "gst_rate": p.get("gst_rate", 0.0),
        "brands": [strip_brand_public(b) for b in p.get("brands", [])],
        "hamali": hamali,
        "is_active": p.get("is_active", True),
    }


async def _get_settings() -> dict:
    doc = await db.settings.find_one({"key": "shop"}, {"_id": 0})
    if not doc:
        return {"apply_gst_on_hamali": False}
    return doc.get("value", {"apply_gst_on_hamali": False})


async def _get_category_map() -> dict:
    """Map category name -> category doc."""
    cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    return {c["name"]: c for c in cats}


def _calc_line_hamali(hamali: dict, quantity: float) -> float:
    if not hamali or not hamali.get("enabled"):
        return 0.0
    ct = hamali.get("calc_type", "disabled")
    rate = float(hamali.get("rate", 0.0))
    if ct == "fixed":
        return round(rate, 2)
    if ct in ("per_bag", "per_piece", "per_ton"):
        return round(rate * float(quantity), 2)
    return 0.0


def _resolve_product_hamali(product: dict, category_map: dict) -> dict:
    hamali = product.get("hamali")
    if hamali and hamali.get("enabled"):
        return hamali
    cat = category_map.get(product.get("category", ""))
    if cat and cat.get("hamali_default", {}).get("enabled"):
        return cat["hamali_default"]
    return {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}


async def _compute_cart(items: List[dict], settings: dict, category_map: dict):
    """Given a list of {product_id, brand_id, quantity}, compute line items + totals.

    Returns (lines, subtotal_ex_gst, hamali_total, gst_total, total_amount, insufficient).
    `insufficient` is a list of stock-shortage rows (empty if all ok).
    """
    lines: List[dict] = []
    insufficient: List[dict] = []
    subtotal_ex_gst = 0.0
    hamali_total = 0.0
    gst_total = 0.0

    apply_gst_on_hamali = settings.get("apply_gst_on_hamali", False)

    for it in items:
        prod = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product not found: {it['product_id']}")
        brand = next((b for b in prod.get("brands", []) if b["id"] == it["brand_id"]), None)
        if not brand:
            raise HTTPException(status_code=404, detail=f"Brand not found for product {prod['title']}")
        qty = float(it["quantity"])
        if qty <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for {prod['title']}")
        if qty > brand["stock"]:
            insufficient.append({
                "product_id": prod["id"],
                "product_title": prod["title"],
                "brand_name": brand["name"],
                "requested": qty,
                "available": brand["stock"],
            })

        unit_price = float(brand["price"])
        line_subtotal = round(unit_price * qty, 2)
        gst_rate = float(prod.get("gst_rate", 0.0))
        hamali_cfg = _resolve_product_hamali(prod, category_map)
        line_hamali = _calc_line_hamali(hamali_cfg, qty)
        gst_base = line_subtotal + (line_hamali if apply_gst_on_hamali else 0.0)
        line_gst = round(gst_base * gst_rate / 100.0, 2)

        subtotal_ex_gst += line_subtotal
        hamali_total += line_hamali
        gst_total += line_gst

        lines.append({
            "product_id": prod["id"],
            "product_title": prod["title"],
            "brand_id": brand["id"],
            "brand_name": brand["name"],
            "hsn_code": prod.get("hsn_code", ""),
            "gst_rate": gst_rate,
            "unit": prod.get("unit", ""),
            "quantity": qty,
            "unit_price": unit_price,
            "subtotal_ex_gst": line_subtotal,
            "gst_amount": line_gst,
            "hamali": hamali_cfg,
            "hamali_amount": line_hamali,
        })

    subtotal_ex_gst = round(subtotal_ex_gst, 2)
    hamali_total = round(hamali_total, 2)
    gst_total = round(gst_total, 2)
    total_amount = round(subtotal_ex_gst + hamali_total + gst_total, 2)
    return lines, subtotal_ex_gst, hamali_total, gst_total, total_amount, insufficient


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
# Categories
# -----------------------------------------------------------------------------
@api_router.get("/categories")
async def list_categories_public():
    docs = await db.categories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return docs


@api_router.get("/admin/categories")
async def list_categories_admin(admin=Depends(get_current_admin)):
    docs = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return docs


@api_router.post("/admin/categories", response_model=Category)
async def create_category(payload: CategoryCreate, admin=Depends(get_current_admin)):
    slug = payload.name.lower().replace(" ", "-").replace("&", "and")
    cat = Category(name=payload.name, slug=slug, hamali_default=payload.hamali_default, sort_order=payload.sort_order)
    await db.categories.insert_one(cat.model_dump())
    return cat


@api_router.patch("/admin/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, payload: CategoryUpdate, admin=Depends(get_current_admin)):
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "name" in data:
        data["slug"] = data["name"].lower().replace(" ", "-").replace("&", "and")
    r = await db.categories.update_one({"id": cat_id}, {"$set": data})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"id": cat_id}, {"_id": 0})


@api_router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: str, admin=Depends(get_current_admin)):
    cat = await db.categories.find_one({"id": cat_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = await db.products.count_documents({"category": cat["name"], "is_active": True})
    if in_use > 0:
        # soft delete
        await db.categories.update_one({"id": cat_id}, {"$set": {"is_active": False}})
        return {"ok": True, "soft_deleted": True}
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Products
# -----------------------------------------------------------------------------
@api_router.get("/products")
async def list_products(category: Optional[str] = None):
    query = {"is_active": True}
    if category and category != "All":
        query["category"] = category
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    category_map = await _get_category_map()
    return [to_public_product(p, category_map) for p in docs]


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    category_map = await _get_category_map()
    return to_public_product(doc, category_map)


# Admin: Products
@api_router.get("/admin/products", response_model=List[Product])
async def admin_list_products(admin=Depends(get_current_admin)):
    docs = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/admin/products", response_model=Product)
async def create_product(payload: ProductCreate, admin=Depends(get_current_admin)):
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api_router.patch("/admin/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductUpdate, admin=Depends(get_current_admin)):
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if "brands" in update_data and update_data["brands"] is not None:
        for b in update_data["brands"]:
            if not b.get("id"):
                b["id"] = str(uuid.uuid4())
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin=Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api_router.post("/admin/products/bulk-csv")
async def bulk_import_csv(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")
    raw = (await file.read(5 * 1024 * 1024)).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))

    def norm(row):
        return {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}

    grouped: dict = {}
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
            hamali_calc = (r.get("hamali_calc_type") or "").lower()
            hamali_obj = None
            if hamali_calc and hamali_calc != "inherit":
                if hamali_calc == "disabled":
                    hamali_obj = {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}
                elif hamali_calc in ("per_bag", "per_ton", "per_piece", "fixed"):
                    try:
                        h_rate = float(r.get("hamali_rate", "0") or 0)
                    except ValueError:
                        h_rate = 0.0
                    hamali_obj = {
                        "enabled": True,
                        "calc_type": hamali_calc,
                        "rate": h_rate,
                        "label": r.get("hamali_label", "Loading + unloading") or "Loading + unloading",
                    }
            grouped[key] = {
                "title": title,
                "category": r.get("category", "Other") or "Other",
                "unit": r.get("unit", "Piece") or "Piece",
                "description": r.get("description", ""),
                "image_url": r.get("image_url", ""),
                "hsn_code": r.get("hsn_code", ""),
                "gst_rate": float(r.get("gst_rate", "0") or 0),
                "brands": [],
                "hamali": hamali_obj,
            }
        grouped[key]["brands"].append({"name": brand_name, "price": price, "stock": stock})

    created = 0
    updated = 0
    for _, payload in grouped.items():
        existing = await db.products.find_one({"title": payload["title"]}, {"_id": 0})
        if existing:
            existing_brands = existing.get("brands", [])
            for new_b in payload["brands"]:
                match = next((b for b in existing_brands if b["name"].lower() == new_b["name"].lower()), None)
                if match:
                    match["price"] = new_b["price"]
                    match["stock"] = new_b["stock"]
                else:
                    existing_brands.append({"id": str(uuid.uuid4()), **new_b, "low_stock_threshold": 20})
            update_data = {
                "category": payload["category"],
                "unit": payload["unit"],
                "description": payload["description"] or existing.get("description", ""),
                "image_url": payload["image_url"] or existing.get("image_url", ""),
                "hsn_code": payload["hsn_code"] or existing.get("hsn_code", ""),
                "gst_rate": payload["gst_rate"] or existing.get("gst_rate", 0.0),
                "brands": existing_brands,
            }
            if payload["hamali"] is not None:
                update_data["hamali"] = payload["hamali"]
            await db.products.update_one({"id": existing["id"]}, {"$set": update_data})
            updated += 1
        else:
            product = Product(
                title=payload["title"],
                category=payload["category"],
                unit=payload["unit"],
                description=payload["description"],
                image_url=payload["image_url"],
                hsn_code=payload["hsn_code"],
                gst_rate=payload["gst_rate"],
                brands=[BrandOption(**b) for b in payload["brands"]],
                hamali=HamaliConfig(**payload["hamali"]) if payload["hamali"] else None,
            )
            await db.products.insert_one(product.model_dump())
            created += 1

    return {"created": created, "updated": updated, "total_rows": row_num - 1, "errors": errors}


@api_router.get("/admin/products/csv-template")
async def csv_template(admin=Depends(get_current_admin)):
    lines = [
        "title,category,unit,description,image_url,hsn_code,gst_rate,brand_name,brand_price,brand_stock,hamali_calc_type,hamali_rate,hamali_label",
        "OPC 53 Grade Cement,Cement Bags,Bag (50 Kg),Premium OPC 53,,25232910,28,UltraTech,420,500,per_bag,4,Loading + unloading",
        "OPC 53 Grade Cement,Cement Bags,Bag (50 Kg),Premium OPC 53,,25232910,28,Ambuja Cement,410,380,,,",
        "TMT Steel Rods - Fe500D,TMT Steel Rods,Ton,High-strength TMT bars,,72141000,18,Tata Tiscon,62500,45,per_ton,300,",
    ]
    return {"csv": "\n".join(lines) + "\n"}


# -----------------------------------------------------------------------------
# UPI
# -----------------------------------------------------------------------------
async def _compute_upi_totals():
    """Sum only VERIFIED advance receipts in last 2 days per UPI."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    pipeline = [
        {"$match": {
            "created_at": {"$gte": cutoff},
            "assigned_upi_id": {"$ne": ""},
            "status": {"$ne": "Cancelled"},
            "payment.verified": True,
        }},
        {"$group": {"_id": "$assigned_upi_id", "total": {"$sum": "$advance_amount"}}},
    ]
    totals = {}
    async for row in db.orders.aggregate(pipeline):
        totals[row["_id"]] = row["total"]
    return totals


async def _pick_active_upi():
    upis = await db.upi_accounts.find({"enabled": True}, {"_id": 0}).sort("created_at", 1).to_list(100)
    if not upis:
        return None, {}
    totals = await _compute_upi_totals()
    for u in upis:
        if u.get("manual_active"):
            return u, totals
    for u in upis:
        if totals.get(u["upi_id"], 0) < u["limit_2day"]:
            return u, totals
    return upis[0], totals


@api_router.get("/upi/active")
async def get_active_upi(amount: Optional[float] = None):
    upi, totals = await _pick_active_upi()
    if not upi:
        return {"active": None, "usage_2day": 0, "limit_2day": 0, "amount": amount}
    used = totals.get(upi["upi_id"], 0)
    return {"active": upi, "usage_2day": used, "limit_2day": upi["limit_2day"], "amount": amount}


@api_router.get("/admin/upi", response_model=List[UpiAccount])
async def list_upi(admin=Depends(get_current_admin)):
    return await db.upi_accounts.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)


@api_router.get("/admin/upi/usage")
async def upi_usage(admin=Depends(get_current_admin)):
    upis = await db.upi_accounts.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    totals = await _compute_upi_totals()
    return [{**u, "usage_2day": totals.get(u["upi_id"], 0)} for u in upis]


@api_router.post("/admin/upi", response_model=UpiAccount)
async def create_upi(payload: UpiCreate, admin=Depends(get_current_admin)):
    upi = UpiAccount(**payload.model_dump())
    await db.upi_accounts.insert_one(upi.model_dump())
    return upi


@api_router.patch("/admin/upi/{upi_id}", response_model=UpiAccount)
async def update_upi(upi_id: str, payload: UpiUpdate, admin=Depends(get_current_admin)):
    data = payload.model_dump(exclude_unset=True)
    if data.get("manual_active") is True:
        await db.upi_accounts.update_many({}, {"$set": {"manual_active": False}})
    r = await db.upi_accounts.update_one({"id": upi_id}, {"$set": data})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="UPI not found")
    return await db.upi_accounts.find_one({"id": upi_id}, {"_id": 0})


@api_router.delete("/admin/upi/{upi_id}")
async def delete_upi(upi_id: str, admin=Depends(get_current_admin)):
    r = await db.upi_accounts.delete_one({"id": upi_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="UPI not found")
    return {"ok": True}


# -----------------------------------------------------------------------------
# Cart quote (public helper)
# -----------------------------------------------------------------------------
class CartQuoteIn(BaseModel):
    items: List[CartItemIn]
    advance_percent: int = 50


@api_router.post("/cart/quote")
async def cart_quote(payload: CartQuoteIn):
    settings = await _get_settings()
    category_map = await _get_category_map()
    lines, subtotal, hamali_total, gst_total, total, insufficient = await _compute_cart(
        [i.model_dump() for i in payload.items], settings, category_map,
    )
    pct = max(0, min(100, int(payload.advance_percent)))
    advance = round(total * pct / 100.0, 2)
    balance = round(total - advance, 2)
    return {
        "lines": lines,
        "subtotal_ex_gst": subtotal,
        "hamali_total": hamali_total,
        "gst_total": gst_total,
        "total_amount": total,
        "advance_percent": pct,
        "advance_amount": advance,
        "balance_amount": balance,
        "insufficient": insufficient,
    }


# -----------------------------------------------------------------------------
# Orders (public create + track)
# -----------------------------------------------------------------------------
@api_router.post("/orders")
async def create_order(payload: OrderCreate):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    if payload.advance_percent not in (25, 50, 100):
        raise HTTPException(status_code=400, detail="Advance must be 25, 50 or 100")

    settings = await _get_settings()
    category_map = await _get_category_map()
    lines, subtotal, hamali_total, gst_total, total, insufficient = await _compute_cart(
        [i.model_dump() for i in payload.items], settings, category_map,
    )
    if insufficient:
        raise HTTPException(status_code=409, detail={"message": "Insufficient stock", "insufficient": insufficient})

    # Atomic stock decrement with compensating rollback on any failure.
    decremented: list = []
    for it in lines:
        r = await db.products.update_one(
            {
                "id": it["product_id"],
                "brands": {"$elemMatch": {"id": it["brand_id"], "stock": {"$gte": it["quantity"]}}},
            },
            {"$inc": {"brands.$.stock": -it["quantity"]}},
        )
        if r.modified_count == 0:
            # rollback
            for d in decremented:
                await db.products.update_one(
                    {"id": d["product_id"], "brands.id": d["brand_id"]},
                    {"$inc": {"brands.$.stock": d["quantity"]}},
                )
            raise HTTPException(status_code=409, detail=f"Stock changed for {it['product_title']} ({it['brand_name']}). Please refresh cart.")
        decremented.append(it)

    upi, _ = await _pick_active_upi()
    advance_amount = round(total * payload.advance_percent / 100.0, 2)
    balance_amount = round(total - advance_amount, 2)

    order = Order(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        notes=payload.notes,
        items=[OrderItemLine(**l) for l in lines],
        subtotal_ex_gst=subtotal,
        hamali_total=hamali_total,
        gst_total=gst_total,
        total_amount=total,
        advance_percent=payload.advance_percent,
        advance_amount=advance_amount,
        balance_amount=balance_amount,
        assigned_upi_id=upi["upi_id"] if upi else "",
    )
    await db.orders.insert_one(order.model_dump())

    # Build WhatsApp deeplink for owner-forward
    lines_txt = "\n".join([
        f"• {l['product_title']} ({l['brand_name']}) — {l['quantity']} {l['unit']} @ ₹{l['unit_price']}"
        for l in lines
    ])
    hamali_txt = f"Hamali: ₹{hamali_total:.2f}\n" if hamali_total > 0 else ""
    msg = (
        f"*New Order — Sri Venkataramana Cement Traders*\n\n"
        f"*Order:* {order.order_code}\n"
        f"*Customer:* {payload.customer_name}\n"
        f"*Phone:* {payload.customer_phone}\n\n"
        f"*Items:*\n{lines_txt}\n\n"
        f"Subtotal: ₹{subtotal:.2f}\n"
        f"{hamali_txt}"
        f"GST: ₹{gst_total:.2f}\n"
        f"*Total: ₹{total:.2f}*\n"
        f"*Advance ({payload.advance_percent}%): ₹{advance_amount:.2f}*\n"
        f"Balance at pickup: ₹{balance_amount:.2f}\n"
        f"UPI: {upi['upi_id'] if upi else 'N/A'}\n"
        f"{payload.notes and f'Notes: {payload.notes}' or ''}"
    )
    from urllib.parse import quote as urlq
    whatsapp_url = f"https://wa.me/{BUSINESS_WHATSAPP}?text={urlq(msg)}"

    return {
        "order": order.model_dump(),
        "whatsapp_url": whatsapp_url,
    }


@api_router.get("/orders/track")
async def track_orders(phone: str):
    if not phone or len(phone.strip()) < 5:
        raise HTTPException(status_code=400, detail="Phone required")
    p = phone.strip()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    docs = await db.orders.find(
        {"customer_phone": p, "created_at": {"$gte": cutoff}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return docs


@api_router.get("/orders/{order_code}")
async def get_order_public(order_code: str):
    doc = await db.orders.find_one({"order_code": order_code.upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc


# -----------------------------------------------------------------------------
# Admin: Orders
# -----------------------------------------------------------------------------
@api_router.get("/admin/orders", response_model=List[Order])
async def admin_list_orders(admin=Depends(get_current_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.patch("/admin/orders/{order_id}", response_model=Order)
async def admin_update_order(order_id: str, payload: OrderStatusUpdate, admin=Depends(get_current_admin)):
    update: dict = {}
    if payload.status is not None:
        if payload.status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        update["status"] = payload.status
    if payload.verified is not None:
        update["payment.verified"] = payload.verified
        update["payment.verified_at"] = datetime.now(timezone.utc).isoformat() if payload.verified else ""
        # Auto-flip status to AdvanceReceived on first verification if still Pending
        current = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if payload.verified and current and current.get("status") == "PendingVerification" and "status" not in update:
            update["status"] = "AdvanceReceived"
    if payload.utr_ref is not None:
        update["payment.utr_ref"] = payload.utr_ref
    if payload.screenshot_url is not None:
        update["payment.screenshot_url"] = payload.screenshot_url
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.orders.update_one({"id": order_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})


@api_router.delete("/admin/orders/{order_id}")
async def admin_delete_order(order_id: str, admin=Depends(get_current_admin)):
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Admin: Stats
# -----------------------------------------------------------------------------
@api_router.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    products_count = await db.products.count_documents({"is_active": True})
    orders_count = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "PendingVerification"})
    upi_count = await db.upi_accounts.count_documents({"enabled": True})
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "status": {"$ne": "Cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "advance": {"$sum": "$advance_amount"}}},
    ]
    revenue = 0.0
    advance_30d = 0.0
    async for row in db.orders.aggregate(pipeline):
        revenue = row.get("total", 0)
        advance_30d = row.get("advance", 0)
    return {
        "products": products_count,
        "orders": orders_count,
        "pending_orders": pending_orders,
        "upi_accounts": upi_count,
        "revenue_30day": revenue,
        "advance_30day": advance_30d,
    }


# -----------------------------------------------------------------------------
# Public: shop settings (safe subset)
# -----------------------------------------------------------------------------
@api_router.get("/settings/public")
async def public_settings():
    s = await _get_settings()
    return {
        "shop_name": s.get("shop_name", "Sri Venkataramana Cement Traders"),
        "address": s.get("address", "Andhra Pradesh, India"),
        "maps_url": s.get("maps_url", ""),
        "whatsapp": BUSINESS_WHATSAPP,
        "opening_hours": s.get("opening_hours", "Mon–Sat 8:00 AM – 8:00 PM"),
        "is_open": s.get("is_open", True),
        "default_advance_percent": s.get("default_advance_percent", 50),
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


async def seed_settings():
    if not await db.settings.find_one({"key": "shop"}):
        await db.settings.insert_one({
            "key": "shop",
            "value": {
                "shop_name": "Sri Venkataramana Cement Traders",
                "address": "Main Road, Andhra Pradesh, India",
                "maps_url": "",
                "whatsapp": BUSINESS_WHATSAPP,
                "opening_hours": "Mon–Sat 8:00 AM – 8:00 PM",
                "is_open": True,
                "default_advance_percent": 50,
                "default_low_stock": 20,
                "apply_gst_on_hamali": False,
            },
        })


async def seed_categories():
    if await db.categories.count_documents({}) > 0:
        return
    defaults = [
        {"name": "Cement Bags", "sort_order": 1,
         "hamali_default": {"enabled": True, "calc_type": "per_bag", "rate": 4.0, "label": "Loading + unloading"}},
        {"name": "TMT Steel Rods", "sort_order": 2,
         "hamali_default": {"enabled": True, "calc_type": "per_ton", "rate": 300.0, "label": "Loading + unloading"}},
        {"name": "Sand & Aggregates", "sort_order": 3,
         "hamali_default": {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}},
        {"name": "Binding Wire & Accessories", "sort_order": 4,
         "hamali_default": {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}},
        {"name": "Other", "sort_order": 99,
         "hamali_default": {"enabled": False, "calc_type": "disabled", "rate": 0.0, "label": ""}},
    ]
    for d in defaults:
        slug = d["name"].lower().replace(" ", "-").replace("&", "and")
        cat = Category(name=d["name"], slug=slug, sort_order=d["sort_order"],
                       hamali_default=HamaliConfig(**d["hamali_default"]))
        await db.categories.insert_one(cat.model_dump())


async def seed_products():
    if await db.upi_accounts.count_documents({}) == 0:
        for u in [
            {"upi_id": "srivenkataramana1@ybl", "holder_name": "Sri Venkataramana Traders - PhonePe", "limit_2day": 300000, "enabled": True},
            {"upi_id": "srivenkataramana2@icici", "holder_name": "Sri Venkataramana Traders - ICICI", "limit_2day": 300000, "enabled": True},
        ]:
            await db.upi_accounts.insert_one(UpiAccount(**u).model_dump())

    if await db.products.count_documents({}) > 0:
        return
    defaults = [
        {
            "title": "OPC 53 Grade Cement", "category": "Cement Bags", "unit": "Bag (50 Kg)",
            "description": "Premium OPC 53 Grade cement for high-strength structural concrete work.",
            "image_url": "https://images.unsplash.com/photo-1563166423-482a8c14b2d6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "25232910", "gst_rate": 28.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "UltraTech", "price": 420.0, "stock": 500, "low_stock_threshold": 50},
                {"id": str(uuid.uuid4()), "name": "Ambuja Cement", "price": 410.0, "stock": 380, "low_stock_threshold": 50},
                {"id": str(uuid.uuid4()), "name": "Ramco Cement", "price": 395.0, "stock": 220, "low_stock_threshold": 50},
                {"id": str(uuid.uuid4()), "name": "Maha Cement", "price": 385.0, "stock": 640, "low_stock_threshold": 50},
            ],
        },
        {
            "title": "PPC Cement", "category": "Cement Bags", "unit": "Bag (50 Kg)",
            "description": "Portland Pozzolana Cement — durable, ideal for plastering and masonry.",
            "image_url": "https://images.unsplash.com/photo-1621189914379-25b09149c5e6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "25232910", "gst_rate": 28.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "UltraTech", "price": 400.0, "stock": 320},
                {"id": str(uuid.uuid4()), "name": "Ambuja Cement", "price": 390.0, "stock": 210},
                {"id": str(uuid.uuid4()), "name": "Ramco Cement", "price": 375.0, "stock": 500},
            ],
        },
        {
            "title": "TMT Steel Rods - Fe500D", "category": "TMT Steel Rods", "unit": "Ton",
            "description": "High-strength TMT bars, earthquake resistant, superior bendability. 8mm–32mm.",
            "image_url": "https://images.unsplash.com/photo-1761479867761-7a8b11f54449?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "72141000", "gst_rate": 18.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "Tata Tiscon", "price": 62500.0, "stock": 45},
                {"id": str(uuid.uuid4()), "name": "JSW Neosteel", "price": 60500.0, "stock": 62},
                {"id": str(uuid.uuid4()), "name": "Vizag Steel", "price": 59500.0, "stock": 80},
            ],
        },
        {
            "title": "TMT Steel Rods - Fe550", "category": "TMT Steel Rods", "unit": "Ton",
            "description": "Fe550 grade TMT bars for heavy structural applications.",
            "image_url": "https://images.unsplash.com/photo-1530863506128-dc9eb5c3e0fc?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "72141000", "gst_rate": 18.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "Tata Tiscon", "price": 64500.0, "stock": 30},
                {"id": str(uuid.uuid4()), "name": "JSW Neosteel", "price": 62500.0, "stock": 48},
            ],
        },
        {
            "title": "River Sand", "category": "Sand & Aggregates", "unit": "Ton",
            "description": "Clean, washed river sand for concrete and plastering work.",
            "image_url": "https://images.unsplash.com/photo-1615461476249-718ef8bc369c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "25051019", "gst_rate": 5.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "Standard Grade", "price": 1800.0, "stock": 200},
                {"id": str(uuid.uuid4()), "name": "Premium Grade", "price": 2200.0, "stock": 150},
            ],
        },
        {
            "title": "20mm Blue Metal Aggregate", "category": "Sand & Aggregates", "unit": "Ton",
            "description": "Crushed 20mm blue metal aggregate for concrete mixing.",
            "image_url": "https://images.unsplash.com/photo-1621189914379-25b09149c5e6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "25171010", "gst_rate": 5.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "Standard Grade", "price": 1400.0, "stock": 300},
            ],
        },
        {
            "title": "GI Binding Wire", "category": "Binding Wire & Accessories", "unit": "KG",
            "description": "Galvanized iron binding wire (18 gauge) for tying TMT bars.",
            "image_url": "https://images.unsplash.com/photo-1567521464027-f127ff144326?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
            "hsn_code": "72172010", "gst_rate": 18.0,
            "brands": [
                {"id": str(uuid.uuid4()), "name": "Standard", "price": 85.0, "stock": 500},
                {"id": str(uuid.uuid4()), "name": "Premium GI", "price": 105.0, "stock": 250},
            ],
        },
    ]
    for d in defaults:
        p = Product(**d)
        await db.products.insert_one(p.model_dump())


async def create_indexes():
    try:
        await db.admins.create_index("email", unique=True)
        await db.products.create_index("category")
        await db.products.create_index("is_active")
        await db.orders.create_index("customer_phone")
        await db.orders.create_index("status")
        await db.orders.create_index("order_code", unique=True)
        await db.orders.create_index([("created_at", -1)])
        await db.categories.create_index("name", unique=True)
        await db.upi_accounts.create_index("enabled")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


# -----------------------------------------------------------------------------
# Router & middleware
# -----------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed_admin()
    await seed_settings()
    await seed_categories()
    await seed_products()
    await create_indexes()
    # Clean up legacy collections (best-effort)
    try:
        await db.meetings.drop()
    except Exception:
        pass
    try:
        await db.status_checks.drop()
    except Exception:
        pass
    logger.info("Startup: seeded admin/settings/categories/products/indexes complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
