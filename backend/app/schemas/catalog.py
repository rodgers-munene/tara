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
    stock: int
    min_stock: int = 5
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: bool


class ProductCreate(SQLModel):
    name: str
    price: float
    buying_price: float = 0.0
    stock: int = 0
    min_stock: int = 5
    barcode: Optional[str] = None
    category_id: Optional[int] = None


class ProductUpdate(SQLModel):
    name: Optional[str] = None
    price: Optional[float] = None
    buying_price: Optional[float] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    active: Optional[bool] = None
