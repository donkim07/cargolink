from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    MessageResponse,
    RefreshTokenRequest,
    SendOTPRequest,
    TokenResponse,
    UserResponse,
    VerifyOTPRequest,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-otp", response_model=MessageResponse)
async def send_otp(
    data: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.send_otp(data.phone, data.purpose, db)
    return MessageResponse(**result)


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(
    data: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.verify_otp_and_login(
        phone=data.phone,
        code=data.code,
        purpose=data.purpose,
        db=db,
        full_name=data.full_name,
        email=str(data.email) if data.email else None,
        role=data.role,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.refresh_access_token(data.refresh_token, db)
    return TokenResponse(**result)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
