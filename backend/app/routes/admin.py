import os
import re
import bcrypt
import jwt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import require_superadmin
from app.models import (
    Shop, ShopCreate, ShopRead, ShopUpdate,
    Staff, SuperAdmin, SuperAdminSetup, SuperAdminLogin,
)

SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/admin", tags=["admin"])


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


# ── Setup (one-time) ──────────────────────────────────────────────────────────

@router.post("/setup", status_code=201)
def setup_superadmin(data: SuperAdminSetup, session: Session = Depends(get_session)):
    """Create the first superadmin. Fails if one already exists."""
    existing = session.exec(select(SuperAdmin)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Superadmin already exists")
    pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    admin = SuperAdmin(name=data.name, email=data.email.lower(), pin_hash=pin_hash)
    session.add(admin)
    session.commit()
    return {"message": "Superadmin created"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login/")
def admin_login(data: SuperAdminLogin, session: Session = Depends(get_session)):
    admin = session.exec(
        select(SuperAdmin).where(SuperAdmin.email == data.email.lower())
    ).first()
    if not admin or not admin.active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(data.pin.encode(), admin.pin_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode(
        {"sub": str(admin.id), "name": admin.name, "superadmin": True},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer", "name": admin.name}


# ── Shops CRUD ────────────────────────────────────────────────────────────────

@router.get("/shops/", response_model=list[ShopRead])
def list_shops(
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    return session.exec(select(Shop).order_by(Shop.created_at.desc())).all()


@router.post("/shops/", status_code=201)
def create_shop(
    data: ShopCreate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    base_slug = _slugify(data.name)
    slug = _unique_slug(base_slug, session)

    shop = Shop(
        name=data.name,
        slug=slug,
        email=data.email,
        phone=data.phone,
        plan=data.plan,
    )
    session.add(shop)
    session.flush()

    # Create the owner staff member for this shop
    pin_hash = bcrypt.hashpw(data.owner_pin.encode(), bcrypt.gensalt()).decode()
    owner = Staff(
        name=data.owner_name,
        pin_hash=pin_hash,
        role="owner",
        shop_id=shop.id,
    )
    session.add(owner)
    session.commit()
    session.refresh(shop)

    return {
        "id": shop.id,
        "name": shop.name,
        "slug": shop.slug,
        "email": shop.email,
        "phone": shop.phone,
        "plan": shop.plan,
        "active": shop.active,
        "created_at": shop.created_at.isoformat(),
        "owner_name": data.owner_name,
    }


@router.patch("/shops/{shop_id}", response_model=ShopRead)
def update_shop(
    shop_id: int,
    data: ShopUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    shop = session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(shop, key, value)
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return shop


# ── Platform stats ────────────────────────────────────────────────────────────

@router.get("/stats")
def platform_stats(
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    from app.models import Sale
    shops = session.exec(select(Shop)).all()
    total_shops = len(shops)
    active_shops = sum(1 for s in shops if s.active)
    pro_shops = sum(1 for s in shops if s.plan == "pro")
    total_sales = len(session.exec(select(Sale)).all())
    return {
        "total_shops": total_shops,
        "active_shops": active_shops,
        "pro_shops": pro_shops,
        "total_sales": total_sales,
    }
