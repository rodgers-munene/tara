from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Category, CategoryCreate, CategoryRead

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryRead])
def list_categories(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    return session.exec(select(Category).where(Category.shop_id == shop_id)).all()


@router.post("/", response_model=CategoryRead, status_code=201)
def create_category(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    category = Category(name=data.name, color=data.color, shop_id=current_user.get("shop_id"))
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    category = session.get(Category, category_id)
    if not category or category.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Category not found")
    session.delete(category)
    session.commit()
