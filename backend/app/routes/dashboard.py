from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies import get_current_user
from app.models import Sale, Product

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

    today_sales = [s for s in all_sales if s.created_at.date() == today]
    today_total = sum(s.total for s in today_sales)
    today_count = len(today_sales)
    today_cash = sum(s.total for s in today_sales if s.payment_method == "cash")
    today_mpesa = sum(s.total for s in today_sales if s.payment_method == "mpesa")

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

    week_total = sum(item["total"] for item in week_chart)
    week_count = sum(item["count"] for item in week_chart)

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
        .where(Product.stock <= 5)
    ).all()

    return {
        "today_total": round(today_total, 2),
        "today_count": today_count,
        "today_cash": round(today_cash, 2),
        "today_mpesa": round(today_mpesa, 2),
        "week_total": round(week_total, 2),
        "week_count": week_count,
        "week_chart": week_chart,
        "top_products": top_products,
        "low_stock_count": len(low_stock),
        "low_stock_items": [
            {"id": p.id, "name": p.name, "stock": p.stock}
            for p in sorted(low_stock, key=lambda x: x.stock)[:5]
        ],
    }
