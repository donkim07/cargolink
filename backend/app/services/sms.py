from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import SMSStatus
from app.models.sms_log import SMSLog
from app.services.at_client import send_sms_message


async def send_sms(phone: str, message: str, purpose: str, db: AsyncSession) -> SMSLog:
    log = SMSLog(phone=phone, message=message, purpose=purpose, status=SMSStatus.PENDING)
    db.add(log)
    await db.flush()

    if not settings.at_api_key:
        log.status = SMSStatus.FAILED
        return log

    try:
        response = await send_sms_message(phone, message, sender_id=settings.at_sms_sender or None)
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
    ussd = settings.ussd_code
    message = (
        f"CargoLink: Your shipment #{tracking_code} has been confirmed. "
        f"Provider: {company}. Track: {ussd}"
    )
    return await send_sms(phone, message, "booking_confirmed", db)


async def send_driver_accepted(
    phone: str,
    *,
    driver_name: str,
    vehicle_plate: str,
    driver_phone: str,
    tracking_code: str,
    delivery_otp: str,
    db: AsyncSession,
) -> SMSLog:
    message = (
        f"CargoLink: Dereva {driver_name} ({vehicle_plate}) amekubali mzigo wako "
        f"#{tracking_code}. Simu: {driver_phone}. OTP ya delivery: {delivery_otp}."
    )
    return await send_sms(phone, message, "driver_accepted", db)


async def send_shipment_started(phone: str, tracking_code: str, route_label: str, db: AsyncSession) -> SMSLog:
    ussd = settings.ussd_code
    message = (
        f"CargoLink: Mzigo wako #{tracking_code} umeanzishwa kwenye njia "
        f"{route_label}. Fuatilia: {ussd}"
    )
    return await send_sms(phone, message, "shipment_started", db)


async def send_region_checkpoint(
    phone: str,
    tracking_code: str,
    region: str,
    ussd_code: str,
    db: AsyncSession,
) -> SMSLog:
    message = (
        f"CargoLink: Mzigo #{tracking_code} umefika {region}. "
        f"Endelea kufuatilia: {ussd_code}"
    )
    return await send_sms(phone, message, "region_checkpoint", db)


async def send_near_destination(
    phone: str,
    tracking_code: str,
    destination: str,
    delivery_otp: str,
    db: AsyncSession,
) -> SMSLog:
    message = (
        f"CargoLink: Mzigo #{tracking_code} umefika karibu na {destination}. "
        f"OTP ya delivery: {delivery_otp}."
    )
    return await send_sms(phone, message, "near_destination", db)


async def send_delivered_with_otp(phone: str, tracking_code: str, delivery_otp: str, db: AsyncSession) -> SMSLog:
    message = (
        f"CargoLink: Mzigo wako #{tracking_code} umewasili salama. "
        f"OTP: {delivery_otp}. Asante kwa kutumia CargoLink Africa."
    )
    return await send_sms(phone, message, "delivery_complete", db)


async def send_route_risk_alert(
    phone: str,
    *,
    route_label: str,
    risk_type: str,
    location: str,
    section: str,
    score: int,
    delay_minutes: int,
    advice: str,
    db: AsyncSession,
) -> SMSLog:
    message = (
        f"CargoLink: {risk_type} karibu na {location} kwenye {route_label}. "
        f"Sehemu: {section}. Hatari: {score}/100. Chelewesho: ~{delay_minutes}min. {advice}"
    )
    return await send_sms(phone, message, "route_risk", db)


async def send_hazard_report_received(
    phone: str,
    hazard_type: str,
    location: str,
    db: AsyncSession,
) -> SMSLog:
    message = (
        f"CargoLink: Imepokelewa! {hazard_type} @ {location}. "
        f"Madereva wamearifiwa. Asante!"
    )
    return await send_sms(phone, message, "hazard_report", db)


async def send_vehicle_dispatched(phone: str, tracking_code: str, db: AsyncSession) -> SMSLog:
    message = f"CargoLink: Your cargo is on the way! Track: {settings.ussd_code}"
    return await send_sms(phone, message, "vehicle_dispatched", db)


async def send_delivery_complete(phone: str, db: AsyncSession) -> SMSLog:
    message = "CargoLink: Cargo delivered successfully. Thank you for using CargoLink Africa."
    return await send_sms(phone, message, "delivery_complete", db)


async def send_new_bid(phone: str, amount: int, db: AsyncSession) -> SMSLog:
    message = f"CargoLink: New bid of TZS {amount:,} received for your shipment."
    return await send_sms(phone, message, "new_bid", db)


async def send_auction_won(phone: str, db: AsyncSession) -> SMSLog:
    message = "CargoLink: You won the auction! Proceed to payment."
    return await send_sms(phone, message, "auction_won", db)
