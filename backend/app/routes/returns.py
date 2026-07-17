from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, SaleReturn, Product, SaleItem
from app.schemas import SaleReturnCreate, SaleReturnRead

router = APIRouter(prefix="/returns", tags=["returns"])


def _generate_return_number(session: Session, shop_id: int) -> str:
    # return_number is unique across the whole table, not just within a shop, so
    # the shop_id must be part of the prefix — otherwise two different shops both
    # counting their own zero same-day returns would both compute "...-0001" and
    # collide on the global constraint every single retry, not just rarely.
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"RET-{shop_id}-{today}-"
    count = len(session.exec(
        select(SaleReturn)
        .where(SaleReturn.return_number.startswith(prefix))
        .where(SaleReturn.shop_id == shop_id)
    ).all())
    return f"{prefix}{count + 1:04d}"


@router.post("/", response_model=SaleReturnRead, status_code=201)
def create_return(
    data: SaleReturnCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")

    sale = session.get(Sale, data.sale_id)
    if not sale or sale.shop_id != shop_id:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.is_returned:
        raise HTTPException(status_code=400, detail="This sale has already been returned")

    # Restore stock for every item in the sale
    items = session.exec(select(SaleItem).where(SaleItem.sale_id == sale.id)).all()
    for item in items:
        if item.product_id:
            product = session.get(Product, item.product_id)
            if product and product.shop_id == shop_id:
                product.stock += item.quantity
                session.add(product)

    sale.is_returned = True
    session.add(sale)

    sale_return = SaleReturn(
        sale_id=sale.id,
        total_refunded=sale.total,
        reason=data.reason,
        processed_by=current_user.get("name"),
        shop_id=shop_id,
    )

    # A plain session.rollback() on collision would also discard the stock
    # restoration and sale.is_returned flush above, not just the sale_return
    # insert — so each attempt runs in its own SAVEPOINT instead, keeping the
    # rest of this transaction intact if a retry is needed.
    max_attempts = 5
    for attempt in range(max_attempts):
        sale_return.return_number = _generate_return_number(session, shop_id)
        session.add(sale_return)
        try:
            with session.begin_nested():
                session.flush()
            break
        except IntegrityError:
            if attempt == max_attempts - 1:
                raise HTTPException(status_code=409, detail="Could not assign a return number, please try again")

    session.commit()
    session.refresh(sale_return)
    return sale_return


@router.get("/", response_model=list[SaleReturnRead])
def list_returns(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    returns = session.exec(
        select(SaleReturn)
        .where(SaleReturn.shop_id == shop_id)
        .order_by(SaleReturn.created_at.desc())
    ).all()
    return returns
