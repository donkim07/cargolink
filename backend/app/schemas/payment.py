from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMethod, PaymentStatus


class PaymentInitiateRequest(BaseModel):
    booking_id: UUID | None = None
    shared_cargo_booking_id: UUID | None = None
    payment_method: PaymentMethod
    phone: str = Field(..., pattern=r"^\+255\d{9}$")


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID | None
    shared_cargo_booking_id: UUID | None
    customer_id: UUID
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    provider_reference: str | None
    status: PaymentStatus
    paid_at: datetime | None
    created_at: datetime


class PaymentInitiateResponse(BaseModel):
    payment_id: UUID
    reference: str
    message: str
    amount: Decimal
    currency: str = "TZS"
