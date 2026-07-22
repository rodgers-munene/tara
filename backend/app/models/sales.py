from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    receipt_number: str = Field(unique=True, index=True)
    total: float
    discount: float = Field(default=0.0)
    payment_method: str  # "cash", "mpesa", or "split"
    amount_paid: float
    change_given: float = Field(default=0.0)
    mpesa_ref: Optional[str] = Field(default=None)
    mpesa_phone: Optional[str] = Field(default=None)
    cash_amount: Optional[float] = Field(default=None)  # set only when payment_method == "split"
    mpesa_amount: Optional[float] = Field(default=None)  # set only when payment_method == "split"
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
    quantity: float
    unit_price: float
    subtotal: float
    sale: Optional[Sale] = Relationship(back_populates="items")


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
