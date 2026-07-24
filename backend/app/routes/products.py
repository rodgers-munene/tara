import csv
import io
import json
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user, require_shop_owner_role
from app.models import Category, Product
from app.schemas import BulkImportResult, ProductCreate, ProductRead, ProductUpdate, StockAdjust

router = APIRouter(prefix="/products", tags=["products"])

MAX_IMPORT_ROWS = 5000
TRUTHY = {"true", "1", "yes", "y"}
FALSY = {"false", "0", "no", "n"}

# Recognized synonyms for each import field, so shops whose CSV export uses
# different column names (e.g. "Item", "SKU", "Qty") still auto-match without
# requiring a manual mapping step. Values are normalized (see _normalize_header).
FIELD_ALIASES: dict[str, set[str]] = {
    "name": {"name", "product name", "product", "item", "item name", "description", "title"},
    "price": {"price", "selling price", "unit price", "retail price", "sale price", "sp"},
    "buying_price": {"buying price", "cost price", "cost", "purchase price", "wholesale price", "buy price"},
    "stock": {"stock", "quantity", "qty", "qty on hand", "stock quantity", "current stock", "in stock", "stock qty"},
    "min_stock": {"min stock", "minimum stock", "reorder level", "reorder point", "low stock threshold"},
    "pricing_mode": {"pricing mode", "mode", "sale type", "unit type"},
    "unit_label": {"unit label", "unit", "uom", "unit of measure"},
    "track_stock": {"track stock", "track inventory", "manage stock", "stock tracked"},
    "barcode": {"barcode", "sku", "upc", "ean", "product code", "code", "item code"},
    "category": {"category", "category name", "group", "department", "product category"},
}
REQUIRED_IMPORT_FIELDS = {"name", "price"}


def _normalize_header(header: str) -> str:
    header = re.sub(r"[^a-z0-9]+", " ", header.strip().lower())
    return re.sub(r"\s+", " ", header).strip()


def _read_rows(file: UploadFile) -> tuple[list[str], list[dict[str, str]]]:
    filename = (file.filename or "").lower()
    if filename.endswith(".xlsx"):
        import openpyxl

        workbook = openpyxl.load_workbook(io.BytesIO(file.file.read()), data_only=True, read_only=True)
        rows_iter = workbook.worksheets[0].iter_rows(values_only=True)
        header_row = next(rows_iter, None)
        if header_row is None:
            return [], []
        headers = [str(h).strip() if h is not None else "" for h in header_row]
        rows: list[dict[str, str]] = []
        for raw_row in rows_iter:
            if raw_row is None or all(v is None for v in raw_row):
                continue
            row = {
                header: ("" if value is None else str(value).strip())
                for header, value in zip(headers, raw_row)
                if header
            }
            rows.append(row)
        return headers, rows

    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    headers = [h.strip() for h in (reader.fieldnames or [])]
    return headers, list(reader)


def _resolve_columns(headers: list[str], column_map: dict[str, str] | None) -> dict[str, str]:
    normalized_to_actual = {_normalize_header(h): h for h in headers}
    column_map = column_map or {}
    resolved: dict[str, str] = {}
    for field, aliases in FIELD_ALIASES.items():
        mapped_header = column_map.get(field)
        if mapped_header and mapped_header in headers:
            resolved[field] = mapped_header
            continue
        for alias in aliases:
            actual = normalized_to_actual.get(alias)
            if actual:
                resolved[field] = actual
                break
    return resolved


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


def _find_barcode_conflict(
    session: Session, shop_id: int, barcode: str, exclude_id: int | None = None
) -> Product | None:
    statement = select(Product).where(Product.shop_id == shop_id, Product.barcode == barcode)
    if exclude_id is not None:
        statement = statement.where(Product.id != exclude_id)
    return session.exec(statement).first()


@router.post("/", response_model=ProductRead, status_code=201)
def create_product(
    data: ProductCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_shop_owner_role),
):
    shop_id = current_user.get("shop_id")
    if data.barcode:
        conflict = _find_barcode_conflict(session, shop_id, data.barcode)
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Barcode already used by '{conflict.name}'",
            )
    product = Product(
        name=data.name,
        price=data.price,
        buying_price=data.buying_price,
        stock=data.stock,
        min_stock=data.min_stock,
        pricing_mode=data.pricing_mode,
        unit_label=data.unit_label,
        track_stock=data.track_stock,
        barcode=data.barcode,
        category_id=data.category_id,
        shop_id=shop_id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.post("/bulk-import", response_model=BulkImportResult)
def bulk_import_products(
    file: UploadFile = File(...),
    column_map: str | None = Form(default=None),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_shop_owner_role),
):
    shop_id = current_user.get("shop_id")
    headers, rows = _read_rows(file)

    if not headers:
        raise HTTPException(status_code=400, detail="File is empty or missing a header row")

    parsed_map: dict[str, str] | None = None
    if column_map:
        try:
            parsed_map = json.loads(column_map)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid column mapping")

    columns = _resolve_columns(headers, parsed_map)

    if not REQUIRED_IMPORT_FIELDS.issubset(columns):
        if parsed_map is None:
            # Couldn't confidently auto-match a required column — hand the raw
            # headers back so the client can show a mapping step instead of failing outright.
            suggested_map = {field: columns.get(field) for field in FIELD_ALIASES}
            return BulkImportResult(needs_mapping=True, headers=headers, suggested_map=suggested_map)
        raise HTTPException(
            status_code=400,
            detail="Select a column for both 'Product name' and 'Price' to continue",
        )

    def cell(row: dict, key: str) -> str:
        col = columns.get(key)
        return (row.get(col) or "").strip() if col else ""

    def parse_float(row: dict, key: str, default: float) -> float | None:
        raw_value = cell(row, key)
        if not raw_value:
            return default
        try:
            return float(raw_value)
        except ValueError:
            return None

    if len(rows) > MAX_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail=f"File has too many rows (max {MAX_IMPORT_ROWS})")

    existing_barcodes = {
        p.barcode
        for p in session.exec(
            select(Product).where(Product.shop_id == shop_id, Product.barcode.is_not(None))
        ).all()
    }
    category_cache: dict[str, int] = {
        c.name.lower(): c.id
        for c in session.exec(select(Category).where(Category.shop_id == shop_id)).all()
    }

    created = 0
    skipped = 0
    errors: list[str] = []
    new_products: list[Product] = []
    seen_barcodes: set[str] = set()

    for i, row in enumerate(rows, start=2):  # row 1 is the header
        name = cell(row, "name")
        if not name:
            errors.append(f"Row {i}: name is required")
            continue

        price = parse_float(row, "price", 0.0)
        if price is None or price < 0:
            errors.append(f"Row {i}: price must be a non-negative number")
            continue

        buying_price = parse_float(row, "buying_price", 0.0)
        if buying_price is None:
            errors.append(f"Row {i}: buying_price must be a number")
            continue

        stock = parse_float(row, "stock", 0.0)
        if stock is None:
            errors.append(f"Row {i}: stock must be a number")
            continue

        min_stock = parse_float(row, "min_stock", 5.0)
        if min_stock is None:
            errors.append(f"Row {i}: min_stock must be a number")
            continue

        pricing_mode = cell(row, "pricing_mode").lower() or "unit"
        if pricing_mode not in ("unit", "weight"):
            errors.append(f"Row {i}: pricing_mode must be 'unit' or 'weight'")
            continue

        track_stock_raw = cell(row, "track_stock").lower()
        if not track_stock_raw or track_stock_raw in TRUTHY:
            track_stock = True
        elif track_stock_raw in FALSY:
            track_stock = False
        else:
            errors.append(f"Row {i}: track_stock must be true/false")
            continue

        barcode = cell(row, "barcode") or None
        if barcode and (barcode in existing_barcodes or barcode in seen_barcodes):
            skipped += 1
            errors.append(f"Row {i}: skipped, a product with barcode '{barcode}' already exists")
            continue

        category_name = cell(row, "category")
        category_id = None
        if category_name:
            key = category_name.lower()
            category_id = category_cache.get(key)
            if category_id is None:
                category = Category(name=category_name, shop_id=shop_id)
                session.add(category)
                session.flush()
                category_cache[key] = category.id
                category_id = category.id

        new_products.append(
            Product(
                name=name,
                price=price,
                buying_price=buying_price,
                stock=stock,
                min_stock=min_stock,
                pricing_mode=pricing_mode,
                unit_label=cell(row, "unit_label") or None,
                track_stock=track_stock,
                barcode=barcode,
                category_id=category_id,
                shop_id=shop_id,
            )
        )
        if barcode:
            seen_barcodes.add(barcode)
        created += 1

    session.add_all(new_products)
    session.commit()

    return BulkImportResult(created=created, skipped=skipped, errors=errors)


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
    current_user: dict = Depends(require_shop_owner_role),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    updates = data.model_dump(exclude_unset=True)
    if updates.get("barcode"):
        conflict = _find_barcode_conflict(
            session, product.shop_id, updates["barcode"], exclude_id=product.id
        )
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Barcode already used by '{conflict.name}'",
            )
    for key, value in updates.items():
        setattr(product, key, value)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.post("/{product_id}/adjust-stock", response_model=ProductRead)
def adjust_stock(
    product_id: int,
    data: StockAdjust,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_shop_owner_role),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock = max(0, product.stock + data.delta)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_shop_owner_role),
):
    product = session.get(Product, product_id)
    if not product or product.shop_id != current_user.get("shop_id"):
        raise HTTPException(status_code=404, detail="Product not found")
    product.active = False
    session.add(product)
    session.commit()
