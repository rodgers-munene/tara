from datetime import datetime, timedelta
from sqlmodel import Session
from app.models import Owner

# KES prices, as quoted by the client for launch.
PRICING_KES = {
    ("small", "weekly"): 104,
    ("small", "monthly"): 416,
    ("small", "yearly"): 4992,
    ("medium", "monthly"): 5625,
    ("medium", "yearly"): 67500,
}

CYCLE_DAYS = {"weekly": 7, "monthly": 30, "yearly": 365}

# One subscription covers a bundle of stores (billed per owner account, not per shop).
PLAN_LIMITS = {
    "small": {"max_shops": 2, "max_staff": 5},
    "medium": {"max_shops": 4, "max_staff": 15},
}
TRIAL_MAX_SHOPS = 2
TRIAL_MAX_STAFF = 5

# Features that only unlock on specific plans (in addition to the shop/staff limits above).
FEATURE_FLAGS = {
    "small": {"kpi_tracking": False},
    "medium": {"kpi_tracking": True},
}


def max_shops_for(owner: Owner) -> int:
    """How many stores this owner's current account state entitles them to create."""
    if owner.subscription_status == "active":
        limit = PLAN_LIMITS.get(owner.plan)
        return limit["max_shops"] if limit else 0
    if owner.subscription_status == "trialing":
        if owner.trial_ends_at and owner.trial_ends_at < datetime.utcnow():
            return 0
        return TRIAL_MAX_SHOPS
    return 0


def max_staff_for(owner: Owner) -> int:
    """How many staff (across all of this owner's shops) their current account state allows."""
    if owner.subscription_status == "active":
        limit = PLAN_LIMITS.get(owner.plan)
        return limit["max_staff"] if limit else 0
    if owner.subscription_status == "trialing":
        if owner.trial_ends_at and owner.trial_ends_at < datetime.utcnow():
            return 0
        return TRIAL_MAX_STAFF
    return 0


def has_feature(owner: Owner, feature: str) -> bool:
    """Plan-gated feature toggle. Trialing owners get the small-tier feature set."""
    if owner.subscription_status not in ("active", "trialing"):
        return False
    plan = owner.plan if owner.subscription_status == "active" else "small"
    return FEATURE_FLAGS.get(plan, {}).get(feature, False)


def activate_subscription(session: Session, owner_id: int, tier: str, cycle: str) -> None:
    """Extends an owner's paid period. Idempotent-safe: renewing before expiry stacks
    on top of remaining time instead of discarding it. Shared by the Paystack
    webhook/verify flow and the superadmin manual-activation override, so both
    paths compute expiry the same way."""
    owner = session.get(Owner, owner_id)
    days = CYCLE_DAYS.get(cycle)
    if not owner or days is None:
        return
    base = (
        owner.subscription_ends_at
        if owner.subscription_ends_at and owner.subscription_ends_at > datetime.utcnow()
        else datetime.utcnow()
    )
    owner.plan = tier
    owner.billing_cycle = cycle
    owner.subscription_status = "active"
    owner.subscription_ends_at = base + timedelta(days=days)
    session.add(owner)
    session.commit()
