import hashlib
import hmac
import os

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from app.database import get_session
from app.dependencies import require_owner
from app.models import Owner
from app.notifications import send_subscription_success_email
from app.schemas import CheckoutRequest
from app.pricing import PRICING_KES, activate_subscription

router = APIRouter(tags=["billing"])

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tara.ekshop.store")
PAYSTACK_BASE = "https://api.paystack.co"


def _require_paystack_configured():
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured yet. Try again shortly.")


@router.post("/owner/checkout")
def start_checkout(
    data: CheckoutRequest,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    """Starts a Paystack checkout for the owner's account — one subscription covers
    every store under this owner, up to the tier's store limit."""
    _require_paystack_configured()

    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    price = PRICING_KES.get((data.tier, data.cycle))
    if price is None:
        raise HTTPException(status_code=400, detail="Invalid plan/billing cycle combination")

    resp = requests.post(
        f"{PAYSTACK_BASE}/transaction/initialize",
        headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        json={
            "email": owner.email,
            "amount": price * 100,  # Paystack expects the lowest currency denomination
            "currency": "KES",
            "callback_url": f"{FRONTEND_URL}/owner/billing",
            "metadata": {"owner_id": owner_id, "tier": data.tier, "cycle": data.cycle},
        },
        timeout=15,
    )
    body = resp.json()
    if not resp.ok or not body.get("status"):
        raise HTTPException(status_code=502, detail=body.get("message", "Could not start checkout"))

    return {
        "authorization_url": body["data"]["authorization_url"],
        "reference": body["data"]["reference"],
    }


@router.get("/owner/checkout/verify")
def verify_checkout(
    reference: str,
    session: Session = Depends(get_session),
    payload: dict = Depends(require_owner),
):
    """Called by the frontend right after Paystack redirects back — gives the owner
    instant feedback instead of waiting on the webhook, which is the real source of
    truth and may land a moment later (or, for local dev, may never reach localhost)."""
    _require_paystack_configured()

    owner_id = int(payload["sub"])
    owner = session.get(Owner, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    resp = requests.get(
        f"{PAYSTACK_BASE}/transaction/verify/{reference}",
        headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        timeout=15,
    )
    body = resp.json()
    data = body.get("data") or {}
    if not resp.ok or not body.get("status"):
        return {"verified": False, "status": "error"}

    # Paystack's own status for this transaction: "success", "abandoned" (checkout
    # closed/cancelled before paying), "failed", or a handful of in-flight states.
    txn_status = data.get("status") or "error"
    if txn_status != "success":
        return {"verified": False, "status": txn_status}

    metadata = data.get("metadata") or {}
    if str(metadata.get("owner_id")) != str(owner_id):
        raise HTTPException(status_code=400, detail="Reference does not match this account")

    activate_subscription(session, owner_id, metadata.get("tier"), metadata.get("cycle"))
    session.refresh(owner)
    return {
        "verified": True,
        "status": "success",
        "plan": owner.plan,
        "billing_cycle": owner.billing_cycle,
        "subscription_status": owner.subscription_status,
        "subscription_ends_at": owner.subscription_ends_at.isoformat() if owner.subscription_ends_at else None,
    }


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, session: Session = Depends(get_session)):
    """Source of truth for activation. Must verify the signature — without it, anyone
    could POST a forged charge.success and unlock an account for free."""
    _require_paystack_configured()

    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(PAYSTACK_SECRET_KEY.encode(), raw_body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = await request.json()
    if event.get("event") == "charge.success":
        data = event.get("data") or {}
        metadata = data.get("metadata") or {}
        owner_id = metadata.get("owner_id")
        tier = metadata.get("tier")
        cycle = metadata.get("cycle")
        if owner_id and tier and cycle:
            activate_subscription(session, int(owner_id), tier, cycle)
            owner = session.get(Owner, int(owner_id))
            if owner:
                send_subscription_success_email(owner)

    return {"received": True}
