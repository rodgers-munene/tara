from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel


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
