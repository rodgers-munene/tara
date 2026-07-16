import os
import re
import secrets
import bcrypt
import jwt
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import require_owner
from app.email import send_email
from app.models import Owner, PasswordReset, Shop, Staff, Sale, Product
from app.pricing import max_shops_for, max_staff_for, has_feature
from app.schemas import (
    OwnerCreate, OwnerLogin, OwnerSelfUpdate,
    ForgotPasswordRequest, ResetPasswordRequest,
    ShopCreate, ShopUpdate, StaffCreate,
)


SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tara-sigma.vercel.app")
RESET_TOKEN_TTL = timedelta(minutes=30)

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


def _subscription_fields(owner: Owner) -> dict:
    """Subscription lives on the owner account — every shop under them shows the
    same plan/status, since one bill covers the whole bundle of stores."""
    return {
        "plan": owner.plan,
        "billing_cycle": owner.billing_cycle,
        "trial_ends_at": owner.trial_ends_at.isoformat() if owner.trial_ends_at else None,
        "subscription_status": owner.subscription_status,
        "subscription_ends_at": owner.subscription_ends_at.isoformat() if owner.subscription_ends_at else None,
    }


# Auth
@router.post("/signup/", status_code=201)
def owner_signup(data: OwnerCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Owner).where(Owner.email == data.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
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


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, session: Session = Depends(get_session)):
    generic_response = {"message": "If an account exists for that email, a reset link has been sent."}

    owner = session.exec(select(Owner).where(Owner.email == data.email.lower())).first()
    if not owner or not owner.active:
        return generic_response  # don't leak whether the email is registered

    token = secrets.token_urlsafe(32)
    reset = PasswordReset(
        owner_id=owner.id,
        token=token,
        expires_at=datetime.utcnow() + RESET_TOKEN_TTL,
    )
    session.add(reset)
    session.commit()

    reset_link = f"{FRONTEND_URL}/owner/reset-password?token={token}"
    send_email(
        to=owner.email,
        subject="Reset your Tara POS PIN",
        html=(
            f"<p>Hi {owner.name},</p>"
            f"<p>Click the link below to reset your Tara POS PIN. This link expires in 30 minutes.</p>"
            f'<p><a href="{reset_link}">{reset_link}</a></p>'
            f"<p>If you didn't request this, you can ignore this email.</p>"
        ),
    )
    return generic_response


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, session: Session = Depends(get_session)):
    reset = session.exec(select(PasswordReset).where(PasswordReset.token == data.token)).first()
    if not reset or reset.used or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    if len(data.pin) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")

    owner = session.get(Owner, reset.owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    owner.pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()
    reset.used = True
    session.add(owner)
    session.add(reset)
    session.commit()
    return {"message": "Your PIN has been reset. You can now sign in."}


# Profile

@router.get("/me")
def get_me(session: Session = Depends(get_session), payload: dict = Depends(require_owner)):
    owner = session.get(Owner, int(payload["sub"]))
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return {"id": owner.id, "name": owner.name, "email": owner.email, "created_at": owner.created_at.isoformat()}


@router.patch("/me")
def update_me(data: OwnerSelfUpdate, session: Session = Depends(get_session), payload: dict = Depends(require_owner)):
    owner = session.get(Owner, int(payload["sub"]))
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    if data.email and data.email.lower() != owner.email:
        existing = session.exec(select(Owner).where(Owner.email == data.email.lower())).first()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        owner.email = data.email.lower()

    if data.name:
        owner.name = data.name

    if data.pin:
        if len(data.pin) < 4:
            raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
        owner.pin_hash = bcrypt.hashpw(data.pin.encode(), bcrypt.gensalt()).decode()

    session.add(owner)
    session.commit()
    session.refresh(owner)

    token = jwt.encode(
        {"sub": str(owner.id), "name": owner.name, "owner": True},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"id": owner.id, "name": owner.name, "email": owner.email, "access_token": token}


# Shops

@router.get("/shops/")
def list_shops(
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    shops = session.exec(select(Shop).where(Shop.owner_id == owner_id).order_by(Shop.created_at.desc())).all()
    today = date.today()
    week_ago = today - timedelta(days=6)
    owner_shop_ids = [s.id for s in shops]
    total_staff_count = len(session.exec(
        select(Staff).where(Staff.shop_id.in_(owner_shop_ids), Staff.active == True)
    ).all())
    max_staff = max_staff_for(owner)
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
            **_subscription_fields(owner),
            "active": shop.active,
            "staff_count": len(staff_list),
            "total_staff_count": total_staff_count,
            "max_staff": max_staff,
            "today_sales": len(today_sales),
            "today_revenue": round(sum(s.total for s in today_sales), 2),
            "week_revenue": round(sum(s.total for s in week_sales), 2),
            "total_sales": len(all_sales),
            "created_at": shop.created_at.isoformat(),
        })
    return result


@router.get("/shops/{shop_id}")
def get_shop(
    shop_id: int,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    shop = session.get(Shop, shop_id)
    if not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")

    staff_list = session.exec(
        select(Staff).where(Staff.shop_id == shop_id, Staff.active == True).order_by(Staff.id)
    ).all()
    owner_shop_ids = [s.id for s in session.exec(select(Shop).where(Shop.owner_id == owner_id)).all()]
    total_staff_count = len(session.exec(
        select(Staff).where(Staff.shop_id.in_(owner_shop_ids), Staff.active == True)
    ).all())
    all_sales = session.exec(
        select(Sale).where(Sale.shop_id == shop_id, Sale.is_returned == False)
    ).all()

    today = date.today()
    week_ago = today - timedelta(days=6)
    month_ago = today - timedelta(days=29)
    today_sales = [s for s in all_sales if s.created_at.date() == today]
    week_sales = [s for s in all_sales if s.created_at.date() >= week_ago]
    month_sales = [s for s in all_sales if s.created_at.date() >= month_ago]

    return {
        "id": shop.id,
        "name": shop.name,
        "slug": shop.slug,
        "email": shop.email,
        "phone": shop.phone,
        **_subscription_fields(owner),
        "active": shop.active,
        "created_at": shop.created_at.isoformat(),
        "staff": [{"id": s.id, "name": s.name, "role": s.role} for s in staff_list],
        "staff_count": len(staff_list),
        "total_staff_count": total_staff_count,
        "max_staff": max_staff_for(owner),
        "today_sales": len(today_sales),
        "today_revenue": round(sum(s.total for s in today_sales), 2),
        "week_sales": len(week_sales),
        "week_revenue": round(sum(s.total for s in week_sales), 2),
        "month_sales": len(month_sales),
        "month_revenue": round(sum(s.total for s in month_sales), 2),
        "total_sales": len(all_sales),
        "total_revenue": round(sum(s.total for s in all_sales), 2),
    }


@router.get("/shops/{shop_id}/analytics")
def get_shop_analytics(
    shop_id: int,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    shop = session.get(Shop, shop_id)
    if not owner or not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")

    kpi_unlocked = has_feature(owner, "kpi_tracking")

    today = date.today()
    chart_start = today - timedelta(days=13)
    month_ago = today - timedelta(days=29)

    all_sales = session.exec(select(Sale).where(Sale.shop_id == shop_id)).all()
    products = session.exec(select(Product).where(Product.shop_id == shop_id)).all()
    buying_prices = {p.id: p.buying_price for p in products if p.id is not None}

    def sale_profit(sale: Sale) -> float:
        return sum((item.unit_price - buying_prices.get(item.product_id or -1, 0.0)) * item.quantity for item in sale.items)

    month_sales = [s for s in all_sales if s.created_at.date() >= month_ago and not s.is_returned]

    daily_chart = []
    for i in range(14):
        d = chart_start + timedelta(days=i)
        day_sales = [s for s in all_sales if s.created_at.date() == d and not s.is_returned]
        daily_chart.append({
            "date": d.isoformat(),
            "day": d.strftime("%a"),
            "total": round(sum(s.total for s in day_sales), 2),
            "count": len(day_sales),
        })

    payment_totals: dict[str, dict] = {}
    for s in month_sales:
        entry = payment_totals.setdefault(s.payment_method, {"method": s.payment_method, "total": 0.0, "count": 0})
        entry["total"] += s.total
        entry["count"] += 1
    payment_breakdown = sorted(
        [{**v, "total": round(v["total"], 2)} for v in payment_totals.values()],
        key=lambda x: x["total"], reverse=True,
    )

    today_profit = sum(sale_profit(s) for s in all_sales if s.created_at.date() == today and not s.is_returned)
    week_ago = today - timedelta(days=6)
    week_profit = sum(sale_profit(s) for s in all_sales if s.created_at.date() >= week_ago and not s.is_returned)
    month_profit = sum(sale_profit(s) for s in month_sales)

    product_totals: dict[str, dict] = {}
    for sale in month_sales:
        for item in sale.items:
            entry = product_totals.setdefault(item.product_name, {"name": item.product_name, "qty": 0, "revenue": 0.0})
            entry["qty"] += item.quantity
            entry["revenue"] += item.subtotal
    top_products = sorted(product_totals.values(), key=lambda x: x["qty"], reverse=True)[:5]
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)

    staff_totals: dict[str, dict] = {}
    for s in month_sales:
        name = s.cashier_name or "Unknown"
        entry = staff_totals.setdefault(name, {"name": name, "sales_count": 0, "revenue": 0.0})
        entry["sales_count"] += 1
        entry["revenue"] += s.total
    staff_performance = sorted(
        [{**v, "revenue": round(v["revenue"], 2)} for v in staff_totals.values()],
        key=lambda x: x["revenue"], reverse=True,
    )

    low_stock = sorted(
        [p for p in products if p.active and p.stock <= p.min_stock],
        key=lambda p: p.stock,
    )

    return {
        "daily_chart": daily_chart,
        "payment_breakdown": payment_breakdown,
        "today_profit": round(today_profit, 2),
        "week_profit": round(week_profit, 2),
        "month_profit": round(month_profit, 2),
        "avg_sale_value": round(sum(s.total for s in month_sales) / len(month_sales), 2) if month_sales else 0,
        "returns_count": len([s for s in all_sales if s.is_returned and s.created_at.date() >= month_ago]),
        "top_products": top_products,
        "staff_performance": staff_performance if kpi_unlocked else [],
        "kpi_locked": not kpi_unlocked,
        "low_stock_count": len(low_stock),
        "low_stock_items": [{"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock[:5]],
    }


@router.post("/shops/", status_code=201)
def create_shop(
    data: ShopCreate,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    existing_count = len(session.exec(select(Shop).where(Shop.owner_id == owner_id)).all())
    limit = max_shops_for(owner)
    if existing_count >= limit:
        if owner.subscription_status == "active":
            detail = f"Your {owner.plan} plan allows up to {limit} stores — upgrade to add more."
        else:
            detail = "Your trial or subscription doesn't allow more stores — upgrade to add another."
        raise HTTPException(status_code=403, detail=detail)

    base_slug = _slugify(data.name)
    slug = _unique_slug(base_slug, session)

    shop = Shop(
        name=data.name,
        slug=slug,
        email=data.email,
        phone=data.phone,
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
        **_subscription_fields(owner),
        "active": shop.active,
        "staff_count": 1,
        "total_staff_count": len(session.exec(
            select(Staff).where(
                Staff.shop_id.in_([s.id for s in session.exec(select(Shop).where(Shop.owner_id == owner_id)).all()]),
                Staff.active == True,
            )
        ).all()),
        "max_staff": max_staff_for(owner),
        "manager_id": manager.id,
        "created_at": shop.created_at.isoformat(),
    }


# update shop
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



# Staff management

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
    owner = session.get(Owner, owner_id)
    shop = session.get(Shop, shop_id)
    if not owner or not shop or shop.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Shop not found")

    owner_shop_ids = [s.id for s in session.exec(select(Shop).where(Shop.owner_id == owner_id)).all()]
    staff_count = len(session.exec(
        select(Staff).where(Staff.shop_id.in_(owner_shop_ids), Staff.active == True)
    ).all())
    limit = max_staff_for(owner)
    if staff_count >= limit:
        detail = f"Your {owner.plan} plan allows up to {limit} staff across all your stores — upgrade to add more."
        raise HTTPException(status_code=403, detail=detail)

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
