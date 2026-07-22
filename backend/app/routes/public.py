import os
import secrets

from fastapi import APIRouter, Header, HTTPException
from sqlmodel import Session, select

from app.database import engine
from app.models import Owner, Shop

router = APIRouter(prefix="/public", tags=["public"])

AGENT_API_SECRET = os.getenv("AGENT_API_SECRET")


def _require_agent_secret(x_agent_secret: str | None):
    if not AGENT_API_SECRET:
        raise HTTPException(status_code=503, detail="Agent status endpoint is not configured yet.")
    if not x_agent_secret or not secrets.compare_digest(x_agent_secret, AGENT_API_SECRET):
        raise HTTPException(status_code=401, detail="Invalid agent secret")


@router.get("/referrals/{code}/status")
def referral_status(code: str, x_agent_secret: str | None = Header(default=None)):
    """Meant to be called server-to-server by the agent portal to list every owner
    referred by this agent code, with their conversion status (trial finished,
    subscription paid) so the agent knows which are due a payout. Grouped by owner
    (not by shop) since one subscription can cover several of an owner's shops."""
    _require_agent_secret(x_agent_secret)

    with Session(engine) as session:
        owners = session.exec(select(Owner).where(Owner.referred_by_code == code)).all()

        referred_owners = []
        for owner in owners:
            shops = session.exec(select(Shop).where(Shop.owner_id == owner.id)).all()
            referred_owners.append({
                "owner_name": owner.name,
                "subscription_status": owner.subscription_status,
                "trial_ends_at": owner.trial_ends_at.isoformat() if owner.trial_ends_at else None,
                "subscription_ends_at": owner.subscription_ends_at.isoformat() if owner.subscription_ends_at else None,
                "payout_eligible": owner.subscription_status == "active",
                "shops": [{"slug": s.slug, "name": s.name} for s in shops],
            })

        return {
            "referral_code": code,
            "referred_owners": referred_owners,
        }
