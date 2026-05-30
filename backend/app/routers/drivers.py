from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverResponse, DriverJobResponse
from app.services import drivers as driver_service

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/me", response_model=DriverResponse | None)
async def get_my_driver(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    driver = await driver_service.get_driver_for_user(current_user, db)
    if driver is None:
        return None
    return DriverResponse.from_model(driver)


@router.get("/jobs", response_model=list[DriverJobResponse])
async def list_jobs(
    current_user: User = Depends(require_roles(UserRole.DRIVER)),
    db: AsyncSession = Depends(get_db),
):
    driver = await driver_service.get_driver_or_404(current_user, db)
    bookings = await driver_service.list_available_jobs(driver, db)
    return [DriverJobResponse.from_booking(b) for b in bookings]


@router.post("/jobs/{booking_id}/accept")
async def accept_job(
    booking_id: UUID,
    current_user: User = Depends(require_roles(UserRole.DRIVER)),
    db: AsyncSession = Depends(get_db),
):
    driver = await driver_service.get_driver_or_404(current_user, db)
    booking = await driver_service.accept_job(booking_id, driver, db)
    return {
        "booking_id": str(booking.id),
        "tracking_code": booking.tracking_code,
        "status": booking.status.value,
    }
