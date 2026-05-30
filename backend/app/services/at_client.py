import httpx

from app.core.config import settings

SANDBOX_BASE = "https://api.sandbox.africastalking.com/version1"
PRODUCTION_BASE = "https://api.africastalking.com/version1"


class AfricasTalkingSMSError(Exception):
    def __init__(self, message: str, response: dict | None = None):
        super().__init__(message)
        self.response = response


def _base_url() -> str:
    return SANDBOX_BASE if settings.at_username == "sandbox" else PRODUCTION_BASE


def _is_sandbox() -> bool:
    return settings.at_username == "sandbox"


async def send_sms_message(phone: str, message: str, sender_id: str | None = None) -> dict:
    if not settings.at_api_key:
        raise ValueError("AT_API_KEY is not configured")

    url = f"{_base_url()}/messaging"
    headers = {
        "Accept": "application/json",
        "apiKey": settings.at_api_key,
    }
    data = {
        "username": settings.at_username,
        "to": phone,
        "message": message,
        "bulkSMSMode": "1",
    }

    # Sandbox rejects unregistered sender IDs (e.g. "CargoLink") with InvalidSenderId
    effective_sender = sender_id if not _is_sandbox() else None
    if effective_sender:
        data["from"] = effective_sender

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, data=data)
        response.raise_for_status()
        payload = response.json()

    sms_data = payload.get("SMSMessageData", {})
    api_message = sms_data.get("Message", "")
    recipients = sms_data.get("Recipients", [])

    if not recipients:
        raise AfricasTalkingSMSError(api_message or "SMS delivery failed", payload)

    recipient = recipients[0]
    if recipient.get("status") != "Success":
        raise AfricasTalkingSMSError(
            recipient.get("status") or api_message or "SMS delivery failed",
            payload,
        )

    return payload
