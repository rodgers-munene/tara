import os
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=True)


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
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS mpesa_phone VARCHAR",
                "ALTER TABLE sale ADD COLUMN IF NOT EXISTS is_returned BOOLEAN NOT NULL DEFAULT FALSE",
            ]
            for stmt in column_migrations:
                conn.execute(text(stmt))
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
