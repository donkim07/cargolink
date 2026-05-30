from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin import AnalyticsResponse, AssignShipmentRequest, ProviderAdminResponse, UserAdminResponse
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
