from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import OTPPurpose, UserRole


class SendOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+255\d{9}$", examples=["+255712345678"])
    purpose: OTPPurpose


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+255\d{9}$")
    code: str = Field(..., min_length=4, max_length=8)
    purpose: OTPPurpose
    full_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    role: UserRole = UserRole.CUSTOMER


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phone: str
    full_name: str | None
    email: str | None
    role: UserRole
    is_verified: bool
    is_active: bool
    profile_photo: str | None
    created_at: datetime


class AuthResponse(TokenResponse):
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
    expires_in: int | None = None
    resend_available_in: int | None = None
