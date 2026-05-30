from fastapi import APIRouter, Depends, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.redis import get_redis
from app.models.booking import Booking
from app.models.enums import PaymentStatus
from app.models.payment import Payment
from app.models.shipment import Shipment

router = APIRouter(prefix="/ussd", tags=["ussd"])

SUPPORT_LINE = "+255 800 CARGO"


@router.post("/callback")
async def ussd_callback(
    session_id: str = Form(...),
    phone_number: str = Form(...),
    text: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()
    session_key = f"ussd:{session_id}"
    parts = text.split("*") if text else []
    step = len(parts)

    if step == 0:
        return _con(
            "Welcome to CargoLink Africa\n"
            "1. Track Shipment\n"
            "2. Delivery Status\n"
            "3. Payment Status\n"
            "4. Contact Support"
        )

    choice = parts[0]

    if choice == "1":
        if step == 1:
            return _con("Enter Tracking Code:")
        return await _track_shipment(parts[1], db, brief=True)

    if choice == "2":
        if step == 1:
            return _con("Enter Tracking Code:")
        return await _track_shipment(parts[1], db, brief=False)

    if choice == "3":
        if step == 1:
            return _con("Enter Tracking Code:")
        return await _payment_status(parts[1], db)

    if choice == "4":
        await redis.delete(session_key)
        return _end(f"Contact: {SUPPORT_LINE} (CargoLink Support)")

    return _end("Invalid option. Dial again.")


async def _track_shipment(tracking_code: str, db: AsyncSession, brief: bool) -> str:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.shipment))
        .where(Booking.tracking_code == tracking_code.strip().upper())
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        return _end("Tracking code not found.")

    shipment: Shipment = booking.shipment
    eta_hours = (shipment.estimated_duration_minutes or 0) // 60

    if brief:
        return _con(
            f"Shipment {booking.tracking_code}\n"
            f"Status: {booking.status.value.replace('_', ' ').title()}\n"
            f"From: {shipment.pickup_address}\n"
            f"To: {shipment.destination_address}\n"
            f"ETA: {eta_hours} hours"
        )

    return _con(
        f"Booking {booking.tracking_code}\n"
        f"Status: {booking.status.value.replace('_', ' ').title()}\n"
        f"Shipment: {shipment.status.value.replace('_', ' ').title()}\n"
        f"From: {shipment.pickup_address}\n"
        f"To: {shipment.destination_address}\n"
        f"Total: TZS {int(booking.total_cost):,}"
    )


async def _payment_status(tracking_code: str, db: AsyncSession) -> str:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.payments))
        .where(Booking.tracking_code == tracking_code.strip().upper())
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        return _end("Tracking code not found.")

    if not booking.payments:
        return _end("Payment: Pending")

    latest = sorted(booking.payments, key=lambda p: p.created_at, reverse=True)[0]
    status_label = "Paid" if latest.status == PaymentStatus.COMPLETED else latest.status.value.title()
    return _end(f"Payment: {status_label}")


def _con(message: str) -> str:
    return f"CON {message}"


def _end(message: str) -> str:
    return f"END {message}"
