from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Owner(SQLModel, table=True):
    __tablename__ = "owner"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    pin_hash: str
    active: bool = Field(default=True)
    plan: str = Field(default="free")  # "free" (trial), "small", "medium"
    billing_cycle: Optional[str] = Field(default=None)  # "weekly", "monthly", "yearly"
    subscription_status: str = Field(default="trialing")  # "trialing", "active", "expired"
    subscription_ends_at: Optional[datetime] = Field(default=None)
    trial_ends_at: Optional[datetime] = Field(default=None)
    email_verified: bool = Field(default=False)
    trial_warning_sent_at: Optional[datetime] = Field(default=None)
    subscription_warning_sent_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SuperAdmin(SQLModel, table=True):
    __tablename__ = "superadmin"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    pin_hash: str
    active: bool = Field(default=True)


class PasswordReset(SQLModel, table=True):
    __tablename__ = "password_reset"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="owner.id", index=True)
    token: str = Field(unique=True, index=True)
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EmailVerification(SQLModel, table=True):
    __tablename__ = "email_verification"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="owner.id", index=True)
    token: str = Field(unique=True, index=True)
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
