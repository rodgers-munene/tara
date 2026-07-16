from typing import Optional
from sqlmodel import SQLModel, Field


class Staff(SQLModel, table=True):
    __tablename__ = "staff"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    pin_hash: str
    role: str = Field(default="cashier")  # "owner" or "cashier"
    active: bool = Field(default=True)
    shop_id: Optional[int] = Field(default=None, foreign_key="shop.id", index=True)
