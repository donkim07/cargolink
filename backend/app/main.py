from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.redis import close_redis
from app.routers import admin, auctions, auth, notifications, payments, providers, search, shared_cargo, shipments, tracking, ussd
from app.routers.ussd import _parse_ussd_form, process_ussd
from app.services.seed import seed_demo_data
from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.debug:
        async with AsyncSessionLocal() as db:
            await seed_demo_data(db)
            await db.commit()
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
app.include_router(notifications.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ussd.router, prefix="/api")


async def _handle_ussd_request(request: Request, db: AsyncSession) -> PlainTextResponse:
    form = await request.form()
    session_id, phone_number, text = _parse_ussd_form(form)
    if not session_id or not phone_number:
        return PlainTextResponse("END Invalid USSD request", status_code=400)
    body = await process_ussd(session_id, phone_number, text, db)
    return PlainTextResponse(body)


@app.post("/", response_class=PlainTextResponse)
@app.post("/ussd", response_class=PlainTextResponse)
async def ussd_root(request: Request, db: AsyncSession = Depends(get_db)):
    """Africa's Talking sandbox posts USSD callbacks to the server root by default."""
    return await _handle_ussd_request(request, db)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
