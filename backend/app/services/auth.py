import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.enums import OTPPurpose, UserRole
from app.models.otp import OTPCode
from app.models.user import User
from app.schemas.auth import AuthResponse, UserResponse
from app.services.at_client import AfricasTalkingSMSError, send_sms_message

OTP_EXPIRY_SECONDS = 300
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_REDIS_PREFIX = "otp:"
OTP_RESEND_PREFIX = "otp:resend:"


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


async def _check_resend_cooldown(phone: str) -> None:
    redis = await get_redis()
    ttl = await redis.ttl(f"{OTP_RESEND_PREFIX}{phone}")
    if ttl > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {ttl} seconds before requesting a new code",
            headers={"Retry-After": str(ttl)},
        )


async def send_otp(phone: str, purpose: OTPPurpose, db: AsyncSession, *, is_resend: bool = False) -> dict:
    if is_resend:
        await _check_resend_cooldown(phone)

    code = _generate_otp()
    redis = await get_redis()
    await redis.setex(f"{OTP_REDIS_PREFIX}{phone}", OTP_EXPIRY_SECONDS, code)
    await redis.setex(f"{OTP_RESEND_PREFIX}{phone}", OTP_RESEND_COOLDOWN_SECONDS, "1")

    message = f"Your CargoLink OTP is {code}. Expires in 5 minutes."

    try:
        await send_sms_message(phone, message, sender_id=settings.at_sms_sender or None)
    except AfricasTalkingSMSError as exc:
        await redis.delete(f"{OTP_REDIS_PREFIX}{phone}")
        await redis.delete(f"{OTP_RESEND_PREFIX}{phone}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send OTP: {exc}",
        ) from exc
    except Exception as exc:
        await redis.delete(f"{OTP_REDIS_PREFIX}{phone}")
        await redis.delete(f"{OTP_RESEND_PREFIX}{phone}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send OTP: {exc}",
        ) from exc

    otp_record = OTPCode(
        phone=phone,
        code_hash="redis-managed",
        purpose=purpose,
        expires_at=datetime.now(UTC) + timedelta(seconds=OTP_EXPIRY_SECONDS),
    )
    db.add(otp_record)
    await db.flush()

    return {
        "message": "OTP sent successfully",
        "expires_in": OTP_EXPIRY_SECONDS,
        "resend_available_in": OTP_RESEND_COOLDOWN_SECONDS,
    }


async def resend_otp(phone: str, purpose: OTPPurpose, db: AsyncSession) -> dict:
    return await send_otp(phone, purpose, db, is_resend=True)


async def verify_otp_and_login(
    phone: str,
    code: str,
    purpose: OTPPurpose,
    db: AsyncSession,
    full_name: str | None = None,
    email: str | None = None,
    role: UserRole = UserRole.CUSTOMER,
) -> AuthResponse:
    redis = await get_redis()
    stored_code = await redis.get(f"{OTP_REDIS_PREFIX}{phone}")

    if not stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired",
        )

    if stored_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    await redis.delete(f"{OTP_REDIS_PREFIX}{phone}")
    await redis.delete(f"{OTP_RESEND_PREFIX}{phone}")

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


async def update_profile(current_user: User, data: dict, db: AsyncSession) -> User:
    if "full_name" in data and data["full_name"] is not None:
        current_user.full_name = data["full_name"].strip() or None
    if "email" in data:
        current_user.email = str(data["email"]) if data["email"] else None
    if "profile_photo" in data:
        photo = data["profile_photo"]
        if photo and len(photo) > 500_000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile photo too large (max ~500KB)",
            )
        current_user.profile_photo = photo or None
    await db.flush()
    await db.refresh(current_user)
    return current_user
