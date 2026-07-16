import os
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Owner, Shop, Staff
from app.pricing import max_staff_for
from app.schemas import StaffCreate, StaffRead, LoginRequest, LoginResponse

SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(tags=["auth"])


@router.post("/staff/", response_model=StaffRead, status_code=201)
def create_staff(
    data: StaffCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Create staff — caller must be owner or higher. Scoped to caller's shop."""
    if current_user.get("role") not in ("owner",):
        raise HTTPException(status_code=403, detail="Only owners can add staff")
    shop_id = current_user.get("shop_id")

    shop = session.get(Shop, shop_id)
    owner = session.get(Owner, shop.owner_id) if shop and shop.owner_id else None
    if owner:
        owner_shop_ids = [s.id for s in session.exec(select(Shop).where(Shop.owner_id == owner.id)).all()]
        staff_count = len(session.exec(
            select(Staff).where(Staff.shop_id.in_(owner_shop_ids), Staff.active == True)
        ).all())
        limit = max_staff_for(owner)
        if staff_count >= limit:
            detail = f"Your {owner.plan} plan allows up to {limit} staff across all your stores. Upgrade to add more."
            raise HTTPException(status_code=403, detail=detail)

    pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    staff = Staff(name=data.name, pin_hash=pin_hash, role=data.role, shop_id=shop_id)
    session.add(staff)
    session.commit()
    session.refresh(staff)
    return staff


@router.post("/login/", response_model=LoginResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)):
    staff = session.get(Staff, data.staff_id)
    if not staff or not staff.active:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.checkpw(data.pin.encode(), staff.pin_hash.encode()):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    token = jwt.encode(
        {
            "sub": str(staff.id),
            "name": staff.name,
            "role": staff.role,
            "shop_id": staff.shop_id,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return LoginResponse(
        access_token=token,
        id=staff.id,
        name=staff.name,
        role=staff.role,
        shop_id=staff.shop_id,
    )


@router.delete("/staff/{staff_id}", status_code=204)
def deactivate_staff(
    staff_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("owner",):
        raise HTTPException(status_code=403, detail="Only owners can remove staff")
    staff = session.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="User not found")
    if staff.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=403, detail="Not your shop")
    staff.active = False
    session.add(staff)
    session.commit()
