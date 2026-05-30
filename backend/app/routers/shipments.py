from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.shipment import (
    BookingSummary,
    ShipmentCreate,
    ShipmentDetailResponse,
    ShipmentQuoteResponse,
    ShipmentResponse,
)
from app.services import shipments as shipment_service

router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.post("", response_model=ShipmentResponse, status_code=201)
async def create_shipment(
    data: ShipmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shipment = await shipment_service.create_shipment(data, current_user, db)
    return ShipmentResponse.model_validate(shipment)


@router.get("", response_model=list[ShipmentResponse])
async def list_shipments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shipments = await shipment_service.list_shipments(current_user, db)
    return [ShipmentResponse.model_validate(s) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentDetailResponse)
async def get_shipment(
    shipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shipment = await shipment_service.get_shipment(shipment_id, current_user, db)
    response = ShipmentDetailResponse.model_validate(shipment)
    response.bookings = [BookingSummary.model_validate(b) for b in shipment.bookings]
    return response


@router.post("/{shipment_id}/quote", response_model=ShipmentQuoteResponse)
async def quote_shipment(
    shipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await shipment_service.generate_quotes(shipment_id, current_user, db)
