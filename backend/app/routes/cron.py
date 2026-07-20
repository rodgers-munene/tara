import os
import secrets
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Header, HTTPException
from sqlmodel import Session, select

from app.database import engine
from app.models import Owner, Shop, Sale
from app.notifications import (
    send_trial_expiring_email,
    send_subscription_expiring_email,
    send_weekly_summary_email,
)

router = APIRouter(prefix="/cron", tags=["cron"])
EAT_OFFSET = timedelta(hours=3)

CRON_SECRET = os.getenv("CRON_SECRET")
WARNING_WINDOW_DAYS = 3


def _require_cron_secret(x_cron_secret: str | None):
    if not CRON_SECRET:
        raise HTTPException(status_code=503, detail="Cron endpoint is not configured yet.")
    if not x_cron_secret or not secrets.compare_digest(x_cron_secret, CRON_SECRET):
        raise HTTPException(status_code=401, detail="Invalid cron secret")


@router.post("/check-expiring")
def check_expiring(x_cron_secret: str | None = Header(default=None)):
    """Meant to be hit daily by an external scheduler (the backend sleeps on idle,
    so no in-process job can be relied on). Warns owners once per trial/subscription
    period whose trial or subscription ends within WARNING_WINDOW_DAYS."""
    _require_cron_secret(x_cron_secret)

    now = datetime.utcnow()
    window_end = now + timedelta(days=WARNING_WINDOW_DAYS)

    trial_warnings = 0
    subscription_warnings = 0

    with Session(engine) as session:
        trialing_owners = session.exec(
            select(Owner).where(
                Owner.subscription_status == "trialing",
                Owner.trial_ends_at <= window_end,
                Owner.trial_ends_at >= now,
                Owner.trial_warning_sent_at.is_(None),
            )
        ).all()
        for owner in trialing_owners:
            send_trial_expiring_email(owner)
            owner.trial_warning_sent_at = now
            session.add(owner)
            trial_warnings += 1

        active_owners = session.exec(
            select(Owner).where(
                Owner.subscription_status == "active",
                Owner.subscription_ends_at <= window_end,
                Owner.subscription_ends_at >= now,
                Owner.subscription_warning_sent_at.is_(None),
            )
        ).all()
        for owner in active_owners:
            send_subscription_expiring_email(owner)
            owner.subscription_warning_sent_at = now
            session.add(owner)
            subscription_warnings += 1

        session.commit()

    return {"trial_warnings": trial_warnings, "subscription_warnings": subscription_warnings}


def _build_weekly_summary(session: Session, owner: Owner, shops: list[Shop], start_utc: datetime, end_utc: datetime, week_start_local, week_end_local) -> dict:
    shop_ids = [s.id for s in shops]
    sales = session.exec(
        select(Sale).where(
            Sale.shop_id.in_(shop_ids),
            Sale.created_at >= start_utc,
            Sale.created_at <= end_utc,
            Sale.is_returned == False,  # noqa: E712
        )
    ).all()

    shop_totals = {s.id: {"name": s.name, "sales_count": 0, "revenue": 0.0} for s in shops}
    product_totals: dict[str, dict] = {}
    total_revenue = 0.0
    for sale in sales:
        total_revenue += sale.total
        entry = shop_totals[sale.shop_id]
        entry["sales_count"] += 1
        entry["revenue"] += sale.total
        for item in sale.items:
            p = product_totals.setdefault(item.product_name, {"name": item.product_name, "qty": 0.0, "revenue": 0.0})
            p["qty"] += item.quantity
            p["revenue"] += item.subtotal

    top_products = sorted(product_totals.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    return {
        "week_start": week_start_local,
        "week_end": week_end_local,
        "total_revenue": total_revenue,
        "total_sales": len(sales),
        "avg_sale": (total_revenue / len(sales)) if sales else 0.0,
        "top_products": top_products,
        "shops": sorted(shop_totals.values(), key=lambda x: x["revenue"], reverse=True),
    }


@router.post("/weekly-summary")
def weekly_summary(x_cron_secret: str | None = Header(default=None)):
    """Meant to be hit every Sunday morning (EAT) by an external scheduler. Sends each
    active/trialing owner with at least one shop a revenue/sales recap for the week
    that just ended (the previous Sunday-Saturday, EAT), across all of their shops."""
    _require_cron_secret(x_cron_secret)

    now_local = datetime.utcnow() + EAT_OFFSET
    week_end_local = now_local.date() - timedelta(days=1)
    week_start_local = week_end_local - timedelta(days=6)
    start_utc = datetime.combine(week_start_local, time.min) - EAT_OFFSET
    end_utc = datetime.combine(week_end_local, time.max) - EAT_OFFSET

    sent = 0
    with Session(engine) as session:
        owners = session.exec(
            select(Owner).where(Owner.subscription_status.in_(["active", "trialing"]))
        ).all()
        for owner in owners:
            shops = session.exec(select(Shop).where(Shop.owner_id == owner.id)).all()
            if not shops:
                continue
            summary = _build_weekly_summary(session, owner, shops, start_utc, end_utc, week_start_local, week_end_local)
            if send_weekly_summary_email(owner, summary):
                sent += 1

    return {"summaries_sent": sent}
