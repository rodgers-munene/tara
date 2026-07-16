import os
from datetime import datetime
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
from app.database import get_session
from app.models import Shop, Owner

SECRET_KEY = os.getenv("JWT_SECRET", "tara-dev-secret-change-in-production")
ALGORITHM = "HS256"

_bearer = HTTPBearer(auto_error=False)

def _subscription_blocked_reason(owner: Owner) -> str | None:
    """Returns a user-facing message if the owner's account access should be blocked,
    else None. Subscription lives on the owner (one bill covers all their stores),
    not on the individual shop."""
    if owner.subscription_status == "active":
        if owner.subscription_ends_at and owner.subscription_ends_at < datetime.utcnow():
            return "Your subscription has ended. Renew to keep using Tara POS."
        return None
    if owner.subscription_status == "trialing":
        if owner.trial_ends_at and owner.trial_ends_at < datetime.utcnow():
            return "Your 7-day free trial has ended. Upgrade to keep using Tara POS."
        return None
    return "Your subscription has expired. Upgrade to keep using Tara POS."


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: Session = Depends(get_session),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("superadmin"):
            raise HTTPException(status_code=403, detail="Use staff credentials")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    shop_id = payload.get("shop_id")
    if shop_id:
        shop = session.get(Shop, shop_id)
        if not shop or not shop.active:
            raise HTTPException(status_code=403, detail="Shop account is inactive")
        owner = session.get(Owner, shop.owner_id) if shop.owner_id else None
        if not owner:
            raise HTTPException(status_code=403, detail="Shop account is inactive")
        blocked_reason = _subscription_blocked_reason(owner)
        if blocked_reason:
            raise HTTPException(status_code=402, detail=blocked_reason)

    return payload


def require_superadmin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("superadmin"):
            raise HTTPException(status_code=403, detail="Superadmin access required")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_owner(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("owner"):
            raise HTTPException(status_code=403, detail="Owner access required")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_shop_owner_role(current_user: dict = Depends(get_current_user)) -> dict:
    """Gate for in-shop staff actions cashiers shouldn't reach (catalog edits, etc).
    Distinct from require_owner, which gates the separate Owner-account (/owner/*) system."""
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user
