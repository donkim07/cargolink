import uuid
from datetime import UTC, datetime
from decimal import Decimal

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus, ShipmentStatus
from app.models.payment import Payment
from app.models.shared_cargo import SharedCargoBooking
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.payment import PaymentInitiateRequest
from app.services.sms import send_booking_confirmed


async def initiate_payment(
    data: PaymentInitiateRequest,
    current_user: User,
    db: AsyncSession,
) -> dict:
    if not data.booking_id and not data.shared_cargo_booking_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="booking_id or shared_cargo_booking_id required")

    amount: Decimal
    if data.booking_id:
        result = await db.execute(
            select(Booking)
            .options(selectinload(Booking.shipment), selectinload(Booking.provider))
            .where(Booking.id == data.booking_id)
        )
        booking = result.scalar_one_or_none()
        if booking is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.shipment.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        amount = booking.total_cost
        booking_ref = str(booking.id)
    else:
        result = await db.execute(
            select(SharedCargoBooking).where(SharedCargoBooking.id == data.shared_cargo_booking_id)
        )
        sc_booking = result.scalar_one_or_none()
        if sc_booking is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared cargo booking not found")
        if sc_booking.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        amount = sc_booking.total_cost
        booking_ref = str(sc_booking.id)

    order_id = str(uuid.uuid4())
    reference = order_id[:20].upper()

    payment = Payment(
        booking_id=data.booking_id,
        shared_cargo_booking_id=data.shared_cargo_booking_id,
        customer_id=current_user.id,
        amount=amount,
        payment_method=data.payment_method,
        provider_reference=reference,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    await db.flush()

    if settings.zenopay_api_key:
        await _call_zenopay(order_id, current_user, data.phone, amount, reference)

    return {
        "payment_id": payment.id,
        "reference": reference,
        "message": "Payment initiated. Complete on your phone.",
        "amount": amount,
        "currency": "TZS",
    }


async def _call_zenopay(
    order_id: str,
    user: User,
    phone: str,
    amount: Decimal,
    reference: str,
) -> None:
    phone_local = phone.replace("+255", "0") if phone.startswith("+255") else phone
    payload = {
        "order_id": order_id,
        "buyer_email": user.email or f"{user.phone}@cargolink.africa",
        "buyer_name": user.full_name or user.phone,
        "buyer_phone": phone_local,
        "amount": int(amount),
        "webhook_url": settings.zenopay_callback_url,
        "metadata": {"reference": reference},
    }

    headers = {"x-api-key": settings.zenopay_api_key, "Content-Type": "application/json"}
    url = f"{settings.zenopay_base_url}/mobile_money_tanzania"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ZenoPay error: {response.text}",
            )


async def handle_payment_callback(payload: dict, api_key: str | None, db: AsyncSession) -> dict:
    if settings.zenopay_api_key and api_key != settings.zenopay_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")

    reference = payload.get("reference") or payload.get("metadata", {}).get("reference")
    payment_status = payload.get("payment_status", "").upper()

    if not reference:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing reference")

    result = await db.execute(select(Payment).where(Payment.provider_reference == reference))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if payment_status == "COMPLETED":
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = datetime.now(UTC)

        if payment.booking_id:
            booking_result = await db.execute(
                select(Booking)
                .options(
                    selectinload(Booking.shipment).selectinload(Shipment.customer),
                    selectinload(Booking.provider),
                )
                .where(Booking.id == payment.booking_id)
            )
            booking = booking_result.scalar_one_or_none()
            if booking:
                booking.status = BookingStatus.CONFIRMED
                if booking.shipment:
                    booking.shipment.status = ShipmentStatus.BOOKED
                if booking.shipment and booking.shipment.customer and booking.provider:
                    await send_booking_confirmed(
                        booking.shipment.customer.phone,
                        booking.tracking_code,
                        booking.provider.company_name,
                        db,
                    )
    elif payment_status in ("FAILED", "CANCELLED"):
        payment.status = PaymentStatus.FAILED

    await db.flush()
    return {"status": "ok", "payment_id": str(payment.id)}


async def get_payment_status(reference: str, current_user: User, db: AsyncSession) -> Payment:
    result = await db.execute(select(Payment).where(Payment.provider_reference == reference))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.customer_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return payment
