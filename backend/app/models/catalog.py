from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    color: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    products: List["Product"] = Relationship(back_populates="category")


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    price: float
    buying_price: float = Field(default=0.0)
    stock: float = Field(default=0)
    min_stock: float = Field(default=5)
    pricing_mode: str = Field(default="unit")  # "unit" or "weight"
    unit_label: Optional[str] = Field(default=None)
    track_stock: bool = Field(default=True)
    barcode: Optional[str] = Field(default=None, index=True)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    active: bool = Field(default=True)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    category: Optional[Category] = Relationship(back_populates="products")
