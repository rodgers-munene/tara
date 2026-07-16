from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Shop, Staff
from app.schemas import StaffRead

router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/me")
def get_my_shop(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Shop branding info (name/phone) for the logged-in staff member's shop."""
    shop_id = current_user.get("shop_id")
    shop = session.get(Shop, shop_id) if shop_id else None
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {"id": shop.id, "name": shop.name, "phone": shop.phone}


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
        "staff": [{"id": s.id, "name": s.name, "role": s.role} for s in staff],
    }
