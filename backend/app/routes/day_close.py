from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, DayClose
from app.schemas import DayCloseRead, DayCloseCreate

router = APIRouter(prefix="/day-close", tags=["day-close"])


@router.get("/today")
def get_today_summary(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    today = date.today()
    all_sales = session.exec(select(Sale).where(Sale.shop_id == shop_id)).all()
    today_sales = [s for s in all_sales if s.created_at.date() == today]

    cash_total = round(sum(s.total for s in today_sales if s.payment_method == "cash"), 2)
    mpesa_total = round(sum(s.total for s in today_sales if s.payment_method == "mpesa"), 2)
    grand_total = round(sum(s.total for s in today_sales), 2)

    existing = session.exec(
        select(DayClose)
        .where(DayClose.date == today.isoformat())
        .where(DayClose.shop_id == shop_id)
    ).first()

    return {
        "date": today.isoformat(),
        "total_cash_sales": cash_total,
        "total_mpesa_sales": mpesa_total,
        "total_sales": grand_total,
        "sale_count": len(today_sales),
        "already_closed": existing is not None,
        "close_record": {
            "opening_cash": existing.opening_cash,
            "closing_cash": existing.closing_cash,
            "notes": existing.notes,
            "closed_by": existing.closed_by,
        } if existing else None,
    }


@router.get("/", response_model=list[DayCloseRead])
def list_closes(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    return session.exec(
        select(DayClose)
        .where(DayClose.shop_id == shop_id)
        .order_by(DayClose.date.desc())
    ).all()


@router.post("/", response_model=DayCloseRead, status_code=201)
def close_day(
    data: DayCloseCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    existing = session.exec(
        select(DayClose)
        .where(DayClose.date == data.date)
        .where(DayClose.shop_id == shop_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Day already closed")

    all_sales = session.exec(select(Sale).where(Sale.shop_id == shop_id)).all()
    day_sales = [s for s in all_sales if s.created_at.date().isoformat() == data.date]

    close = DayClose(
        date=data.date,
        opening_cash=data.opening_cash,
        closing_cash=data.closing_cash,
        total_cash_sales=round(sum(s.total for s in day_sales if s.payment_method == "cash"), 2),
        total_mpesa_sales=round(sum(s.total for s in day_sales if s.payment_method == "mpesa"), 2),
        total_sales=round(sum(s.total for s in day_sales), 2),
        sale_count=len(day_sales),
        notes=data.notes,
        closed_by=current_user["name"],
        shop_id=shop_id,
    )
    session.add(close)
    session.commit()
    session.refresh(close)
    return close
