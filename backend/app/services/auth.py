from datetime import UTC, datetime, timedelta

from afri_auth import OTPAuth
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.enums import OTPPurpose, UserRole
from app.models.otp import OTPCode
from app.models.user import User
from app.schemas.auth import AuthResponse, UserResponse

_otp_auth: OTPAuth | None = None


def get_otp_auth() -> OTPAuth:
    global _otp_auth
    if _otp_auth is None:
        _otp_auth = OTPAuth(
            username=settings.at_username,
            api_key=settings.at_api_key,
        )
    return _otp_auth


async def send_otp(phone: str, purpose: OTPPurpose, db: AsyncSession) -> dict:
    otp = get_otp_auth()

    try:
        result = await otp.send_otp(phone)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send OTP: {exc}",
        ) from exc

    otp_record = OTPCode(
        phone=phone,
        code_hash="redis-managed",
        purpose=purpose,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    db.add(otp_record)
    await db.flush()

    return {
        "message": result.get("message", "OTP sent"),
        "expires_in": result.get("expires_in", 300),
    }


async def verify_otp_and_login(
    phone: str,
    code: str,
    purpose: OTPPurpose,
    db: AsyncSession,
    full_name: str | None = None,
    email: str | None = None,
    role: UserRole = UserRole.CUSTOMER,
) -> AuthResponse:
    otp = get_otp_auth()

    try:
        result = await otp.verify_otp(phone=phone, code=code)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OTP verification failed: {exc}",
        ) from exc

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Invalid or expired OTP"),
        )

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user is None:
        if purpose != OTPPurpose.REGISTRATION:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. Please register first.",
            )
        user = User(
            phone=phone,
            full_name=full_name,
            email=email,
            role=role,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.is_verified = True
        if full_name:
            user.full_name = full_name
        if email:
            user.email = email

    access_token = create_access_token(user.id, extra={"role": user.role.value})
    refresh_token = create_refresh_token(user.id)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


async def refresh_access_token(refresh_token: str, db: AsyncSession) -> dict:
    payload = verify_token(refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    from uuid import UUID

    user_id = UUID(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(user.id, extra={"role": user.role.value})
    new_refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }
