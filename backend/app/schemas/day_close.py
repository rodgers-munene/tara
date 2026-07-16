from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


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
