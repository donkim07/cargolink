from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SharedCargoBookingStatus, SharedCargoStatus


class SharedCargoCreate(BaseModel):
    vehicle_id: UUID
    route_from: str
    route_from_lat: Decimal | None = None
    route_from_lng: Decimal | None = None
    route_to: str
    route_to_lat: Decimal | None = None
    route_to_lng: Decimal | None = None
    departure_date: date
    departure_time: time | None = None
    total_capacity_tons: Decimal = Field(..., gt=0)
    price_per_ton: Decimal = Field(..., gt=0)


class SharedCargoBookRequest(BaseModel):
    tons_booked: Decimal = Field(..., gt=0)
    cargo_description: str | None = None


class SharedCargoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    vehicle_id: UUID
    route_from: str
    route_to: str
    departure_date: date
    departure_time: time | None
    total_capacity_tons: Decimal
    used_capacity_tons: Decimal
    price_per_ton: Decimal
    status: SharedCargoStatus
    created_at: datetime
    available_capacity_tons: Decimal | None = None


class SharedCargoBookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shared_cargo_id: UUID
    customer_id: UUID
    tons_booked: Decimal
    total_cost: Decimal
    cargo_description: str | None
    status: SharedCargoBookingStatus
    created_at: datetime
