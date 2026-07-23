from typing import Optional
from sqlmodel import SQLModel


class CategoryRead(SQLModel):
    id: int
    name: str
    color: Optional[str] = None


class CategoryCreate(SQLModel):
    name: str
    color: Optional[str] = None


class ProductRead(SQLModel):
    id: int
    name: str
    price: float
    buying_price: float = 0.0
    stock: float
    min_stock: float = 5
    pricing_mode: str = "unit"
    unit_label: Optional[str] = None
    track_stock: bool = True
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: bool


class ProductCreate(SQLModel):
    name: str
    price: float
    buying_price: float = 0.0
    stock: float = 0
    min_stock: float = 5
    pricing_mode: str = "unit"
    unit_label: Optional[str] = None
    track_stock: bool = True
    barcode: Optional[str] = None
    category_id: Optional[int] = None


class StockAdjust(SQLModel):
    delta: float  # positive to add stock, negative to remove


class BulkImportResult(SQLModel):
    needs_mapping: bool = False
    headers: Optional[list[str]] = None
    suggested_map: Optional[dict[str, Optional[str]]] = None
    created: int = 0
    skipped: int = 0
    errors: list[str] = []


class ProductUpdate(SQLModel):
    name: Optional[str] = None
    price: Optional[float] = None
    buying_price: Optional[float] = None
    stock: Optional[float] = None
    min_stock: Optional[float] = None
    pricing_mode: Optional[str] = None
    unit_label: Optional[str] = None
    track_stock: Optional[bool] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: Optional[bool] = None
