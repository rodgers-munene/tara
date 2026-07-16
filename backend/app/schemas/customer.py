from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class CustomerCreate(SQLModel):
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(SQLModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


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
