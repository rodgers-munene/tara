from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


# ── Shop ─────────────────────────────────────────────────────────────────────

class Shop(SQLModel, table=True):
    __tablename__ = "shop"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    plan: str = Field(default="free")  # "free", "pro"
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShopRead(SQLModel):
    id: int
    name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    plan: str
    active: bool
    created_at: datetime


class ShopCreate(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    plan: str = "free"
    owner_name: str
    owner_pin: str


class ShopUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    plan: Optional[str] = None
    active: Optional[bool] = None


# ── SuperAdmin ────────────────────────────────────────────────────────────────

class SuperAdmin(SQLModel, table=True):
    __tablename__ = "superadmin"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    pin_hash: str
    active: bool = Field(default=True)


class SuperAdminSetup(SQLModel):
    name: str
    email: str
    pin: str


class SuperAdminLogin(SQLModel):
    email: str
    pin: str


# ── Staff ────────────────────────────────────────────────────────────────────

class Staff(SQLModel, table=True):
    __tablename__ = "staff"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    pin_hash: str
    role: str = Field(default="cashier")  # "owner" or "cashier"
    active: bool = Field(default=True)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)


class StaffRead(SQLModel):
    id: int
    name: str
    role: str


class StaffCreate(SQLModel):
    name: str
    pin: str
    role: str = "cashier"


class LoginRequest(SQLModel):
    staff_id: int
    pin: str


class LoginResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    id: int
    name: str
    role: str
    shop_id: Optional[int] = None


# ── Category ─────────────────────────────────────────────────────────────────

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    color: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    products: List["Product"] = Relationship(back_populates="category")


class CategoryRead(SQLModel):
    id: int
    name: str
    color: Optional[str] = None


class CategoryCreate(SQLModel):
    name: str
    color: Optional[str] = None


# ── Product ───────────────────────────────────────────────────────────────────

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    price: float
    stock: int = Field(default=0)
    barcode: Optional[str] = Field(default=None, index=True)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    active: bool = Field(default=True)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    category: Optional[Category] = Relationship(back_populates="products")


class ProductRead(SQLModel):
    id: int
    name: str
    price: float
    stock: int
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: bool


class ProductCreate(SQLModel):
    name: str
    price: float
    stock: int = 0
    barcode: Optional[str] = None
    category_id: Optional[int] = None


class ProductUpdate(SQLModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: Optional[bool] = None


# ── Sale ──────────────────────────────────────────────────────────────────────

class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    receipt_number: str = Field(unique=True, index=True)
    total: float
    discount: float = Field(default=0.0)
    payment_method: str  # "cash" or "mpesa"
    amount_paid: float
    change_given: float = Field(default=0.0)
    mpesa_ref: Optional[str] = Field(default=None)
    mpesa_phone: Optional[str] = Field(default=None)
    cashier_id: Optional[int] = Field(default=None, foreign_key="staff.id")
    cashier_name: Optional[str] = Field(default=None)
    is_returned: bool = Field(default=False)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    items: List["SaleItem"] = Relationship(back_populates="sale")


class SaleItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sale.id")
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    sale: Optional[Sale] = Relationship(back_populates="items")


class SaleItemCreate(SQLModel):
    product_id: int
    quantity: int


class SaleItemRead(SQLModel):
    id: int
    product_id: Optional[int]
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float


class SaleCreate(SQLModel):
    items: List[SaleItemCreate]
    payment_method: str
    amount_paid: float
    discount: float = 0.0
    mpesa_ref: Optional[str] = None
    mpesa_phone: Optional[str] = None


class SaleRead(SQLModel):
    id: int
    receipt_number: str
    total: float
    discount: float = 0.0
    payment_method: str
    amount_paid: float
    change_given: float
    mpesa_ref: Optional[str] = None
    mpesa_phone: Optional[str] = None
    cashier_name: Optional[str] = None
    is_returned: bool = False
    created_at: datetime
    items: List[SaleItemRead] = []


# ── Customer / Mkopo ──────────────────────────────────────────────────────────

class Customer(SQLModel, table=True):
    __tablename__ = "customer"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    phone: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CustomerCreate(SQLModel):
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(SQLModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class CreditEntry(SQLModel, table=True):
    __tablename__ = "credit_entry"
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    amount: float  # positive = debt added, negative = payment made
    note: Optional[str] = Field(default=None)
    sale_id: Optional[int] = Field(default=None, foreign_key="sale.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreditEntryRead(SQLModel):
    id: int
    customer_id: int
    amount: float
    note: Optional[str] = None
    sale_id: Optional[int] = None
    created_at: datetime


class CreditEntryCreate(SQLModel):
    amount: float
    note: Optional[str] = None
    sale_id: Optional[int] = None


# ── Day Close ─────────────────────────────────────────────────────────────────

class DayClose(SQLModel, table=True):
    __tablename__ = "day_close"
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str = Field(index=True)  # YYYY-MM-DD
    opening_cash: float = Field(default=0.0)
    closing_cash: float = Field(default=0.0)
    total_cash_sales: float = Field(default=0.0)
    total_mpesa_sales: float = Field(default=0.0)
    total_sales: float = Field(default=0.0)
    sale_count: int = Field(default=0)
    notes: Optional[str] = Field(default=None)
    closed_by: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DayCloseRead(SQLModel):
    id: int
    date: str
    opening_cash: float
    closing_cash: float
    total_cash_sales: float
    total_mpesa_sales: float
    total_sales: float
    sale_count: int
    notes: Optional[str] = None
    closed_by: Optional[str] = None
    created_at: datetime


class DayCloseCreate(SQLModel):
    date: str
    opening_cash: float = 0.0
    closing_cash: float = 0.0
    notes: Optional[str] = None


# ── Sale Return ───────────────────────────────────────────────────────────────

class SaleReturn(SQLModel, table=True):
    __tablename__ = "sale_return"
    id: Optional[int] = Field(default=None, primary_key=True)
    return_number: str = Field(unique=True, index=True)
    sale_id: int = Field(foreign_key="sale.id", index=True)
    total_refunded: float
    reason: Optional[str] = Field(default=None)
    processed_by: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SaleReturnCreate(SQLModel):
    sale_id: int
    reason: Optional[str] = None


class SaleReturnRead(SQLModel):
    id: int
    return_number: str
    sale_id: int
    total_refunded: float
    reason: Optional[str] = None
    processed_by: Optional[str] = None
    created_at: datetime
