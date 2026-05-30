from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User


async def global_search(query: str, user: User, db: AsyncSession) -> dict:
    term = f"%{query.strip()}%"
    if not query.strip():
        return {"shipments": [], "providers": []}

    shipment_q = select(Shipment).options(selectinload(Shipment.bookings))
    if user.role.value == "customer":
        shipment_q = shipment_q.where(Shipment.customer_id == user.id)
    shipment_q = shipment_q.where(
        or_(
            Shipment.pickup_address.ilike(term),
            Shipment.destination_address.ilike(term),
            Shipment.description.ilike(term),
        )
    ).limit(10)

    provider_q = (
        select(Provider)
        .options(selectinload(Provider.vehicles))
        .where(Provider.is_approved.is_(True))
        .where(or_(Provider.company_name.ilike(term), Provider.description.ilike(term)))
        .limit(10)
    )

    shipments = list((await db.execute(shipment_q)).scalars().all())
    providers = list((await db.execute(provider_q)).scalars().all())

    return {"shipments": shipments, "providers": providers}
