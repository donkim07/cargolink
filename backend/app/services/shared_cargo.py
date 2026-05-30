from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import SharedCargoBookingStatus, SharedCargoStatus, UserRole
from app.models.provider import Provider
from app.models.shared_cargo import SharedCargo, SharedCargoBooking
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.shared_cargo import SharedCargoBookRequest, SharedCargoCreate


async def create_shared_cargo(
    data: SharedCargoCreate,
    current_user: User,
    db: AsyncSession,
) -> SharedCargo:
    provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
    provider = provider_result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Provider profile required")

    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.id == data.vehicle_id, Vehicle.provider_id == provider.id)
    )
    vehicle = vehicle_result.scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    listing = SharedCargo(
        provider_id=provider.id,
        vehicle_id=vehicle.id,
        route_from=data.route_from,
        route_from_lat=data.route_from_lat,
        route_from_lng=data.route_from_lng,
        route_to=data.route_to,
        route_to_lat=data.route_to_lat,
        route_to_lng=data.route_to_lng,
        departure_date=data.departure_date,
        departure_time=data.departure_time,
        total_capacity_tons=data.total_capacity_tons,
        price_per_ton=data.price_per_ton,
    )
    db.add(listing)
    await db.flush()
    return listing


async def list_shared_cargo(
    db: AsyncSession,
    route_from: str | None = None,
    route_to: str | None = None,
    min_capacity: Decimal | None = None,
) -> list[SharedCargo]:
    query = (
        select(SharedCargo)
        .options(selectinload(SharedCargo.provider))
        .where(SharedCargo.status == SharedCargoStatus.OPEN)
    )

    if route_from:
        query = query.where(SharedCargo.route_from.ilike(f"%{route_from}%"))
    if route_to:
        query = query.where(SharedCargo.route_to.ilike(f"%{route_to}%"))

    result = await db.execute(query.order_by(SharedCargo.departure_date.asc()))
    listings = list(result.scalars().all())

    if min_capacity is not None:
        listings = [
            l for l in listings
            if (l.total_capacity_tons - l.used_capacity_tons) >= min_capacity
        ]

    return listings


async def book_shared_cargo(
    listing_id: UUID,
    data: SharedCargoBookRequest,
    current_user: User,
    db: AsyncSession,
) -> SharedCargoBooking:
    if current_user.role not in (UserRole.CUSTOMER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can book shared cargo")

    result = await db.execute(select(SharedCargo).where(SharedCargo.id == listing_id))
    listing = result.scalar_one_or_none()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.status != SharedCargoStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing not available")

    available = listing.total_capacity_tons - listing.used_capacity_tons
    if data.tons_booked > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {available} tons available",
        )

    total_cost = data.tons_booked * listing.price_per_ton
    booking = SharedCargoBooking(
        shared_cargo_id=listing.id,
        customer_id=current_user.id,
        tons_booked=data.tons_booked,
        total_cost=total_cost,
        cargo_description=data.cargo_description,
    )
    listing.used_capacity_tons += data.tons_booked
    if listing.used_capacity_tons >= listing.total_capacity_tons:
        listing.status = SharedCargoStatus.FULL

    db.add(booking)
    await db.flush()
    return booking
