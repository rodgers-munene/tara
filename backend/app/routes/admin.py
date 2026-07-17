import os
import bcrypt
import jwt
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import require_superadmin
from app.models import Shop, SuperAdmin, Owner
from app.schemas import ShopUpdate, SuperAdminSetup, SuperAdminLogin, OwnerCreate
from app.pricing import PRICING_KES, activate_subscription


SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/admin", tags=["admin"])


def _shop_dict(shop: Shop, owner: Owner | None) -> dict:
    """Subscription lives on the owner account now, so it's merged onto each of
    their shops here for a response shape that matches what the frontend expects."""
    return {
        "id": shop.id,
        "name": shop.name,
        "slug": shop.slug,
        "email": shop.email,
        "phone": shop.phone,
        "active": shop.active,
        "owner_id": shop.owner_id,
        "plan": owner.plan if owner else "free",
        "billing_cycle": owner.billing_cycle if owner else None,
        "trial_ends_at": owner.trial_ends_at.isoformat() if owner and owner.trial_ends_at else None,
        "subscription_status": owner.subscription_status if owner else "trialing",
        "subscription_ends_at": owner.subscription_ends_at.isoformat() if owner and owner.subscription_ends_at else None,
        "created_at": shop.created_at.isoformat(),
    }


# Setup (one-time)

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


#  Auth

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


# Shops CRUD

@router.get("/shops/")
def list_shops(
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    shops = session.exec(select(Shop).order_by(Shop.created_at.desc())).all()
    owner_ids = {s.owner_id for s in shops if s.owner_id is not None}
    owners = {o.id: o for o in session.exec(select(Owner)).all() if o.id in owner_ids}
    return [_shop_dict(shop, owners.get(shop.owner_id)) for shop in shops]


@router.patch("/shops/{shop_id}")
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
    owner = session.get(Owner, shop.owner_id) if shop.owner_id else None
    return _shop_dict(shop, owner)


# ── Owner management ──────────────────────────────────────────────────────────

@router.post("/owners/", status_code=201)
def create_owner(
    data: OwnerCreate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    existing = session.exec(select(Owner).where(Owner.email == data.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    owner = Owner(
        name=data.name,
        email=data.email.lower(),
        pin_hash=pin_hash,
        subscription_status="trialing",
        trial_ends_at=datetime.utcnow() + timedelta(days=7),
    )
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return _owner_dict(owner, shop_count=0)


def _owner_dict(owner: Owner, shop_count: int) -> dict:
    return {
        "id": owner.id,
        "name": owner.name,
        "email": owner.email,
        "active": owner.active,
        "shop_count": shop_count,
        "plan": owner.plan,
        "billing_cycle": owner.billing_cycle,
        "trial_ends_at": owner.trial_ends_at.isoformat() if owner.trial_ends_at else None,
        "subscription_status": owner.subscription_status,
        "subscription_ends_at": owner.subscription_ends_at.isoformat() if owner.subscription_ends_at else None,
        "created_at": owner.created_at.isoformat(),
    }


@router.get("/owners/")
def list_owners(
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    owners = session.exec(select(Owner).order_by(Owner.created_at.desc())).all()
    result = []
    for owner in owners:
        shop_count = len(session.exec(select(Shop).where(Shop.owner_id == owner.id)).all())
        result.append(_owner_dict(owner, shop_count))
    return result


@router.patch("/owners/{owner_id}")
def update_owner(
    owner_id: int,
    data: dict,
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    owner = session.get(Owner, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if "active" in data:
        owner.active = data["active"]
    if "name" in data:
        owner.name = data["name"]
    if "subscription_status" in data:
        owner.subscription_status = data["subscription_status"]
    session.add(owner)
    session.commit()
    session.refresh(owner)
    shop_count = len(session.exec(select(Shop).where(Shop.owner_id == owner.id)).all())
    return _owner_dict(owner, shop_count)


@router.post("/owners/{owner_id}/activate")
def activate_owner_subscription(
    owner_id: int,
    data: dict,
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    """Manual override for payments confirmed outside the automated Paystack flow
    (e.g. the webhook hasn't fired yet, or payment was arranged directly with the
    owner). Reuses the same activation math as the real Paystack path so both ways
    of paying compute expiry identically. Activates the whole account — every store
    under this owner is covered by the one subscription."""
    owner = session.get(Owner, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    tier = data.get("tier")
    cycle = data.get("cycle")
    if (tier, cycle) not in PRICING_KES:
        raise HTTPException(status_code=400, detail="Invalid plan/billing cycle combination")
    activate_subscription(session, owner_id, tier, cycle)
    session.refresh(owner)
    shop_count = len(session.exec(select(Shop).where(Shop.owner_id == owner.id)).all())
    return _owner_dict(owner, shop_count)


# ── Platform stats ────────────────────────────────────────────────────────────

@router.get("/stats")
def platform_stats(
    session: Session = Depends(get_session),
    _: dict = Depends(require_superadmin),
):
    from app.models import Sale
    owners = session.exec(select(Owner)).all()
    shops = session.exec(select(Shop)).all()
    sales = session.exec(select(Sale).where(Sale.is_returned == False)).all()
    total_revenue = round(sum(s.total for s in sales), 2)

    today = date.today()
    chart_start = today - timedelta(days=13)

    signups_chart = []
    revenue_chart = []
    for i in range(14):
        d = chart_start + timedelta(days=i)
        day_owners = [o for o in owners if o.created_at.date() == d]
        day_sales = [s for s in sales if s.created_at.date() == d]
        label = {"date": d.isoformat(), "day": d.strftime("%a %d")}
        signups_chart.append({**label, "count": len(day_owners)})
        revenue_chart.append({**label, "total": round(sum(s.total for s in day_sales), 2)})

    plan_order = ["free", "small", "medium"]
    plan_counts: dict[str, int] = {p: 0 for p in plan_order}
    for o in owners:
        plan_counts[o.plan] = plan_counts.get(o.plan, 0) + 1
    plan_breakdown = [{"plan": p, "count": plan_counts[p]} for p in plan_counts]

    status_order = ["trialing", "active", "expired"]
    status_counts: dict[str, int] = {s: 0 for s in status_order}
    for o in owners:
        status_counts[o.subscription_status] = status_counts.get(o.subscription_status, 0) + 1
    status_breakdown = [{"status": s, "count": status_counts[s]} for s in status_counts]

    return {
        "total_owners": len(owners),
        "active_owners": sum(1 for o in owners if o.active),
        "total_shops": len(shops),
        "total_sales": len(sales),
        "total_revenue": total_revenue,
        "signups_chart": signups_chart,
        "revenue_chart": revenue_chart,
        "plan_breakdown": plan_breakdown,
        "status_breakdown": status_breakdown,
    }
