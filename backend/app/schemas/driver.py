from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.booking import Booking
from app.models.driver import Driver


def normalize_tz_phone(phone: str) -> str:
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("0") and len(cleaned) == 10:
        cleaned = "+255" + cleaned[1:]
    elif cleaned.startswith("255") and not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    elif not cleaned.startswith("+") and cleaned.isdigit():
        cleaned = "+255" + cleaned
    return cleaned


class DriverCreate(BaseModel):
    phone: str = Field(..., min_length=9, max_length=20)
    license_number: str = Field(..., max_length=50)
    full_name: str | None = Field(None, max_length=100)


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    user_id: UUID
    license_number: str
    is_available: bool
    rating: Decimal
    full_name: str | None = None
    phone: str | None = None
    created_at: datetime

    @classmethod
    def from_model(cls, driver: Driver) -> "DriverResponse":
        return cls(
            id=driver.id,
            provider_id=driver.provider_id,
            user_id=driver.user_id,
            license_number=driver.license_number,
            is_available=driver.is_available,
            rating=driver.rating,
            full_name=driver.user.full_name if driver.user else None,
            phone=driver.user.phone if driver.user else None,
            created_at=driver.created_at,
        )


class DriverJobResponse(BaseModel):
    booking_id: UUID
    shipment_id: UUID
    tracking_code: str
    pickup_address: str | None
    destination_address: str | None
    total_cost: Decimal
    status: str

    @classmethod
    def from_booking(cls, booking: Booking) -> "DriverJobResponse":
        shipment = booking.shipment
        return cls(
            booking_id=booking.id,
            shipment_id=booking.shipment_id,
            tracking_code=booking.tracking_code,
            pickup_address=shipment.pickup_address if shipment else None,
            destination_address=shipment.destination_address if shipment else None,
            total_cost=booking.total_cost,
            status=booking.status.value,
        )
