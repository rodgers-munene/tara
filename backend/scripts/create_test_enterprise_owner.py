"""One-off script to create a test Owner account with an active Medium (top-tier)
subscription, for testing paid/multi-shop behavior end-to-end.

Run with: .venv/bin/python scripts/create_test_enterprise_owner.py
"""
import bcrypt
from sqlmodel import Session, select
from app.database import engine
from app.models import Owner
from app.pricing import activate_subscription

EMAIL = "enterprise-test@tara.dev"
NAME = "Enterprise Test Owner"
PIN = "1234"
TIER = "medium"
CYCLE = "yearly"


def main():
    with Session(engine) as session:
        existing = session.exec(select(Owner).where(Owner.email == EMAIL)).first()
        if existing:
            owner = existing
            print(f"Owner already exists (id={owner.id}), re-activating subscription.")
        else:
            pin_hash = bcrypt.hashpw(PIN.encode(), bcrypt.gensalt()).decode()
            owner = Owner(name=NAME, email=EMAIL, pin_hash=pin_hash)
            session.add(owner)
            session.commit()
            session.refresh(owner)
            print(f"Created owner id={owner.id}")

        activate_subscription(session, owner.id, TIER, CYCLE)
        session.refresh(owner)

        print(f"Email: {owner.email}")
        print(f"PIN: {PIN}")
        print(f"Plan: {owner.plan} ({owner.billing_cycle})")
        print(f"Status: {owner.subscription_status}, ends {owner.subscription_ends_at}")


if __name__ == "__main__":
    main()
