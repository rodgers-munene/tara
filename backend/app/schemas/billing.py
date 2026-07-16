from sqlmodel import SQLModel


class CheckoutRequest(SQLModel):
    tier: str
    cycle: str
