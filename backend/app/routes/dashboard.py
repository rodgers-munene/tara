from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, SaleItem, Product

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def get_stats(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    shop_id = current_user.get("shop_id")
    today = date.today()
    week_ago = today - timedelta(days=6)
    month_ago = today - timedelta(days=30)

    all_sales = session.exec(select(Sale).where(Sale.shop_id == shop_id)).all()

    # Build buying-price lookup: product_id -> buying_price
    products = session.exec(select(Product).where(Product.shop_id == shop_id)).all()
    buying_prices: dict[int, float] = {p.id: p.buying_price for p in products if p.id is not None}

    def sale_profit(sale: Sale) -> float:
        profit = 0.0
        for item in sale.items:
            cost = buying_prices.get(item.product_id or -1, 0.0)
            profit += (item.unit_price - cost) * item.quantity
        return profit

    today_sales = [s for s in all_sales if s.created_at.date() == today and not s.is_returned]
    today_total = sum(s.total for s in today_sales)
    today_count = len(today_sales)
    today_cash = sum(s.total for s in today_sales if s.payment_method == "cash")
    today_mpesa = sum(s.total for s in today_sales if s.payment_method == "mpesa")
    today_profit = sum(sale_profit(s) for s in today_sales)

    week_chart = []
    for i in range(7):
        d = week_ago + timedelta(days=i)
        day_sales = [s for s in all_sales if s.created_at.date() == d]
        week_chart.append({
            "date": d.isoformat(),
            "day": d.strftime("%a"),
            "total": round(sum(s.total for s in day_sales), 2),
            "count": len(day_sales),
        })

    week_sales = [s for s in all_sales if s.created_at.date() >= week_ago and not s.is_returned]
    week_total = sum(item["total"] for item in week_chart)
    week_count = sum(item["count"] for item in week_chart)
    week_profit = sum(sale_profit(s) for s in week_sales)

    product_totals: dict[str, dict] = {}
    for sale in all_sales:
        if sale.created_at.date() >= month_ago:
            for item in sale.items:
                key = item.product_name
                if key not in product_totals:
                    product_totals[key] = {"name": key, "qty": 0, "revenue": 0.0}
                product_totals[key]["qty"] += item.quantity
                product_totals[key]["revenue"] += item.subtotal

    top_products = sorted(product_totals.values(), key=lambda x: x["qty"], reverse=True)[:5]
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)

    low_stock = session.exec(
        select(Product)
        .where(Product.shop_id == shop_id)
        .where(Product.active == True)
        .where(Product.stock <= Product.min_stock)
    ).all()

    total_products = session.exec(
        select(Product).where(Product.shop_id == shop_id).where(Product.active == True)
    ).all()

    recent_sales = sorted(all_sales, key=lambda s: s.created_at, reverse=True)[:5]

    return {
        "total_products": len(total_products),
        "recent_transactions": [
            {
                "id": s.id,
                "receipt_number": s.receipt_number,
                "total": s.total,
                "payment_method": s.payment_method,
                "cashier_name": s.cashier_name,
                "item_count": len(s.items),
                "is_returned": s.is_returned,
                "created_at": s.created_at.isoformat(),
            }
            for s in recent_sales
        ],
        "today_total": round(today_total, 2),
        "today_count": today_count,
        "today_cash": round(today_cash, 2),
        "today_mpesa": round(today_mpesa, 2),
        "today_profit": round(today_profit, 2),
        "week_total": round(week_total, 2),
        "week_count": week_count,
        "week_profit": round(week_profit, 2),
        "week_chart": week_chart,
        "top_products": top_products,
        "low_stock_count": len(low_stock),
        "low_stock_items": [
            {"id": p.id, "name": p.name, "stock": p.stock}
            for p in sorted(low_stock, key=lambda x: x.stock)[:5]
        ],
    }
