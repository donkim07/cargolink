from fastapi import APIRouter, Depends, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.models.booking import Booking
from app.models.enums import PaymentStatus
from app.models.payment import Payment
from app.models.shipment import Shipment
from app.models.user import User
from app.services.route_intelligence import analyze_route, format_route_label, report_hazard
from app.services.tracking import get_tracking_info

router = APIRouter(prefix="/ussd", tags=["ussd"])

SUPPORT_LINE = "+255 800 CARGO"
USSD_CODE = settings.ussd_code

ROUTE_OPTIONS = {
    "1": ("Dar es Salaam → Morogoro", "Dar es Salaam", "Morogoro"),
    "2": ("Morogoro → Dodoma", "Morogoro", "Dodoma"),
    "3": ("Dar es Salaam → Dodoma", "Dar es Salaam", "Dodoma"),
    "4": ("Dar es Salaam → Mwanza", "Dar es Salaam", "Mwanza"),
}

HAZARD_TYPES = {
    "1": "Flood",
    "2": "Accident",
    "3": "Road Works",
    "4": "Traffic Jam",
}


@router.post("/callback")
async def ussd_callback(
    session_id: str = Form(...),
    phone_number: str = Form(...),
    text: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()
    session_key = f"ussd:session:{session_id}"
    parts = [p.strip() for p in text.split("*") if p.strip()] if text else []
    step = len(parts)

    if step == 0:
        await redis.set(session_key, "root", ex=300)
        return _con(
            "Karibu CargoLink Africa\n"
            "1. Track Shipment\n"
            "2. Delivery Status\n"
            "3. Payment Status\n"
            "4. My Shipments\n"
            "5. Route Alerts\n"
            "6. Report Hazard\n"
            "7. Contact Support"
        )

    choice = parts[0]

    if choice == "1":
        if step == 1:
            await redis.set(session_key, "track", ex=300)
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
        return await _my_shipments(phone_number, db)

    if choice == "5":
        if step == 1:
            return _con(
                "Select route:\n"
                "1. Dar-Morogoro\n"
                "2. Morogoro-Dodoma\n"
                "3. Dar-Dodoma\n"
                "4. Dar-Mwanza"
            )
        route = ROUTE_OPTIONS.get(parts[1])
        if not route:
            return _end("Invalid route.")
        return await _route_alerts(route[1], route[2])

    if choice == "6":
        if step == 1:
            return _con(
                "Select route:\n"
                "1. Dar-Morogoro\n"
                "2. Morogoro-Dodoma\n"
                "3. Dar-Dodoma\n"
                "4. Dar-Mwanza"
            )
        if step == 2:
            await redis.set(session_key, f"hazard:{parts[1]}", ex=300)
            return _con(
                "Hazard type:\n"
                "1. Flood\n"
                "2. Accident\n"
                "3. Road Works\n"
                "4. Traffic Jam"
            )
        if step == 3:
            route_key = await redis.get(session_key)
            route_id = route_key.split(":")[-1] if route_key else parts[1]
            route = ROUTE_OPTIONS.get(route_id, ROUTE_OPTIONS["1"])
            hazard = HAZARD_TYPES.get(parts[2], "Hazard")
            await report_hazard(
                redis,
                format_route_label(route[1], route[2]),
                hazard,
                route[1],
                f"{route[1]} → {route[2]}",
            )
            from app.services.sms import send_hazard_report_received

            await send_hazard_report_received(phone_number, hazard, route[1], db)
            await redis.delete(session_key)
            return _end(f"Imepokelewa! {hazard} @ {route[1]}. Madereva wamearifiwa. Asante!")

    if choice == "7":
        await redis.delete(session_key)
        return _end(f"Contact: {SUPPORT_LINE}\nUSSD: {USSD_CODE}")

    return _end("Invalid option. Dial again.")


async def _track_shipment(tracking_code: str, db: AsyncSession, brief: bool) -> str:
    try:
        info = await get_tracking_info(tracking_code, db)
    except Exception:
        return _end("Tracking code not found.")

    eta_hours = (info.get("eta_minutes") or 0) // 60
    region = info.get("current_region") or "In transit"
    risk_line = ""
    risks = info.get("risks") or []
    if risks:
        top = risks[0]
        risk_line = f"\nAlert: {top['risk_type']} @ {top['location']} ({top['score']}/100)"

    if brief:
        return _con(
            f"Shipment {info['tracking_code']}\n"
            f"Status: {info['booking_status'].replace('_', ' ').title()}\n"
            f"From: {info['pickup']}\n"
            f"To: {info['destination']}\n"
            f"Region: {region}\n"
            f"ETA: {eta_hours}h{risk_line}"
        )

    return _con(
        f"Booking {info['tracking_code']}\n"
        f"Booking: {info['booking_status'].replace('_', ' ').title()}\n"
        f"Shipment: {info['shipment_status'].replace('_', ' ').title() if info['shipment_status'] else 'N/A'}\n"
        f"From: {info['pickup']}\n"
        f"To: {info['destination']}\n"
        f"Region: {region}{risk_line}\n"
        f"Track: {USSD_CODE}"
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


async def _my_shipments(phone_number: str, db: AsyncSession) -> str:
    user_result = await db.execute(select(User).where(User.phone == phone_number))
    user = user_result.scalar_one_or_none()
    if user is None:
        return _end("No shipments found for this number.")

    result = await db.execute(
        select(Booking)
        .join(Shipment)
        .options(selectinload(Booking.shipment))
        .where(Shipment.customer_id == user.id)
        .order_by(Booking.created_at.desc())
        .limit(3)
    )
    bookings = list(result.scalars().all())
    if not bookings:
        return _end("No active shipments.")

    lines = ["Your shipments:"]
    for b in bookings:
        lines.append(f"{b.tracking_code} - {b.status.value.replace('_', ' ').title()}")
    lines.append(f"Track: {USSD_CODE}")
    return _end("\n".join(lines))


async def _route_alerts(pickup: str, destination: str) -> str:
    risks = analyze_route(pickup, destination)
    route = format_route_label(pickup, destination)
    if not risks:
        return _end(f"{route}: No major alerts.")

    top = risks[0]
    return _end(
        f"{route}\n"
        f"{top.risk_type} near {top.location}\n"
        f"Section: {top.section}\n"
        f"Risk: {top.score}/100 Delay: {top.delay_minutes}min\n"
        f"{top.advice[:80]}"
    )


def _con(message: str) -> str:
    return f"CON {message}"


def _end(message: str) -> str:
    return f"END {message}"
