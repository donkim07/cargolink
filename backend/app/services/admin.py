from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.enums import BookingStatus, NotificationType, ShipmentStatus, UserRole
from app.models.notification import Notification
from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def list_all_providers(db: AsyncSession, approved: bool | None = None) -> list[Provider]:
    query = select(Provider).options(selectinload(Provider.user), selectinload(Provider.vehicles))
    if approved is not None:
        query = query.where(Provider.is_approved.is_(approved))
    result = await db.execute(query.order_by(Provider.created_at.desc()))
    return list(result.scalars().all())


async def approve_provider(provider_id: UUID, db: AsyncSession) -> Provider:
    result = await db.execute(
        select(Provider).options(selectinload(Provider.user)).where(Provider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    provider.is_approved = True
    if provider.user:
        provider.user.role = UserRole.PROVIDER
    await db.flush()
    return provider


async def list_all_shipments(db: AsyncSession) -> list[Shipment]:
    result = await db.execute(
        select(Shipment)
        .options(selectinload(Shipment.customer), selectinload(Shipment.bookings))
        .order_by(Shipment.created_at.desc())
    )
    return list(result.scalars().all())


async def get_analytics(db: AsyncSession) -> dict:
    users = await db.scalar(select(func.count(User.id))) or 0
    providers = await db.scalar(select(func.count(Provider.id))) or 0
    shipments = await db.scalar(select(func.count(Shipment.id))) or 0
    active = await db.scalar(
        select(func.count(Shipment.id)).where(
            Shipment.status.in_([ShipmentStatus.BOOKED, ShipmentStatus.IN_TRANSIT])
        )
    ) or 0
    revenue = await db.scalar(
        select(func.coalesce(func.sum(Booking.total_cost), 0)).where(
            Booking.status == BookingStatus.DELIVERED
        )
    ) or 0
    return {
        "total_users": users,
        "total_providers": providers,
        "total_shipments": shipments,
        "active_shipments": active,
        "total_revenue": float(revenue),
    }


async def assign_shipment_to_provider(
    shipment_id: UUID,
    provider_id: UUID,
    vehicle_id: UUID,
    db: AsyncSession,
) -> dict:
    from app.services.providers import book_with_provider

    admin_result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    admin = admin_result.scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No admin user found")

    booking = await book_with_provider(shipment_id, provider_id, vehicle_id, admin, db)

    customer_result = await db.execute(
        select(Shipment).options(selectinload(Shipment.customer)).where(Shipment.id == shipment_id)
    )
    shipment = customer_result.scalar_one_or_none()
    if shipment and shipment.customer:
        db.add(
            Notification(
                user_id=shipment.customer.id,
                type=NotificationType.BOOKING_UPDATE,
                title="Shipment Assigned",
                message=f"Your shipment has been assigned. Tracking: {booking.tracking_code}",
            )
        )
    await db.flush()

    return {
        "booking_id": str(booking.id),
        "tracking_code": booking.tracking_code,
        "total_cost": float(booking.total_cost),
    }
