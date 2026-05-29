import os
import re
import bcrypt
import jwt
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import require_owner
from app.models import (
    Owner, OwnerCreate, OwnerLogin,
    Shop, ShopCreate, ShopUpdate, ShopRead,
    Staff, StaffCreate,
    Sale,
)

SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/owner", tags=["owner"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "shop"


def _unique_slug(base: str, session: Session) -> str:
    slug = base
    n = 1
    while session.exec(select(Shop).where(Shop.slug == slug)).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/signup/", status_code=201)
def owner_signup(data: OwnerCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Owner).where(Owner.email == data.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    owner = Owner(name=data.name, email=data.email.lower(), pin_hash=pin_hash)
    session.add(owner)
    session.commit()
    session.refresh(owner)
    token = jwt.encode(
        {"sub": str(owner.id), "name": owner.name, "owner": True},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer", "name": owner.name}


@router.post("/login/")
def owner_login(data: OwnerLogin, session: Session = Depends(get_session)):
    owner = session.exec(
        select(Owner).where(Owner.email == data.email.lower())
    ).first()
    if not owner or not owner.active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(data.pin.encode(), owner.pin_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode(
        {"sub": str(owner.id), "name": owner.name, "owner": True},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer", "name": owner.name}


# ── Shops ─────────────────────────────────────────────────────────────────────

@router.get("/shops/")
def list_shops(
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shops = session.exec(select(Shop).where(Shop.owner_id == owner_id).order_by(Shop.created_at.desc())).all()
    today = date.today()
    week_ago = today - timedelta(days=6)
    result = []
    for shop in shops:
        staff_list = session.exec(
            select(Staff).where(Staff.shop_id == shop.id, Staff.active == True)
        ).all()
        all_sales = session.exec(
            select(Sale).where(Sale.shop_id == shop.id, Sale.is_returned == False)
        ).all()
        today_sales = [s for s in all_sales if s.created_at.date() == today]
        week_sales = [s for s in all_sales if s.created_at.date() >= week_ago]
        result.append({
            "id": shop.id,
            "name": shop.name,
            "slug": shop.slug,
            "plan": shop.plan,
            "active": shop.active,
            "staff_count": len(staff_list),
            "today_sales": len(today_sales),
            "today_revenue": round(sum(s.total for s in today_sales), 2),
            "week_revenue": round(sum(s.total for s in week_sales), 2),
            "total_sales": len(all_sales),
            "created_at": shop.created_at.isoformat(),
        })
    return result


@router.post("/shops/", status_code=201)
def create_shop(
    data: ShopCreate,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    base_slug = _slugify(data.name)
    slug = _unique_slug(base_slug, session)

    shop = Shop(
        name=data.name,
        slug=slug,
        email=data.email,
        phone=data.phone,
        plan=data.plan,
        owner_id=owner_id,
    )
    session.add(shop)
    session.flush()

    pin_hash = bcrypt.hashpw(data.owner_pin.encode(), bcrypt.gensalt()).decode()
    manager = Staff(
        name=data.owner_name,
        pin_hash=pin_hash,
        role="owner",
        shop_id=shop.id,
    )
    session.add(manager)
    session.commit()
    session.refresh(shop)
    session.refresh(manager)

    return {
        "id": shop.id,
        "name": shop.name,
        "slug": shop.slug,
        "plan": shop.plan,
        "active": shop.active,
        "staff_count": 1,
        "manager_id": manager.id,
        "created_at": shop.created_at.isoformat(),
    }


@router.patch("/shops/{shop_id}")
def update_shop(
    shop_id: int,
    data: ShopUpdate,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shop = session.get(Shop, shop_id)
    if not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(shop, key, value)
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return shop


# ── Staff management ──────────────────────────────────────────────────────────

@router.get("/shops/{shop_id}/staff")
def list_staff(
    shop_id: int,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shop = session.get(Shop, shop_id)
    if not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")
    staff = session.exec(
        select(Staff).where(Staff.shop_id == shop_id, Staff.active == True).order_by(Staff.id)
    ).all()
    return [{"id": s.id, "name": s.name, "role": s.role} for s in staff]


@router.post("/shops/{shop_id}/staff", status_code=201)
def add_staff(
    shop_id: int,
    data: StaffCreate,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shop = session.get(Shop, shop_id)
    if not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")
    pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    staff = Staff(name=data.name, pin_hash=pin_hash, role=data.role, shop_id=shop_id)
    session.add(staff)
    session.commit()
    session.refresh(staff)
    return {"id": staff.id, "name": staff.name, "role": staff.role}


@router.delete("/shops/{shop_id}/staff/{staff_id}", status_code=204)
def remove_staff(
    shop_id: int,
    staff_id: int,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shop = session.get(Shop, shop_id)
    if not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")
    staff = session.get(Staff, staff_id)
    if not staff or staff.shop_id != shop_id:
        raise HTTPException(status_code=404, detail="Staff not found")
    staff.active = False
    session.add(staff)
    session.commit()


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def owner_stats(
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    shops = session.exec(select(Shop).where(Shop.owner_id == owner_id)).all()
    shop_ids = [s.id for s in shops]

    total_staff = 0
    total_sales = 0
    for sid in shop_ids:
        total_staff += len(session.exec(
            select(Staff).where(Staff.shop_id == sid, Staff.active == True)
        ).all())
        total_sales += len(session.exec(
            select(Sale).where(Sale.shop_id == sid)
        ).all())

    return {
        "total_shops": len(shops),
        "active_shops": sum(1 for s in shops if s.active),
        "total_staff": total_staff,
        "total_sales": total_sales,
    }
