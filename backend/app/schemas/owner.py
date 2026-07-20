from datetime import datetime
from sqlmodel import SQLModel


class OwnerCreate(SQLModel):
    name: str
    email: str
    pin: str


class OwnerRead(SQLModel):
    id: int
    name: str
    email: str
    active: bool
    created_at: datetime


class OwnerLogin(SQLModel):
    email: str
    pin: str


class OwnerSelfUpdate(SQLModel):
    name: str | None = None
    email: str | None = None
    pin: str | None = None


class ForgotPasswordRequest(SQLModel):
    email: str


class ResetPasswordRequest(SQLModel):
    token: str
    pin: str


class VerifyEmailRequest(SQLModel):
    token: str


class ResendVerificationRequest(SQLModel):
    email: str


class SuperAdminSetup(SQLModel):
    name: str
    email: str
    pin: str


class SuperAdminLogin(SQLModel):
    email: str
    pin: str
