import os
import requests

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Tara POS <onboarding@resend.dev>")


def send_email(to: str, subject: str, html: str) -> bool:
    """Sends via Resend. Returns False (never raises) if unconfigured or the API call fails,
    so callers can still return a generic success response and avoid leaking account state."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY not set — skipping send to {to}: {subject}")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": RESEND_FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            timeout=15,
        )
        if not resp.ok:
            print(f"[email] Resend error {resp.status_code}: {resp.text}")
            return False
        return True
    except requests.RequestException as e:
        print(f"[email] send failed: {e}")
        return False
