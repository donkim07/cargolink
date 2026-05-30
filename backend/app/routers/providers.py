from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.provider import (
    ProviderDashboard,
    ProviderRegister,
    ProviderResponse,
    VehicleCreate,
    VehicleResponse,
)
from app.services import providers as provider_service

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=list[ProviderResponse])
async def list_providers(
    vehicle_type: str | None = Query(None),
    min_rating: float | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    providers = await provider_service.list_providers(db, vehicle_type, min_rating)
    return [ProviderResponse.model_validate(p) for p in providers]


@router.get("/dashboard", response_model=ProviderDashboard)
async def provider_dashboard(
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
):
    return await provider_service.get_provider_dashboard(current_user, db)


@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    provider = await provider_service.get_provider(provider_id, db)
    return ProviderResponse.model_validate(provider)


@router.post("/register", response_model=ProviderResponse, status_code=201)
async def register_provider(
    data: ProviderRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provider = await provider_service.register_provider(data, current_user, db)
    return ProviderResponse.model_validate(provider)


@router.post("/vehicles", response_model=VehicleResponse, status_code=201)
async def add_vehicle(
    data: VehicleCreate,
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
):
    vehicle = await provider_service.add_vehicle(data, current_user, db)
    return VehicleResponse.model_validate(vehicle)


@router.post("/book/{shipment_id}/{provider_id}/{vehicle_id}")
async def book_provider(
    shipment_id: UUID,
    provider_id: UUID,
    vehicle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await provider_service.book_with_provider(
        shipment_id, provider_id, vehicle_id, current_user, db
    )
    return {
        "id": str(booking.id),
        "tracking_code": booking.tracking_code,
        "total_cost": float(booking.total_cost),
        "status": booking.status.value,
    }
