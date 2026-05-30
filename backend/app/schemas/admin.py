from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ShipmentStatus, UserRole


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phone: str
    full_name: str | None
    email: str | None
    role: UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime


class ProviderAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    company_name: str
    is_approved: bool
    rating: float
    total_deliveries: int
    created_at: datetime
    user_phone: str | None = None


class AnalyticsResponse(BaseModel):
    total_users: int
    total_providers: int
    total_shipments: int
    active_shipments: int
    total_revenue: float


class AssignShipmentRequest(BaseModel):
    provider_id: UUID
    vehicle_id: UUID
    driver_id: UUID | None = None


class UserAdminUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class ProviderAdminUpdate(BaseModel):
    company_name: str | None = None
    is_approved: bool | None = None


class ShipmentAdminUpdate(BaseModel):
    status: ShipmentStatus | None = None
