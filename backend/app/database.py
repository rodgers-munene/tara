import os
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=True, pool_pre_ping=True, pool_recycle=300)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def run_migrations():
    """Idempotent migrations for multi-tenant shop_id columns."""
    try:
        with engine.connect() as conn:
            # Ensure a default shop exists, get its actual id (sequence may not start at 1)
            row = conn.execute(text("SELECT id FROM shop ORDER BY id LIMIT 1")).fetchone()
            if row is None:
                conn.execute(text(
                    "INSERT INTO shop (name, slug, plan, active, created_at) "
                    "VALUES ('Default Shop', 'default', 'free', true, NOW())"
                ))
                conn.commit()
                row = conn.execute(text("SELECT id FROM shop ORDER BY id LIMIT 1")).fetchone()

            default_shop_id = row[0] if row else None

            # Add columns that were added to models but not yet in the DB
            column_migrations = [
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS discount FLOAT NOT NULL DEFAULT 0",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS change_given FLOAT NOT NULL DEFAULT 0",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS mpesa_ref VARCHAR",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS mpesa_phone VARCHAR",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS is_returned BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS buying_price FLOAT NOT NULL DEFAULT 0",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 5",
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP",
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS subscription_status VARCHAR NOT NULL DEFAULT 'trialing'",
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR",
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP",
                # `plan` was superseded by owner.plan and dropped from the Shop model, but the
                # column's stale NOT NULL constraint still blocks every shop insert that omits it.
                "ALTER TABLE shop ALTER COLUMN plan DROP NOT NULL",
                # Audit (prompted by the mpesa_ref incident above): every other model field on
                # a pre-multi-tenant table that had no matching migration here, so a DB whose
                # tables predate these columns doesn't 500 on the first insert that sets them.
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS email VARCHAR",
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS phone VARCHAR",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS cashier_id INTEGER REFERENCES staff(id)",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS cashier_name VARCHAR",
                "ALTER TABLE category ADD COLUMN IF NOT EXISTS color VARCHAR",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS barcode VARCHAR",
                "ALTER TABLE customer ADD COLUMN IF NOT EXISTS notes VARCHAR",
                "ALTER TABLE credit_entry ADD COLUMN IF NOT EXISTS note VARCHAR",
                "ALTER TABLE day_close ADD COLUMN IF NOT EXISTS notes VARCHAR",
                "ALTER TABLE day_close ADD COLUMN IF NOT EXISTS closed_by VARCHAR",
                "ALTER TABLE staff ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'cashier'",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR NOT NULL DEFAULT 'unit'",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS unit_label VARCHAR",
                "ALTER TABLE product ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT TRUE",
                "ALTER TABLE product ALTER COLUMN stock TYPE DOUBLE PRECISION",
                "ALTER TABLE product ALTER COLUMN min_stock TYPE DOUBLE PRECISION",
                "ALTER TABLE saleitem ALTER COLUMN quantity TYPE DOUBLE PRECISION",
            ]
            for stmt in column_migrations:
                conn.execute(text(stmt))
            conn.commit()
            
            # Grandfather shops that existed before the paywall shipped — new shops always
            # get trial_ends_at set explicitly at creation, so this becomes a no-op once
            # every legacy row has been backfilled.
            conn.execute(text(
                "UPDATE shop SET subscription_status = 'active' WHERE trial_ends_at IS NULL"
            ))
            conn.commit()


            # Add owner_id to shop table
            conn.execute(text(
                "ALTER TABLE shop ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owner(id)"
            ))

            # Subscription now lives on the owner account (one bill covers up to N stores),
            # not per shop. Columns stay on `shop` (unused, harmless) since we never drop.
            owner_column_migrations = [
                "ALTER TABLE owner ADD COLUMN IF NOT EXISTS plan VARCHAR NOT NULL DEFAULT 'free'",
                "ALTER TABLE owner ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR",
                "ALTER TABLE owner ADD COLUMN IF NOT EXISTS subscription_status VARCHAR NOT NULL DEFAULT 'trialing'",
                "ALTER TABLE owner ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP",
                "ALTER TABLE owner ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP",
            ]
            for stmt in owner_column_migrations:
                conn.execute(text(stmt))
            conn.commit()

            # One-time backfill: copy each owner's subscription state up from their shops.
            # Guarded on still-at-defaults so this is a no-op once every owner is migrated,
            # and never clobbers a real activation that happened after cutover.
            conn.execute(text("""
                UPDATE owner SET
                    plan = sub.plan,
                    billing_cycle = sub.billing_cycle,
                    subscription_status = sub.subscription_status,
                    subscription_ends_at = sub.subscription_ends_at,
                    trial_ends_at = sub.trial_ends_at
                FROM (
                    SELECT DISTINCT ON (shop.owner_id)
                        shop.owner_id AS owner_id,
                        shop.plan AS plan,
                        shop.billing_cycle AS billing_cycle,
                        shop.subscription_status AS subscription_status,
                        shop.subscription_ends_at AS subscription_ends_at,
                        shop.trial_ends_at AS trial_ends_at
                    FROM shop
                    WHERE shop.owner_id IS NOT NULL
                    ORDER BY shop.owner_id,
                        CASE shop.plan WHEN 'medium' THEN 2 WHEN 'small' THEN 1 ELSE 0 END DESC,
                        CASE shop.subscription_status WHEN 'active' THEN 2 WHEN 'trialing' THEN 1 ELSE 0 END DESC,
                        shop.subscription_ends_at DESC NULLS LAST
                ) sub
                WHERE owner.id = sub.owner_id
                    AND owner.subscription_ends_at IS NULL
                    AND owner.plan = 'free'
                    AND owner.subscription_status = 'trialing'
                    AND sub.plan IS NOT NULL
            """))
            conn.commit()

            # Add shop_id column to every tenant table (no-op if already exists)
            tables = ["staff", "category", "product", "sale", "customer", "credit_entry", "day_close"]
            for table in tables:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS "
                    f"shop_id INTEGER REFERENCES shop(id)"
                ))

            # Backfill existing rows with the default shop's actual id
            if default_shop_id is not None:
                for table in tables:
                    conn.execute(text(
                        f"UPDATE {table} SET shop_id = :sid WHERE shop_id IS NULL"
                    ).bindparams(sid=default_shop_id))

            conn.commit()
            print(f"[migrations] OK — default shop_id={default_shop_id}")

    except Exception as e:
        print(f"[migrations] ERROR: {e}")
        raise
