from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Shop(SQLModel, table=True):
    __tablename__ = "shop"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    active: bool = Field(default=True)
    owner_id: Optional[int] = Field(default=None, foreign_key="owner.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
