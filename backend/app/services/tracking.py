from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.redis import get_redis
from app.models.booking import Booking
from app.models.driver import Driver
from app.models.enums import BookingStatus, NotificationType, ShipmentStatus, UserRole
from app.models.notification import Notification
from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User
from app.services.route_intelligence import analyze_route, format_route_label, get_community_risks
from app.services import drivers as driver_service
from app.services.sms import (
    send_delivered_with_otp,
    send_driver_accepted,
    send_hazard_report_received,
    send_near_destination,
    send_region_checkpoint,
    send_route_risk_alert,
    send_shipment_started,
)


def _otp_key(booking_id: UUID) -> str:
    return f"booking:otp:{booking_id}"


def _checkpoint_key(booking_id: UUID) -> str:
    return f"booking:checkpoint:{booking_id}"


def _location_key(booking_id: UUID) -> str:
    return f"booking:location:{booking_id}"


async def _resolve_current_coords(
    booking: Booking, shipment: Shipment | None, redis
) -> tuple[float | None, float | None]:
    raw = await redis.get(_location_key(booking.id))
    if raw and "," in raw:
        lat, lng = raw.split(",", 1)
        return float(lat), float(lng)

    if shipment is None:
        return None, None

    pickup_lat = float(shipment.pickup_lat) if shipment.pickup_lat is not None else None
    pickup_lng = float(shipment.pickup_lng) if shipment.pickup_lng is not None else None
    dest_lat = float(shipment.destination_lat) if shipment.destination_lat is not None else None
    dest_lng = float(shipment.destination_lng) if shipment.destination_lng is not None else None

    if booking.status == BookingStatus.DELIVERED and dest_lat is not None and dest_lng is not None:
        return dest_lat, dest_lng
    if booking.status in (BookingStatus.IN_TRANSIT, BookingStatus.CONFIRMED):
        if pickup_lat is not None and dest_lat is not None and pickup_lng is not None and dest_lng is not None:
            return (pickup_lat + dest_lat) / 2, (pickup_lng + dest_lng) / 2
    if pickup_lat is not None and pickup_lng is not None:
        return pickup_lat, pickup_lng
    return None, None


async def generate_delivery_otp(booking_id: UUID) -> str:
    otp = f"{secrets.randbelow(9000) + 1000:04d}"
    redis = await get_redis()
    await redis.set(_otp_key(booking_id), otp, ex=60 * 60 * 72)
    return otp


async def get_delivery_otp(booking_id: UUID) -> str | None:
    redis = await get_redis()
    return await redis.get(_otp_key(booking_id))


async def get_booking_by_tracking(tracking_code: str, db: AsyncSession) -> Booking:
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.shipment).selectinload(Shipment.customer),
            selectinload(Booking.provider).selectinload(Provider.user),
            selectinload(Booking.provider).selectinload(Provider.drivers).selectinload(Driver.user),
            selectinload(Booking.vehicle),
            selectinload(Booking.driver).selectinload(Driver.user),
        )
        .where(Booking.tracking_code == tracking_code.strip().upper())
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracking code not found")
    return booking


def _driver_details(booking: Booking) -> tuple[str, str, str]:
    driver_name = "Dereva CargoLink"
    driver_phone = "+255700000000"

    if booking.driver and booking.driver.user:
        driver_name = booking.driver.user.full_name or driver_name
        driver_phone = booking.driver.user.phone
    elif booking.provider and booking.provider.drivers:
        for d in booking.provider.drivers:
            if d.user:
                driver_name = d.user.full_name or driver_name
                driver_phone = d.user.phone
                break
    elif booking.provider and booking.provider.user:
        driver_name = booking.provider.user.full_name or booking.provider.company_name
        driver_phone = booking.provider.user.phone

    plate = booking.vehicle.plate_number if booking.vehicle else "N/A"
    return driver_name, plate, driver_phone


async def notify_booking_accepted(booking: Booking, db: AsyncSession) -> str:
    shipment = booking.shipment
    customer = shipment.customer if shipment else None
    if not customer:
        return await generate_delivery_otp(booking.id)

    driver_name, plate, driver_phone = _driver_details(booking)
    otp = await generate_delivery_otp(booking.id)

    await send_driver_accepted(
        customer.phone,
        driver_name=driver_name,
        vehicle_plate=plate,
        driver_phone=driver_phone,
        tracking_code=booking.tracking_code,
        delivery_otp=otp,
        db=db,
    )

    db.add(
        Notification(
            user_id=customer.id,
            type=NotificationType.BOOKING_UPDATE,
            title="Driver Assigned",
            message=f"{driver_name} ({plate}) accepted shipment #{booking.tracking_code}. Delivery OTP: {otp}",
        )
    )

    if shipment:
        await _send_route_risk_sms(shipment, customer, db)

    return otp


async def _send_route_risk_sms(shipment: Shipment, customer: User, db: AsyncSession) -> None:
    risks = analyze_route(shipment.pickup_address, shipment.destination_address)
    redis = await get_redis()
    route_label = format_route_label(shipment.pickup_address, shipment.destination_address)
    community = await get_community_risks(redis, route_label)
    all_risks = risks + community

    for risk in all_risks[:2]:
        if risk.score < 40:
            continue
        await send_route_risk_alert(
            customer.phone,
            route_label=route_label,
            risk_type=risk.risk_type,
            location=risk.location,
            section=risk.section,
            score=risk.score,
            delay_minutes=risk.delay_minutes,
            advice=risk.advice,
            db=db,
        )


async def update_booking_status(
    tracking_code: str,
    new_status: BookingStatus,
    current_user: User,
    db: AsyncSession,
    *,
    region: str | None = None,
    delivery_otp: str | None = None,
) -> Booking:
    booking = await get_booking_by_tracking(tracking_code, db)
    shipment = booking.shipment
    driver_record = None

    if current_user.role not in (UserRole.ADMIN, UserRole.PROVIDER, UserRole.DRIVER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
        provider = provider_result.scalar_one_or_none()
        if provider is None or booking.provider_id != provider.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")

    if current_user.role == UserRole.DRIVER:
        driver_record = await driver_service.get_driver_for_user(current_user, db)
        if driver_record is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Driver profile not found")
        if booking.driver_id != driver_record.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assigned delivery")

    customer = shipment.customer if shipment else None
    route_label = format_route_label(
        shipment.pickup_address if shipment else None,
        shipment.destination_address if shipment else None,
    )

    current = booking.status

    if new_status == BookingStatus.CONFIRMED:
        if current != BookingStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cargo already accepted")
        if booking.driver_id is None and current_user.role == UserRole.DRIVER and driver_record:
            booking = await driver_service.accept_job(booking.id, driver_record, db)
            return booking
        if booking.driver_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assign a driver first, or wait for a driver to accept the job",
            )
        booking.status = BookingStatus.CONFIRMED
        if shipment:
            shipment.status = ShipmentStatus.BOOKED
        await notify_booking_accepted(booking, db)

    elif new_status == BookingStatus.IN_TRANSIT:
        if current != BookingStatus.CONFIRMED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start trip only after cargo is accepted")
        booking.status = BookingStatus.IN_TRANSIT
        if shipment:
            shipment.status = ShipmentStatus.IN_TRANSIT
        if customer:
            await send_shipment_started(customer.phone, booking.tracking_code, route_label, db)
            db.add(
                Notification(
                    user_id=customer.id,
                    type=NotificationType.BOOKING_UPDATE,
                    title="Shipment Started",
                    message=f"Your cargo #{booking.tracking_code} is on the way.",
                )
            )

    elif new_status == BookingStatus.DELIVERED:
        if current != BookingStatus.IN_TRANSIT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mark delivered only after trip started")
        stored_otp = await get_delivery_otp(booking.id)
        if stored_otp and delivery_otp and delivery_otp != stored_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid delivery OTP")

        booking.status = BookingStatus.DELIVERED
        booking.delivered_at = datetime.now(UTC)
        if shipment:
            shipment.status = ShipmentStatus.DELIVERED
        if booking.driver_id:
            driver_result = await db.execute(select(Driver).where(Driver.id == booking.driver_id))
            assigned_driver = driver_result.scalar_one_or_none()
            if assigned_driver:
                assigned_driver.is_available = True
        if customer:
            otp = stored_otp or await generate_delivery_otp(booking.id)
            await send_delivered_with_otp(customer.phone, booking.tracking_code, otp, db)
            db.add(
                Notification(
                    user_id=customer.id,
                    type=NotificationType.BOOKING_UPDATE,
                    title="Delivered",
                    message=f"Shipment #{booking.tracking_code} delivered successfully.",
                )
            )

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status transition")

    await db.flush()
    return booking


async def update_checkpoint(
    tracking_code: str,
    region: str,
    current_user: User,
    db: AsyncSession,
) -> Booking:
    booking = await get_booking_by_tracking(tracking_code, db)
    shipment = booking.shipment
    customer = shipment.customer if shipment else None

    if current_user.role not in (UserRole.ADMIN, UserRole.PROVIDER, UserRole.DRIVER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if current_user.role == UserRole.DRIVER:
        driver_record = await driver_service.get_driver_for_user(current_user, db)
        if driver_record is None or booking.driver_id != driver_record.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assigned delivery")
    elif current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
        provider = provider_result.scalar_one_or_none()
        if provider is None or booking.provider_id != provider.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")

    redis = await get_redis()
    await redis.set(_checkpoint_key(booking.id), region, ex=60 * 60 * 48)

    from app.services.maps import geocode_address

    try:
        geo = await geocode_address(region)
        await redis.set(
            _location_key(booking.id),
            f"{geo['lat']},{geo['lng']}",
            ex=60 * 60 * 48,
        )
    except Exception:
        pass

    if customer:
        await send_region_checkpoint(
            customer.phone, booking.tracking_code, region, settings.ussd_code, db
        )
        db.add(
            Notification(
                user_id=customer.id,
                type=NotificationType.BOOKING_UPDATE,
                title=f"Checkpoint: {region}",
                message=f"Shipment #{booking.tracking_code} has reached {region}.",
            )
        )

    dest_city = (shipment.destination_address or "").split(",")[0] if shipment else ""
    if dest_city and region.lower() in dest_city.lower() and customer:
        otp = await get_delivery_otp(booking.id) or await generate_delivery_otp(booking.id)
        await send_near_destination(customer.phone, booking.tracking_code, dest_city, otp, db)

    await db.flush()
    return booking


async def get_tracking_info(tracking_code: str, db: AsyncSession) -> dict:
    booking = await get_booking_by_tracking(tracking_code, db)
    shipment = booking.shipment
    redis = await get_redis()
    checkpoint = await redis.get(_checkpoint_key(booking.id))
    route_label = format_route_label(
        shipment.pickup_address if shipment else None,
        shipment.destination_address if shipment else None,
    )
    risks = analyze_route(
        shipment.pickup_address if shipment else None,
        shipment.destination_address if shipment else None,
    )
    community = await get_community_risks(redis, route_label)
    current_lat, current_lng = await _resolve_current_coords(booking, shipment, redis)

    return {
        "tracking_code": booking.tracking_code,
        "booking_status": booking.status.value,
        "shipment_status": shipment.status.value if shipment else None,
        "pickup": shipment.pickup_address if shipment else None,
        "destination": shipment.destination_address if shipment else None,
        "pickup_lat": float(shipment.pickup_lat) if shipment and shipment.pickup_lat is not None else None,
        "pickup_lng": float(shipment.pickup_lng) if shipment and shipment.pickup_lng is not None else None,
        "destination_lat": float(shipment.destination_lat) if shipment and shipment.destination_lat is not None else None,
        "destination_lng": float(shipment.destination_lng) if shipment and shipment.destination_lng is not None else None,
        "current_lat": current_lat,
        "current_lng": current_lng,
        "current_region": checkpoint,
        "eta_minutes": shipment.estimated_duration_minutes if shipment else None,
        "route_label": route_label,
        "risks": [
            {
                "risk_type": r.risk_type,
                "location": r.location,
                "section": r.section,
                "score": r.score,
                "delay_minutes": r.delay_minutes,
                "advice": r.advice,
            }
            for r in (risks + community)[:5]
        ],
    }


async def report_road_hazard(
    route_label: str,
    hazard_type: str,
    location: str,
    reporter_phone: str,
    db: AsyncSession,
) -> None:
    from app.services.route_intelligence import report_hazard

    section = route_label.strip()
    redis = await get_redis()
    await report_hazard(redis, route_label, hazard_type, location, section)
    await send_hazard_report_received(reporter_phone, hazard_type, location, db)
