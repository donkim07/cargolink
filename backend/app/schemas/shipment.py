from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    BookingStatus,
    CargoType,
    ShipmentStatus,
    UrgencyLevel,
    VehicleType,
)


class ShipmentCreate(BaseModel):
    cargo_type: CargoType
    description: str | None = None
    weight_tons: Decimal = Field(..., gt=0)
    volume_m3: Decimal | None = Field(None, gt=0)
    pickup_address: str
    pickup_lat: Decimal | None = None
    pickup_lng: Decimal | None = None
    destination_address: str
    destination_lat: Decimal | None = None
    destination_lng: Decimal | None = None
    urgency: UrgencyLevel = UrgencyLevel.STANDARD
    requires_refrigeration: bool = False
    preferred_departure_date: date | None = None


class PriceBreakdown(BaseModel):
    base_cost: int
    service_fee: int
    insurance_fee: int
    total_cost: int
    currency: str = "TZS"


class QuoteItem(BaseModel):
    provider_id: UUID
    provider_name: str
    vehicle_type: VehicleType
    vehicle_id: UUID | None = None
    pricing: PriceBreakdown


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID
    cargo_type: CargoType
    description: str | None
    weight_tons: Decimal | None
    volume_m3: Decimal | None
    pickup_address: str | None
    pickup_lat: Decimal | None
    pickup_lng: Decimal | None
    destination_address: str | None
    destination_lat: Decimal | None
    destination_lng: Decimal | None
    distance_km: Decimal | None
    estimated_duration_minutes: int | None
    urgency: UrgencyLevel
    status: ShipmentStatus
    requires_refrigeration: bool
    preferred_departure_date: date | None
    created_at: datetime
    updated_at: datetime


class BookingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tracking_code: str
    status: BookingStatus
    total_cost: Decimal
    provider_id: UUID


class ShipmentDetailResponse(ShipmentResponse):
    bookings: list[BookingSummary] = []
    quotes: list[QuoteItem] = []


class ShipmentQuoteResponse(BaseModel):
    shipment_id: UUID
    quotes: list[QuoteItem]
