from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Customer, CreditEntry
from app.schemas import CustomerCreate, CustomerUpdate, CreditEntryRead, CreditEntryCreate


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/")
def list_customers(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    customers = session.exec(
        select(Customer).where(Customer.shop_id == shop_id).order_by(Customer.name)
    ).all()
    result = []
    for c in customers:
        entries = session.exec(
            select(CreditEntry).where(CreditEntry.customer_id == c.id)
        ).all()
        balance = round(sum(e.amount for e in entries), 2)
        result.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "notes": c.notes,
            "balance": balance,
            "created_at": c.created_at.isoformat(),
        })
    return result


@router.post("/", status_code=201)
def create_customer(
    data: CustomerCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    customer = Customer(
        name=data.name.strip(),
        phone=data.phone,
        notes=data.notes,
        shop_id=current_user.get("shop_id"),
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "notes": customer.notes,
        "balance": 0.0,
        "created_at": customer.created_at.isoformat(),
    }


@router.patch("/{customer_id}", status_code=200)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    customer = session.get(Customer, customer_id)
    if not customer or customer.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Customer not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(customer, key, value)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    entries = session.exec(
        select(CreditEntry).where(CreditEntry.customer_id == customer_id)
    ).all()
    balance = round(sum(e.amount for e in entries), 2)
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "notes": customer.notes,
        "balance": balance,
        "created_at": customer.created_at.isoformat(),
    }


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    customer = session.get(Customer, customer_id)
    if not customer or customer.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Customer not found")
    entries = session.exec(
        select(CreditEntry).where(CreditEntry.customer_id == customer_id)
    ).all()
    for e in entries:
        session.delete(e)
    session.delete(customer)
    session.commit()


@router.get("/{customer_id}/entries", response_model=list[CreditEntryRead])
def list_entries(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    customer = session.get(Customer, customer_id)
    if not customer or customer.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Customer not found")
    return session.exec(
        select(CreditEntry)
        .where(CreditEntry.customer_id == customer_id)
        .order_by(CreditEntry.created_at.desc())
    ).all()


@router.post("/{customer_id}/entries", response_model=CreditEntryRead, status_code=201)
def add_entry(
    customer_id: int,
    data: CreditEntryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    customer = session.get(Customer, customer_id)
    if not customer or customer.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Customer not found")
    entry = CreditEntry(
        customer_id=customer_id,
        amount=data.amount,
        note=data.note,
        sale_id=data.sale_id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
