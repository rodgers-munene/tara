"""One-off script to grandfather in owners created before email verification
became blocking. Marks every owner that isn't already verified as verified,
so nobody who signed up before this shipped gets locked out of login.

Run once, at deploy time, before/at the same moment the blocking check in
owner_login goes live: .venv/bin/python scripts/backfill_verified_owners.py
"""
from sqlmodel import Session, select
from app.database import engine
from app.models import Owner


def main():
    with Session(engine) as session:
        owners = session.exec(select(Owner).where(Owner.email_verified == False)).all()  # noqa: E712
        for owner in owners:
            owner.email_verified = True
            session.add(owner)
        session.commit()
        print(f"Verified {len(owners)} existing owner(s).")


if __name__ == "__main__":
    main()
