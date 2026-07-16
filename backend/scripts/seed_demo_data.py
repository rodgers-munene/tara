"""One-off script to seed realistic demo data into Rodgers Shop (shop_id=3)
so the owner dashboard/analytics have something worth showing.

All generated sales use a "DEMO-" receipt_number prefix so they can be
identified and removed later without touching real data:

    DELETE FROM saleitem WHERE sale_id IN (SELECT id FROM sale WHERE receipt_number LIKE 'DEMO-%');
    DELETE FROM sale WHERE receipt_number LIKE 'DEMO-%';

Run with: .venv/bin/python scripts/seed_demo_data.py
"""
import random
from datetime import datetime, timedelta

from sqlmodel import Session, select
from app.database import engine
from app.models import Shop, Staff, Category, Product, Sale, SaleItem

SHOP_ID = 3
RECEIPT_PREFIX = "DEMO-"
DAYS_BACK = 45

random.seed(42)


def get_or_create_category(session: Session, name: str) -> Category:
    existing = session.exec(
        select(Category).where(Category.shop_id == SHOP_ID, Category.name == name)
    ).first()
    if existing:
        return existing
    cat = Category(name=name, shop_id=SHOP_ID)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


def get_or_create_product(session: Session, name: str, price: float, buying_price: float,
                           stock: int, min_stock: int, category_id: int) -> Product:
    existing = session.exec(
        select(Product).where(Product.shop_id == SHOP_ID, Product.name == name)
    ).first()
    if existing:
        return existing
    p = Product(
        name=name, price=price, buying_price=buying_price, stock=stock,
        min_stock=min_stock, category_id=category_id, shop_id=SHOP_ID,
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


def main():
    with Session(engine) as session:
        shop = session.get(Shop, SHOP_ID)
        if not shop:
            raise SystemExit(f"Shop {SHOP_ID} not found")

        already = session.exec(
            select(Sale).where(Sale.shop_id == SHOP_ID, Sale.receipt_number.like(f"{RECEIPT_PREFIX}%"))
        ).first()
        if already:
            raise SystemExit(
                "Demo data already exists for this shop. Delete it first (see script docstring) "
                "before re-seeding."
            )

        staff = session.exec(
            select(Staff).where(Staff.shop_id == SHOP_ID, Staff.active == True)
        ).all()
        if not staff:
            raise SystemExit("No active staff found for this shop")

        beverages = get_or_create_category(session, "Beverages")
        snacks = get_or_create_category(session, "Snacks")
        bakery = get_or_create_category(session, "Bakery")
        household = get_or_create_category(session, "Household")

        products = [
            get_or_create_product(session, "Nescafe coffee", 10.0, 0.0, 500, 5, beverages.id),
            get_or_create_product(session, "Ketepa Tea Leaves", 35.0, 0.0, 20, 5, beverages.id),
            get_or_create_product(session, "Soda 500ml", 70.0, 55.0, 60, 12, beverages.id),
            get_or_create_product(session, "Mineral Water 500ml", 50.0, 35.0, 80, 15, beverages.id),
            get_or_create_product(session, "Digestive Biscuits", 60.0, 45.0, 40, 8, snacks.id),
            get_or_create_product(session, "Crisps 40g", 50.0, 35.0, 55, 10, snacks.id),
            get_or_create_product(session, "Supaloaf 400g", 65.0, 55.0, 18, 6, bakery.id),
            get_or_create_product(session, "Half Loaf", 35.0, 28.0, 3, 5, bakery.id),
            get_or_create_product(session, "Omo Detergent 500g", 120.0, 95.0, 25, 5, household.id),
            get_or_create_product(session, "Candle Pack", 50.0, 35.0, 4, 6, household.id),
        ]

        today = datetime.utcnow().date()
        receipt_seq = 1
        sales_created = 0
        items_created = 0

        for i in range(DAYS_BACK, -1, -1):
            day = today - timedelta(days=i)
            is_weekend = day.weekday() >= 5
            num_sales = random.randint(4, 9) if is_weekend else random.randint(2, 6)

            for _ in range(num_sales):
                hour = random.randint(7, 20)
                minute = random.randint(0, 59)
                created_at = datetime.combine(day, datetime.min.time()) + timedelta(hours=hour, minutes=minute)

                cashier = random.choice(staff)
                num_items = random.randint(1, 4)
                chosen = random.sample(products, k=min(num_items, len(products)))

                sale_items_data = []
                total = 0.0
                for prod in chosen:
                    qty = random.randint(1, 5)
                    subtotal = round(prod.price * qty, 2)
                    total += subtotal
                    sale_items_data.append((prod, qty, subtotal))

                discount = round(total * random.choice([0, 0, 0, 0.05, 0.1]), 2)
                total = round(total - discount, 2)

                payment_method = random.choices(["mpesa", "cash"], weights=[55, 45])[0]
                is_returned = random.random() < 0.04

                if payment_method == "cash":
                    amount_paid = total if random.random() < 0.6 else round(total + random.choice([20, 50, 100, 200]), 2)
                    change_given = round(amount_paid - total, 2)
                    mpesa_ref = None
                    mpesa_phone = None
                else:
                    amount_paid = total
                    change_given = 0.0
                    mpesa_ref = f"S{random.randint(10000000, 99999999)}"
                    mpesa_phone = f"2547{random.randint(10000000, 99999999)}"

                receipt_number = f"{RECEIPT_PREFIX}{receipt_seq:05d}"
                receipt_seq += 1

                sale = Sale(
                    receipt_number=receipt_number,
                    total=total,
                    discount=discount,
                    payment_method=payment_method,
                    amount_paid=amount_paid,
                    change_given=change_given,
                    mpesa_ref=mpesa_ref,
                    mpesa_phone=mpesa_phone,
                    cashier_id=cashier.id,
                    cashier_name=cashier.name,
                    is_returned=is_returned,
                    shop_id=SHOP_ID,
                    created_at=created_at,
                )
                session.add(sale)
                session.commit()
                session.refresh(sale)
                sales_created += 1

                for prod, qty, subtotal in sale_items_data:
                    item = SaleItem(
                        sale_id=sale.id,
                        product_id=prod.id,
                        product_name=prod.name,
                        quantity=qty,
                        unit_price=prod.price,
                        subtotal=subtotal,
                    )
                    session.add(item)
                    items_created += 1
                session.commit()

        print(f"Seeded {sales_created} sales ({items_created} line items) for shop_id={SHOP_ID} "
              f"over the last {DAYS_BACK} days.")
        print(f"Receipt numbers prefixed '{RECEIPT_PREFIX}' for easy cleanup.")


if __name__ == "__main__":
    main()
