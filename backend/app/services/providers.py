from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.booking import Booking
from app.models.enums import BookingStatus, NotificationType, ShipmentStatus, UserRole
from app.models.notification import Notification
from app.models.provider import Provider
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.provider import ProviderDashboard, ProviderRegister, VehicleCreate
from app.services.pricing import calculate_cost


async def list_providers(
    db: AsyncSession,
    vehicle_type: str | None = None,
    min_rating: float | None = None,
) -> list[Provider]:
    query = (
        select(Provider)
        .options(selectinload(Provider.vehicles))
        .where(Provider.is_approved.is_(True))
    )

    if min_rating is not None:
        query = query.where(Provider.rating >= min_rating)

    result = await db.execute(query.order_by(Provider.rating.desc()))
    providers = list(result.scalars().all())

    if vehicle_type:
        vt = vehicle_type.lower()
        providers = [p for p in providers if any(v.type.value == vt for v in p.vehicles)]

    return providers


async def get_provider(provider_id: UUID, db: AsyncSession) -> Provider:
    result = await db.execute(
        select(Provider)
        .options(selectinload(Provider.vehicles), selectinload(Provider.drivers))
        .where(Provider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider


async def register_provider(
    data: ProviderRegister,
    current_user: User,
    db: AsyncSession,
) -> Provider:
    existing = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already registered as provider")

    current_user.role = UserRole.PROVIDER
    provider = Provider(
        user_id=current_user.id,
        company_name=data.company_name,
        registration_number=data.registration_number,
        description=data.description,
        logo_url=data.logo_url,
        is_approved=settings.debug,
    )
    db.add(provider)
    await db.flush()

    db.add(
        Notification(
            user_id=current_user.id,
            type=NotificationType.SYSTEM,
            title="Provider Registration",
            message=(
                "Your provider profile is approved and live."
                if provider.is_approved
                else "Your provider profile is pending admin approval."
            ),
        )
    )
    await db.flush()
    return provider


async def add_vehicle(
    data: VehicleCreate,
    current_user: User,
    db: AsyncSession,
) -> Vehicle:
    provider = await _get_provider_for_user(current_user, db)

    existing = await db.execute(select(Vehicle).where(Vehicle.plate_number == data.plate_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plate number already registered")

    vehicle = Vehicle(
        provider_id=provider.id,
        type=data.type,
        plate_number=data.plate_number,
        capacity_tons=data.capacity_tons,
        capacity_volume_m3=data.capacity_volume_m3,
        year_of_manufacture=data.year_of_manufacture,
        photos=data.photos,
        current_location_lat=data.current_location_lat,
        current_location_lng=data.current_location_lng,
    )
    db.add(vehicle)
    await db.flush()
    return vehicle


async def get_provider_dashboard(current_user: User, db: AsyncSession) -> ProviderDashboard:
    provider = await _get_provider_for_user(current_user, db)

    pending_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.provider_id == provider.id,
            Booking.status == BookingStatus.PENDING,
        )
    )
    active_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.provider_id == provider.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.IN_TRANSIT]),
        )
    )
    earnings_result = await db.execute(
        select(func.coalesce(func.sum(Booking.total_cost), 0)).where(
            Booking.provider_id == provider.id,
            Booking.status == BookingStatus.DELIVERED,
            Booking.delivered_at >= datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        )
    )
    fleet_result = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.provider_id == provider.id,
            Vehicle.is_available.is_(True),
        )
    )

    recent_result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.shipment))
        .where(Booking.provider_id == provider.id)
        .order_by(Booking.created_at.desc())
        .limit(10)
    )
    recent_jobs = [
        {
            "id": str(b.id),
            "tracking_code": b.tracking_code,
            "status": b.status.value,
            "total_cost": float(b.total_cost),
        }
        for b in recent_result.scalars().all()
    ]

    return ProviderDashboard(
        pending_jobs=pending_result.scalar() or 0,
        active_deliveries=active_result.scalar() or 0,
        monthly_earnings=Decimal(str(earnings_result.scalar() or 0)),
        fleet_available=fleet_result.scalar() or 0,
        recent_jobs=recent_jobs,
    )


async def book_with_provider(
    shipment_id: UUID,
    provider_id: UUID,
    vehicle_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> Booking:
    from app.services.shipments import get_shipment

    shipment = await get_shipment(shipment_id, current_user, db)
    provider = await get_provider(provider_id, db)

    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.provider_id == provider.id)
    )
    vehicle = vehicle_result.scalar_one_or_none()
    if vehicle is None or not vehicle.is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle not available")

    if shipment.distance_km is None or shipment.weight_tons is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shipment missing pricing data")

    pricing = calculate_cost(
        distance_km=float(shipment.distance_km),
        weight_tons=float(shipment.weight_tons),
        volume_m3=float(shipment.volume_m3 or 0),
        vehicle_type=vehicle.type.value,
        urgency=shipment.urgency.value,
        requires_refrigeration=shipment.requires_refrigeration,
    )

    tracking_code = _generate_tracking_code()
    booking = Booking(
        shipment_id=shipment.id,
        provider_id=provider.id,
        vehicle_id=vehicle.id,
        base_cost=Decimal(str(pricing["base_cost"])),
        service_fee=Decimal(str(pricing["service_fee"])),
        insurance_fee=Decimal(str(pricing["insurance_fee"])),
        total_cost=Decimal(str(pricing["total_cost"])),
        tracking_code=tracking_code,
    )
    shipment.status = ShipmentStatus.BOOKED
    db.add(booking)

    customer_result = await db.execute(select(User).where(User.id == shipment.customer_id))
    customer = customer_result.scalar_one_or_none()
    if customer:
        db.add(
            Notification(
                user_id=customer.id,
                type=NotificationType.BOOKING_UPDATE,
                title="Booking Confirmed",
                message=f"Provider {provider.company_name} assigned. Tracking: {tracking_code}",
            )
        )

    await db.flush()
    return booking


async def get_provider_for_user(current_user: User, db: AsyncSession) -> Provider | None:
    result = await db.execute(
        select(Provider)
        .options(selectinload(Provider.vehicles))
        .where(Provider.user_id == current_user.id)
    )
    return result.scalar_one_or_none()


async def _get_provider_for_user(current_user: User, db: AsyncSession) -> Provider:
    provider = await get_provider_for_user(current_user, db)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found")
    return provider


def _generate_tracking_code() -> str:
    from datetime import datetime

    year = datetime.now(UTC).year
    import secrets

    suffix = secrets.token_hex(3).upper()[:6]
    return f"CL-{year}-{suffix}"
