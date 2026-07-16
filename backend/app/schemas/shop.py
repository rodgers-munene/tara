from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class ShopRead(SQLModel):
    id: int
    name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    active: bool
    created_at: datetime


class ShopCreate(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    owner_name: str
    owner_pin: str


class ShopUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
