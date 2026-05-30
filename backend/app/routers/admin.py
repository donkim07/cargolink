from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin import (
    AnalyticsResponse,
    AssignShipmentRequest,
    ProviderAdminResponse,
    ProviderAdminUpdate,
    ShipmentAdminUpdate,
    UserAdminResponse,
    UserAdminUpdate,
)
from app.schemas.shipment import ShipmentResponse
from app.services import admin as admin_service
from app.services.seed import seed_demo_data

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/seed-demo")
async def seed_demo(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await seed_demo_data(db)
    return {"message": "Demo data seeded"}


@router.get("/analytics", response_model=AnalyticsResponse)
async def analytics(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_analytics(db)


@router.get("/users", response_model=list[UserAdminResponse])
async def list_users(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_users(db)


@router.get("/users/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_user(user_id, db)


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: UUID,
    data: UserAdminUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.update_user(user_id, data.model_dump(exclude_unset=True), db)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await admin_service.delete_user(user_id, db)
    return {"message": "User deactivated"}


@router.get("/providers", response_model=list[ProviderAdminResponse])
async def list_providers(
    approved: bool | None = Query(None),
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    providers = await admin_service.list_all_providers(db, approved)
    return [
        ProviderAdminResponse(
            id=p.id,
            user_id=p.user_id,
            company_name=p.company_name,
            is_approved=p.is_approved,
            rating=float(p.rating),
            total_deliveries=p.total_deliveries,
            created_at=p.created_at,
            user_phone=p.user.phone if p.user else None,
        )
        for p in providers
    ]


@router.patch("/providers/{provider_id}", response_model=ProviderAdminResponse)
async def update_provider(
    provider_id: UUID,
    data: ProviderAdminUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    provider = await admin_service.update_provider(provider_id, data.model_dump(exclude_unset=True), db)
    return ProviderAdminResponse(
        id=provider.id,
        user_id=provider.user_id,
        company_name=provider.company_name,
        is_approved=provider.is_approved,
        rating=float(provider.rating),
        total_deliveries=provider.total_deliveries,
        created_at=provider.created_at,
        user_phone=provider.user.phone if provider.user else None,
    )


@router.delete("/providers/{provider_id}")
async def delete_provider(
    provider_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await admin_service.delete_provider(provider_id, db)
    return {"message": "Provider revoked"}


@router.post("/providers/{provider_id}/approve", response_model=ProviderAdminResponse)
async def approve_provider(
    provider_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    provider = await admin_service.approve_provider(provider_id, db)
    return ProviderAdminResponse(
        id=provider.id,
        user_id=provider.user_id,
        company_name=provider.company_name,
        is_approved=provider.is_approved,
        rating=float(provider.rating),
        total_deliveries=provider.total_deliveries,
        created_at=provider.created_at,
        user_phone=provider.user.phone if provider.user else None,
    )


@router.get("/shipments", response_model=list[ShipmentResponse])
async def list_shipments(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    shipments = await admin_service.list_all_shipments(db)
    return [ShipmentResponse.model_validate(s) for s in shipments]


@router.get("/shipments/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    shipment = await admin_service.get_shipment(shipment_id, db)
    return ShipmentResponse.model_validate(shipment)


@router.patch("/shipments/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: UUID,
    data: ShipmentAdminUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    shipment = await admin_service.update_shipment(shipment_id, data.model_dump(exclude_unset=True), db)
    return ShipmentResponse.model_validate(shipment)


@router.delete("/shipments/{shipment_id}")
async def delete_shipment(
    shipment_id: UUID,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await admin_service.delete_shipment(shipment_id, db)
    return {"message": "Shipment cancelled"}


@router.post("/shipments/{shipment_id}/assign")
async def assign_shipment(
    shipment_id: UUID,
    data: AssignShipmentRequest,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.assign_shipment_to_provider(
        shipment_id, data.provider_id, data.vehicle_id, db
    )
