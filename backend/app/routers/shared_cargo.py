from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.shared_cargo import (
    SharedCargoBookRequest,
    SharedCargoBookingResponse,
    SharedCargoCreate,
    SharedCargoResponse,
)
from app.services import shared_cargo as shared_cargo_service

router = APIRouter(prefix="/shared-cargo", tags=["shared-cargo"])


def _enrich_listing(listing) -> SharedCargoResponse:
    response = SharedCargoResponse.model_validate(listing)
    response.available_capacity_tons = listing.total_capacity_tons - listing.used_capacity_tons
    return response


@router.post("", response_model=SharedCargoResponse, status_code=201)
async def create_listing(
    data: SharedCargoCreate,
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
):
    listing = await shared_cargo_service.create_shared_cargo(data, current_user, db)
    return _enrich_listing(listing)


@router.get("", response_model=list[SharedCargoResponse])
async def list_listings(
    route_from: str | None = Query(None),
    route_to: str | None = Query(None),
    min_capacity: Decimal | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    listings = await shared_cargo_service.list_shared_cargo(db, route_from, route_to, min_capacity)
    return [_enrich_listing(l) for l in listings]


@router.post("/{listing_id}/book", response_model=SharedCargoBookingResponse, status_code=201)
async def book_listing(
    listing_id: UUID,
    data: SharedCargoBookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await shared_cargo_service.book_shared_cargo(listing_id, data, current_user, db)
    return SharedCargoBookingResponse.model_validate(booking)
