from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.payment import PaymentInitiateRequest, PaymentInitiateResponse, PaymentResponse
from app.services import payments as payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    data: PaymentInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await payment_service.initiate_payment(data, current_user, db)
    return PaymentInitiateResponse(**result)


@router.post("/callback")
async def payment_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(None, alias="x-api-key"),
):
    payload = await request.json()
    return await payment_service.handle_payment_callback(payload, x_api_key, db)


@router.get("/status/{reference}", response_model=PaymentResponse)
async def payment_status(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await payment_service.get_payment_status(reference, current_user, db)
    return PaymentResponse.model_validate(payment)
