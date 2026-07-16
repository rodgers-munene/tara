import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import create_db_and_tables, run_migrations
from app.routes import categories, products, sales, auth
from app.routes import dashboard, customers, day_close, shops, admin, returns, owner, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    run_migrations()
    yield


app = FastAPI(
    title="Tara POS API",
    description="Backend service for Tara Point of Sale",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://tara-sigma.vercel.app,http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(dashboard.router)
app.include_router(customers.router)
app.include_router(day_close.router)
app.include_router(shops.router)
app.include_router(admin.router)
app.include_router(returns.router)
app.include_router(owner.router)
app.include_router(billing.router)


@app.get("/")
def health():
    return {"status": "healthy", "app": "Tara POS API"}
