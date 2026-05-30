from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.enums import BookingStatus
from app.models.user import User
from app.services import tracking as tracking_service

router = APIRouter(prefix="/tracking", tags=["tracking"])


class StatusUpdate(BaseModel):
    status: BookingStatus
    delivery_otp: str | None = None


class CheckpointUpdate(BaseModel):
    region: str = Field(..., min_length=2, max_length=120)


class HazardReport(BaseModel):
    route_label: str = Field(..., min_length=3)
    hazard_type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)


@router.get("/{tracking_code}")
async def get_tracking(
    tracking_code: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await tracking_service.get_tracking_info(tracking_code, db)


@router.get("/{tracking_code}/public")
async def get_tracking_public(
    tracking_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Public tracking info for USSD / share links."""
    return await tracking_service.get_tracking_info(tracking_code, db)


@router.post("/{tracking_code}/status")
async def update_status(
    tracking_code: str,
    data: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await tracking_service.update_booking_status(
        tracking_code,
        data.status,
        current_user,
        db,
        delivery_otp=data.delivery_otp,
    )
    return {
        "tracking_code": booking.tracking_code,
        "status": booking.status.value,
        "delivered_at": booking.delivered_at.isoformat() if booking.delivered_at else None,
    }


@router.post("/{tracking_code}/checkpoint")
async def update_checkpoint(
    tracking_code: str,
    data: CheckpointUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await tracking_service.update_checkpoint(
        tracking_code, data.region, current_user, db
    )
    return {"tracking_code": booking.tracking_code, "region": data.region}


@router.post("/hazards/report")
async def report_hazard(
    data: HazardReport,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await tracking_service.report_road_hazard(
        data.route_label,
        data.hazard_type,
        data.location,
        current_user.phone,
        db,
    )
    return {"message": "Hazard reported. Drivers on this route will be alerted."}
