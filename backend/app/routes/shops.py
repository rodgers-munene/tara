from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import Shop, Staff, StaffRead

router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/{slug}")
def get_shop(slug: str, session: Session = Depends(get_session)):
    """Public endpoint — returns shop info + active staff for the login screen."""
    shop = session.exec(select(Shop).where(Shop.slug == slug)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if not shop.active:
        raise HTTPException(status_code=403, detail="Shop account is inactive")

    staff = session.exec(
        select(Staff)
        .where(Staff.shop_id == shop.id)
        .where(Staff.active == True)
        .order_by(Staff.name)
    ).all()

    return {
        "id": shop.id,
        "name": shop.name,
        "slug": shop.slug,
        "plan": shop.plan,
        "staff": [{"id": s.id, "name": s.name, "role": s.role} for s in staff],
    }
