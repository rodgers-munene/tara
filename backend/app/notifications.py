import os
from datetime import date, timedelta

from app.email import send_email
from app.models import Owner

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tara.ekshop.store")

BRAND = "#16a34a"
BRAND_DARK = "#15803d"
BRAND_LIGHT = "#f0fdf4"
BG = "#fdf6ec"
SURFACE = "#fffdfa"
BORDER = "#f0dfc4"
TEXT = "#241a10"
TEXT_2 = "#5c4a3a"
TEXT_3 = "#8a7761"


def _layout(preheader: str, body_html: str) -> str:
    """Shared branded shell for every outbound email. Table-based for Outlook/old-client
    compatibility; every rule inlined since most email clients strip <style> blocks."""
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:{BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="padding:0 4px 20px 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:36px;height:36px;background:{BRAND};border-radius:10px;text-align:center;vertical-align:middle;">
                      <span style="color:#ffffff;font-size:19px;font-weight:700;line-height:36px;font-family:Georgia,serif;">T</span>
                    </td>
                    <td style="padding-left:10px;">
                      <span style="font-size:17px;font-weight:700;color:{TEXT};">Tara POS</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:{SURFACE};border:1.5px solid {BORDER};border-radius:20px;padding:32px 28px;">
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0 8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:{TEXT_3};line-height:1.6;">
                  Tara POS &mdash; point of sale for Kenyan shops<br/>
                  You're receiving this because you have an account at
                  <a href="{FRONTEND_URL}" style="color:{TEXT_3};">tara.ekshop.store</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _heading(text: str) -> str:
    return f'<h1 style="margin:0 0 4px 0;font-size:21px;font-weight:700;color:{TEXT};">{text}</h1>'


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px 0;font-size:14.5px;line-height:1.6;color:{TEXT_2};">{text}</p>'


def _button(label: str, link: str) -> str:
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px 0;">
  <tr>
    <td style="background:{BRAND};border-radius:12px;">
      <a href="{link}" style="display:inline-block;padding:13px 26px;font-size:14.5px;font-weight:600;color:#ffffff;text-decoration:none;">{label}</a>
    </td>
  </tr>
</table>"""


def _fallback_link(link: str) -> str:
    return f'<p style="margin:16px 0 0 0;font-size:12px;color:{TEXT_3};line-height:1.5;">Or paste this link into your browser:<br/><a href="{link}" style="color:{BRAND_DARK};word-break:break-all;">{link}</a></p>'


def _divider() -> str:
    return f'<hr style="border:none;border-top:1px solid {BORDER};margin:20px 0;"/>'


def send_verification_email(owner: Owner, token: str) -> bool:
    verify_link = f"{FRONTEND_URL}/owner/verify-email?token={token}"
    body = (
        _heading("Verify your email")
        + _p(f"Hi {owner.name.split(' ')[0]}, welcome to Tara POS. Confirm your email address to activate your account and sign in.")
        + _button("Verify email", verify_link)
        + _fallback_link(verify_link)
        + _divider()
        + f'<p style="margin:0;font-size:12.5px;color:{TEXT_3};">This link expires in 24 hours. If you didn\'t create a Tara POS account, you can safely ignore this email.</p>'
    )
    return send_email(
        to=owner.email,
        subject="Verify your Tara POS account",
        html=_layout("Confirm your email to activate your Tara POS account.", body),
    )


def send_subscription_success_email(owner: Owner) -> bool:
    plan_label = owner.plan.capitalize()
    ends_label = owner.subscription_ends_at.strftime("%d %b %Y") if owner.subscription_ends_at else "—"
    body = (
        _heading("Subscription activated")
        + _p(f"Hi {owner.name.split(' ')[0]}, your <strong style=\"color:{TEXT};\">{plan_label}</strong> plan ({owner.billing_cycle}) is now active.")
        + f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_LIGHT};border-radius:12px;margin:4px 0 16px 0;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0;font-size:13px;color:{TEXT_2};">Plan</p>
      <p style="margin:2px 0 12px 0;font-size:15px;font-weight:700;color:{TEXT};">{plan_label} &middot; {owner.billing_cycle}</p>
      <p style="margin:0;font-size:13px;color:{TEXT_2};">Valid through</p>
      <p style="margin:2px 0 0 0;font-size:15px;font-weight:700;color:{TEXT};">{ends_label}</p>
    </td>
  </tr>
</table>"""
        + _button("Go to dashboard", f"{FRONTEND_URL}/owner/dashboard")
        + _divider()
        + f'<p style="margin:0;font-size:12.5px;color:{TEXT_3};">Thanks for trusting Tara POS with your shop.</p>'
    )
    return send_email(
        to=owner.email,
        subject="Your Tara POS subscription is active",
        html=_layout(f"Your {plan_label} subscription is now active.", body),
    )


def send_trial_expiring_email(owner: Owner) -> bool:
    ends_label = owner.trial_ends_at.strftime("%d %b %Y") if owner.trial_ends_at else "soon"
    billing_link = f"{FRONTEND_URL}/owner/billing"
    body = (
        _heading("Your trial is ending soon")
        + _p(f"Hi {owner.name.split(' ')[0]}, your free trial ends on <strong style=\"color:{TEXT};\">{ends_label}</strong>. Subscribe now to keep your shops, staff, and sales history without interruption.")
        + _button("Choose a plan", billing_link)
        + _fallback_link(billing_link)
    )
    return send_email(
        to=owner.email,
        subject="Your Tara POS trial is ending soon",
        html=_layout(f"Your trial ends {ends_label} — subscribe to keep access.", body),
    )


def send_subscription_expiring_email(owner: Owner) -> bool:
    ends_label = owner.subscription_ends_at.strftime("%d %b %Y") if owner.subscription_ends_at else "soon"
    billing_link = f"{FRONTEND_URL}/owner/billing"
    body = (
        _heading("Your subscription is expiring soon")
        + _p(f"Hi {owner.name.split(' ')[0]}, your <strong style=\"color:{TEXT};\">{owner.plan.capitalize()}</strong> subscription expires on <strong style=\"color:{TEXT};\">{ends_label}</strong>. Renew now to avoid losing access to your shops.")
        + _button("Renew your plan", billing_link)
        + _fallback_link(billing_link)
    )
    return send_email(
        to=owner.email,
        subject="Your Tara POS subscription is expiring soon",
        html=_layout(f"Your subscription expires {ends_label} — renew to keep access.", body),
    )


def send_weekly_summary_email(owner: Owner, summary: dict) -> bool:
    """summary shape produced by app.routes.cron:_build_weekly_summary"""
    week_start: date = summary["week_start"]
    week_end: date = summary["week_end"]
    week_label = f"{week_start.strftime('%d %b')} – {week_end.strftime('%d %b %Y')}"
    total_revenue = summary["total_revenue"]
    total_sales = summary["total_sales"]
    avg_sale = summary["avg_sale"]
    top_products = summary["top_products"]
    shops = summary["shops"]

    if total_sales == 0:
        headline_body = (
            _heading("This week's shop summary")
            + _p(f"Hi {owner.name.split(' ')[0]}, no sales were recorded across your shop{'s' if len(shops) != 1 else ''} for {week_label}.")
        )
    else:
        headline_body = (
            _heading("This week's shop summary")
            + _p(f"Hi {owner.name.split(' ')[0]}, here's how your shop{'s' if len(shops) != 1 else ''} did for {week_label}.")
            + f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_LIGHT};border-radius:12px;margin:4px 0 20px 0;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0;font-size:12.5px;color:{TEXT_2};">Total revenue</p>
      <p style="margin:2px 0 14px 0;font-size:24px;font-weight:700;color:{BRAND_DARK};">KSh {total_revenue:,.0f}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;">
            <p style="margin:0;font-size:12.5px;color:{TEXT_2};">Sales made</p>
            <p style="margin:2px 0 0 0;font-size:16px;font-weight:700;color:{TEXT};">{total_sales}</p>
          </td>
          <td style="width:50%;">
            <p style="margin:0;font-size:12.5px;color:{TEXT_2};">Avg. sale value</p>
            <p style="margin:2px 0 0 0;font-size:16px;font-weight:700;color:{TEXT};">KSh {avg_sale:,.0f}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""
        )

    shops_rows = ""
    if len(shops) > 1:
        rows = "".join(
            f"""\
<tr>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;color:{TEXT};">{s['name']}</td>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;color:{TEXT_2};text-align:right;">{s['sales_count']} sales</td>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;font-weight:600;color:{TEXT};text-align:right;">KSh {s['revenue']:,.0f}</td>
</tr>"""
            for s in shops
        )
        shops_rows = (
            f'<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:{TEXT_2};text-transform:uppercase;letter-spacing:0.03em;">By shop</p>'
            + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">{rows}</table>'
        )

    products_rows = ""
    if top_products:
        rows = "".join(
            f"""\
<tr>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;color:{TEXT};">{p['name']}</td>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;color:{TEXT_2};text-align:right;">{p['qty']:g} sold</td>
  <td style="padding:9px 0;border-top:1px solid {BORDER};font-size:13.5px;font-weight:600;color:{TEXT};text-align:right;">KSh {p['revenue']:,.0f}</td>
</tr>"""
            for p in top_products
        )
        products_rows = (
            f'<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:{TEXT_2};text-transform:uppercase;letter-spacing:0.03em;">Top products</p>'
            + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">{rows}</table>'
        )

    body = (
        headline_body
        + shops_rows
        + products_rows
        + _button("View full dashboard", f"{FRONTEND_URL}/owner/dashboard")
    )
    return send_email(
        to=owner.email,
        subject=f"Your Tara POS week in review — {week_label}",
        html=_layout(f"KSh {total_revenue:,.0f} across {total_sales} sales this week.", body),
    )
