from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, SaleReturn, SaleReturnCreate, SaleReturnRead, Product, SaleItem

router = APIRouter(prefix="/returns", tags=["returns"])


def _generate_return_number(session: Session, shop_id: int) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"RET-{today}-"
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
        return_number=_generate_return_number(session, shop_id),
        sale_id=sale.id,
        total_refunded=sale.total,
        reason=data.reason,
        processed_by=current_user.get("name"),
        shop_id=shop_id,
    )
    session.add(sale_return)
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
