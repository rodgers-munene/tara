from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


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
