from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, SaleItem, Product
from app.schemas import SaleCreate, SaleRead

router = APIRouter(prefix="/sales", tags=["sales"])


def _generate_receipt(session: Session, shop_id: int) -> str:
    # receipt_number is unique across the whole table, not just within a shop, so
    # the shop_id must be part of the prefix — otherwise two different shops both
    # counting their own zero same-day sales would both compute "...-0001" and
    # collide on the global constraint every single retry, not just rarely.
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"TRA-{shop_id}-{today}-"
    count = len(session.exec(
        select(Sale)
        .where(Sale.receipt_number.startswith(prefix))
        .where(Sale.shop_id == shop_id)
    ).all())
    return f"{prefix}{count + 1:04d}"


@router.post("/", response_model=SaleRead, status_code=201)
def create_sale(
    data: SaleCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")

    if data.payment_method not in ("cash", "mpesa", "split"):
        raise HTTPException(status_code=400, detail="payment_method must be 'cash', 'mpesa' or 'split'")

    items_data = []
    subtotal_total = 0.0

    for item_in in data.items:
        product = session.get(Product, item_in.product_id)
        if not product or product.shop_id != shop_id:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        if not product.active:
            raise HTTPException(status_code=400, detail=f"Product '{product.name}' is not active")
        if product.track_stock and product.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{product.name}'. Available: {product.stock}"
            )

        # Weight/bundle-priced lines (e.g. 0.417kg * 600/kg) produce fractional
        # shillings; Kenyan cash transactions don't use decimals, so round each
        # line to the nearest whole KES rather than carrying cents through.
        subtotal = round(product.price * item_in.quantity)
        subtotal_total += subtotal
        items_data.append({
            "product": product,
            "quantity": item_in.quantity,
            "unit_price": product.price,
            "subtotal": subtotal,
        })

    discount = max(0.0, data.discount or 0.0)
    if discount > subtotal_total:
        raise HTTPException(status_code=400, detail="Discount exceeds order total")

    total = round(subtotal_total - discount)

    cash_amount = None
    mpesa_amount = None

    if data.payment_method == "split":
        cash_amount = round(data.cash_amount or 0.0)
        mpesa_amount = round(data.mpesa_amount or 0.0)
        if cash_amount <= 0 or mpesa_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Split payment requires both a cash amount and an M-Pesa amount",
            )
        amount_paid = cash_amount + mpesa_amount
        if amount_paid < total:
            raise HTTPException(status_code=400, detail="Amount paid is less than total")
        # Any overpayment is assumed to come back as physical cash change,
        # since M-Pesa transfers can't hand back partial change themselves.
        change = round(amount_paid - total)
    elif data.payment_method == "cash":
        if data.amount_paid < total:
            raise HTTPException(status_code=400, detail="Amount paid is less than total")
        amount_paid = data.amount_paid
        change = round(amount_paid - total)
    else:  # mpesa
        amount_paid = data.amount_paid
        change = 0.0

    sale = Sale(
        total=total,
        discount=round(discount),
        payment_method=data.payment_method,
        amount_paid=amount_paid,
        change_given=change,
        mpesa_ref=data.mpesa_ref,
        mpesa_phone=data.mpesa_phone,
        cash_amount=cash_amount,
        mpesa_amount=mpesa_amount,
        cashier_id=int(current_user["sub"]),
        cashier_name=current_user["name"],
        shop_id=shop_id,
    )

    # Receipt numbers are assigned by counting same-day rows, which isn't atomic —
    # two near-simultaneous sales (e.g. a fast double-tap on submit) can compute the
    # same number. Retry with a freshly counted number on a unique-constraint clash
    # rather than surfacing a 500 for what's really just a numbering collision.
    max_attempts = 5
    for attempt in range(max_attempts):
        sale.receipt_number = _generate_receipt(session, shop_id)
        session.add(sale)
        try:
            session.flush()
            break
        except IntegrityError:
            session.rollback()
            if attempt == max_attempts - 1:
                raise HTTPException(status_code=409, detail="Could not assign a receipt number, please try again")

    for entry in items_data:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=entry["product"].id,
            product_name=entry["product"].name,
            quantity=entry["quantity"],
            unit_price=entry["unit_price"],
            subtotal=entry["subtotal"],
        )
        session.add(sale_item)
        if entry["product"].track_stock:
            entry["product"].stock = max(0, entry["product"].stock - entry["quantity"])
            session.add(entry["product"])

    session.commit()
    session.refresh(sale)
    return sale


@router.get("/", response_model=list[SaleRead])
def list_sales(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    statement = (
        select(Sale)
        .where(Sale.shop_id == shop_id)
        .order_by(Sale.created_at.desc())
        .limit(limit)
    )
    sales = session.exec(statement).all()
    if from_date:
        sales = [s for s in sales if s.created_at.date() >= from_date]
    if to_date:
        sales = [s for s in sales if s.created_at.date() <= to_date]
    return sales


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(
    sale_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    sale = session.get(Sale, sale_id)
    if not sale or sale.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale
