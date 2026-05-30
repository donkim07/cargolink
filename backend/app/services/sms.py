import asyncio
from functools import partial

import africastalking
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import SMSStatus
from app.models.sms_log import SMSLog

_initialized = False


def _ensure_initialized() -> None:
    global _initialized
    if not _initialized and settings.at_api_key:
        africastalking.initialize(settings.at_username, settings.at_api_key)
        _initialized = True


async def send_sms(phone: str, message: str, purpose: str, db: AsyncSession) -> SMSLog:
    log = SMSLog(phone=phone, message=message, purpose=purpose, status=SMSStatus.PENDING)
    db.add(log)
    await db.flush()

    if not settings.at_api_key:
        log.status = SMSStatus.FAILED
        return log

    try:
        _ensure_initialized()
        sms = africastalking.SMS
        loop = asyncio.get_event_loop()
        send_fn = partial(
            sms.send,
            message,
            [phone],
            sender_id=settings.at_sms_sender or None,
        )
        response = await loop.run_in_executor(None, send_fn)
        recipients = response.get("SMSMessageData", {}).get("Recipients", [])
        if recipients and recipients[0].get("status") == "Success":
            log.status = SMSStatus.SENT
            log.provider_message_id = recipients[0].get("messageId")
        else:
            log.status = SMSStatus.FAILED
    except Exception:
        log.status = SMSStatus.FAILED

    return log


async def send_otp_sms(phone: str, code: str, db: AsyncSession) -> SMSLog:
    message = f"Your CargoLink OTP is {code}. Expires in 5 minutes."
    return await send_sms(phone, message, "otp", db)


async def send_booking_confirmed(phone: str, tracking_code: str, company: str, db: AsyncSession) -> SMSLog:
    message = f"Your shipment #{tracking_code} has been confirmed. Provider: {company}."
    return await send_sms(phone, message, "booking_confirmed", db)


async def send_vehicle_dispatched(phone: str, tracking_code: str, db: AsyncSession) -> SMSLog:
    message = f"Your cargo is on the way! Track: *384*{tracking_code}#"
    return await send_sms(phone, message, "vehicle_dispatched", db)


async def send_delivery_complete(phone: str, db: AsyncSession) -> SMSLog:
    message = "Cargo delivered successfully. Thank you for using CargoLink Africa."
    return await send_sms(phone, message, "delivery_complete", db)


async def send_new_bid(phone: str, amount: int, db: AsyncSession) -> SMSLog:
    message = f"New bid of TZS {amount:,} received for your shipment."
    return await send_sms(phone, message, "new_bid", db)


async def send_auction_won(phone: str, db: AsyncSession) -> SMSLog:
    message = "You won the auction! Proceed to payment."
    return await send_sms(phone, message, "auction_won", db)
