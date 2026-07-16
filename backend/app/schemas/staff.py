from typing import Optional
from sqlmodel import SQLModel


class StaffRead(SQLModel):
    id: int
    name: str
    role: str


class StaffCreate(SQLModel):
    name: str
    pin: str
    role: str = "cashier"


class StaffPinReset(SQLModel):
    pin: str


class LoginRequest(SQLModel):
    staff_id: int
    pin: str


class LoginResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    id: int
    name: str
    role: str
    shop_id: Optional[int] = None
