from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Product, ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=list[ProductRead])
def list_products(
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    active_only: bool = Query(default=True),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    statement = select(Product).where(Product.shop_id == shop_id)
    if active_only:
        statement = statement.where(Product.active == True)
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    products = session.exec(statement).all()
    if search:
        q = search.lower()
        products = [p for p in products if q in p.name.lower() or (p.barcode and q in p.barcode)]
    return products


@router.post("/", response_model=ProductRead, status_code=201)
def create_product(
    data: ProductCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    product = Product(
        name=data.name,
        price=data.price,
        stock=data.stock,
        barcode=data.barcode,
        category_id=data.category_id,
        shop_id=current_user.get("shop_id"),
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    data: ProductUpdate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(product, key, value)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    product.active = False
    session.add(product)
    session.commit()
