from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import close_redis
from app.routers import auctions, auth, payments, providers, shared_cargo, shipments, ussd


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(shipments.router, prefix="/api")
app.include_router(providers.router, prefix="/api")
app.include_router(auctions.router, prefix="/api")
app.include_router(shared_cargo.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(ussd.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
