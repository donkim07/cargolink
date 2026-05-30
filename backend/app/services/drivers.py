from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.driver import Driver
from app.models.enums import BookingStatus, NotificationType, ShipmentStatus, UserRole
from app.models.notification import Notification
from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User
from app.services.tracking import notify_booking_accepted


async def get_driver_for_user(current_user: User, db: AsyncSession) -> Driver | None:
    result = await db.execute(
        select(Driver)
        .options(selectinload(Driver.user), selectinload(Driver.provider))
        .where(Driver.user_id == current_user.id)
    )
    return result.scalar_one_or_none()


async def get_driver_or_404(current_user: User, db: AsyncSession) -> Driver:
    driver = await get_driver_for_user(current_user, db)
    if driver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found")
    return driver


async def register_driver(
    *,
    provider: Provider,
    user: User,
    license_number: str,
    db: AsyncSession,
) -> Driver:
    existing = await db.execute(select(Driver).where(Driver.user_id == user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a driver")

    if user.role in (UserRole.PROVIDER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with role '{user.role.value}' cannot be added as a driver",
        )

    user.role = UserRole.DRIVER
    driver = Driver(
        provider_id=provider.id,
        user_id=user.id,
        license_number=license_number,
        is_available=True,
    )
    db.add(driver)
    await db.flush()
    return await get_driver_with_user(driver.id, db)


async def get_driver_with_user(driver_id: UUID, db: AsyncSession) -> Driver:
    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.id == driver_id)
    )
    driver = result.scalar_one_or_none()
    if driver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    return driver


async def add_driver_to_provider(
    *,
    phone: str,
    license_number: str,
    full_name: str | None,
    current_user: User,
    db: AsyncSession,
) -> Driver:
    from app.schemas.driver import normalize_tz_phone

    normalized_phone = normalize_tz_phone(phone)

    provider_result = await db.execute(
        select(Provider).where(Provider.user_id == current_user.id)
    )
    provider_obj = provider_result.scalar_one_or_none()
    if provider_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found")

    user_result = await db.execute(select(User).where(User.phone == normalized_phone))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No account found for {normalized_phone}. "
                "Ask them to register on CargoLink first (Register → enter phone → OTP)."
            ),
        )

    if full_name:
        user.full_name = full_name

    return await register_driver(
        provider=provider_obj,
        user=user,
        license_number=license_number.strip(),
        db=db,
    )


async def list_provider_drivers(provider_id: UUID, db: AsyncSession) -> list[Driver]:
    result = await db.execute(
        select(Driver)
        .options(selectinload(Driver.user))
        .where(Driver.provider_id == provider_id)
        .order_by(Driver.created_at.desc())
    )
    return list(result.scalars().all())


async def _active_booking_for_driver(driver_id: UUID, db: AsyncSession) -> Booking | None:
    result = await db.execute(
        select(Booking)
        .where(
            Booking.driver_id == driver_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.IN_TRANSIT]),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def list_available_jobs(driver: Driver, db: AsyncSession) -> list[Booking]:
    active = await _active_booking_for_driver(driver.id, db)
    if active:
        return []

    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.shipment))
        .where(
            Booking.provider_id == driver.provider_id,
            Booking.status == BookingStatus.PENDING,
            Booking.driver_id.is_(None),
        )
        .order_by(Booking.created_at.asc())
    )
    return list(result.scalars().all())


async def notify_provider_drivers_new_job(booking: Booking, db: AsyncSession) -> None:
    result = await db.execute(
        select(Driver)
        .options(selectinload(Driver.user))
        .where(Driver.provider_id == booking.provider_id, Driver.is_available.is_(True))
    )
    drivers = list(result.scalars().all())
    shipment = booking.shipment
    route = ""
    if shipment:
        route = f"{shipment.pickup_address} → {shipment.destination_address}"

    for driver in drivers:
        if driver.user:
            db.add(
                Notification(
                    user_id=driver.user.id,
                    type=NotificationType.BOOKING_UPDATE,
                    title="New Delivery Job",
                    message=f"New shipment #{booking.tracking_code} {route}. Open Deliveries to accept.",
                )
            )
    await db.flush()


async def accept_job(booking_id: UUID, driver: Driver, db: AsyncSession) -> Booking:
    active = await _active_booking_for_driver(driver.id, db)
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active delivery. Complete it before accepting another.",
        )

    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.shipment).selectinload(Shipment.customer),
            selectinload(Booking.provider),
            selectinload(Booking.vehicle),
        )
        .where(Booking.id == booking_id)
        .with_for_update()
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.provider_id != driver.provider_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your provider's job")
    if booking.driver_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another driver already accepted this job")
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job is no longer available")

    booking.driver_id = driver.id
    booking.status = BookingStatus.CONFIRMED
    driver.is_available = False
    if booking.shipment:
        booking.shipment.status = ShipmentStatus.BOOKED

    await db.flush()
    await notify_booking_accepted(booking, db)
    return booking


async def assign_driver_to_booking(
    booking_id: UUID,
    driver_id: UUID,
    db: AsyncSession,
) -> Booking:
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.shipment).selectinload(Shipment.customer),
            selectinload(Booking.provider),
            selectinload(Booking.vehicle),
        )
        .where(Booking.id == booking_id)
        .with_for_update()
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    driver_result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.id == driver_id)
    )
    driver = driver_result.scalar_one_or_none()
    if driver is None or driver.provider_id != booking.provider_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid driver for this booking")

    active = await _active_booking_for_driver(driver.id, db)
    if active and active.id != booking.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver has another active delivery")

    booking.driver_id = driver.id
    if booking.status == BookingStatus.PENDING:
        booking.status = BookingStatus.CONFIRMED
        driver.is_available = False
        if booking.shipment:
            booking.shipment.status = ShipmentStatus.BOOKED
        await db.flush()
        await notify_booking_accepted(booking, db)
    else:
        await db.flush()

    return booking
