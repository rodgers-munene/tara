from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Customer(SQLModel, table=True):
    __tablename__ = "customer"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    phone: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreditEntry(SQLModel, table=True):
    __tablename__ = "credit_entry"
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    amount: float  # positive = debt added, negative = payment made
    note: Optional[str] = Field(default=None)
    sale_id: Optional[int] = Field(default=None, foreign_key="sale.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
