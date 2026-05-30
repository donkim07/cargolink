from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CargoType, VehicleType


class ProviderRegister(BaseModel):
    company_name: str = Field(..., max_length=150)
    registration_number: str | None = Field(None, max_length=100)
    description: str | None = None
    logo_url: str | None = None


class VehicleCreate(BaseModel):
    type: VehicleType
    plate_number: str = Field(..., max_length=20)
    capacity_tons: Decimal | None = Field(None, gt=0)
    capacity_volume_m3: Decimal | None = Field(None, gt=0)
    year_of_manufacture: int | None = None
    photos: list[str] = []
    current_location_lat: Decimal | None = None
    current_location_lng: Decimal | None = None


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: VehicleType
    plate_number: str
    capacity_tons: Decimal | None
    capacity_volume_m3: Decimal | None
    is_available: bool
    year_of_manufacture: int | None
    photos: list | None


class ProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    company_name: str
    registration_number: str | None
    rating: Decimal
    total_deliveries: int
    response_rate: Decimal
    is_approved: bool
    logo_url: str | None
    description: str | None
    created_at: datetime
    vehicles: list[VehicleResponse] = []


class ProviderDashboard(BaseModel):
    pending_jobs: int
    active_deliveries: int
    monthly_earnings: Decimal
    fleet_available: int
    recent_jobs: list[dict] = []
