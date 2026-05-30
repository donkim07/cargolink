from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import NotificationType, ShipmentStatus, UserRole, VehicleType
from app.models.notification import Notification
from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.shipment import QuoteItem, ShipmentCreate, ShipmentQuoteResponse
from app.services.maps import geocode_address, get_distance_and_duration
from app.services.pricing import calculate_cost, recommend_vehicle_type


async def create_shipment(
    data: ShipmentCreate,
    current_user: User,
    db: AsyncSession,
) -> Shipment:
    if current_user.role not in (UserRole.CUSTOMER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can create shipments")

    pickup_lat = data.pickup_lat
    pickup_lng = data.pickup_lng
    dest_lat = data.destination_lat
    dest_lng = data.destination_lng

    if pickup_lat is None or pickup_lng is None:
        geo = await geocode_address(data.pickup_address)
        pickup_lat = Decimal(str(geo["lat"]))
        pickup_lng = Decimal(str(geo["lng"]))

    if dest_lat is None or dest_lng is None:
        geo = await geocode_address(data.destination_address)
        dest_lat = Decimal(str(geo["lat"]))
        dest_lng = Decimal(str(geo["lng"]))

    route = await get_distance_and_duration(
        float(pickup_lat), float(pickup_lng), float(dest_lat), float(dest_lng)
    )

    shipment = Shipment(
        customer_id=current_user.id,
        cargo_type=data.cargo_type,
        description=data.description,
        weight_tons=data.weight_tons,
        volume_m3=data.volume_m3,
        pickup_address=data.pickup_address,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        destination_address=data.destination_address,
        destination_lat=dest_lat,
        destination_lng=dest_lng,
        distance_km=Decimal(str(route["distance_km"])),
        estimated_duration_minutes=route["duration_minutes"],
        urgency=data.urgency,
        requires_refrigeration=data.requires_refrigeration,
        preferred_departure_date=data.preferred_departure_date,
        status=ShipmentStatus.PENDING,
    )
    db.add(shipment)
    await db.flush()

    db.add(
        Notification(
            user_id=current_user.id,
            type=NotificationType.SYSTEM,
            title="Shipment Created",
            message=f"Your shipment from {data.pickup_address} to {data.destination_address} is ready for quotes.",
        )
    )
    await db.flush()
    return shipment


async def list_shipments(current_user: User, db: AsyncSession) -> list[Shipment]:
    query = select(Shipment).options(selectinload(Shipment.bookings))

    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
        provider = provider_result.scalar_one_or_none()
        if provider is None:
            return []
        from app.models.booking import Booking

        query = query.join(Booking).where(Booking.provider_id == provider.id)
    else:
        query = query.where(Shipment.customer_id == current_user.id)

    query = query.order_by(Shipment.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def get_shipment(shipment_id: UUID, current_user: User, db: AsyncSession) -> Shipment:
    result = await db.execute(
        select(Shipment)
        .options(selectinload(Shipment.bookings), selectinload(Shipment.customer))
        .where(Shipment.id == shipment_id)
    )
    shipment = result.scalar_one_or_none()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    if current_user.role == UserRole.ADMIN:
        return shipment
    if current_user.role == UserRole.CUSTOMER and shipment.customer_id == current_user.id:
        return shipment
    if current_user.role == UserRole.PROVIDER:
        provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
        provider = provider_result.scalar_one_or_none()
        if provider and any(b.provider_id == provider.id for b in shipment.bookings):
            return shipment

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


async def generate_quotes(shipment_id: UUID, current_user: User, db: AsyncSession) -> ShipmentQuoteResponse:
    shipment = await get_shipment(shipment_id, current_user, db)

    if shipment.distance_km is None or shipment.weight_tons is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shipment missing route or weight data")

    recommended = recommend_vehicle_type(
        float(shipment.weight_tons),
        shipment.requires_refrigeration,
    )

    providers_result = await db.execute(
        select(Provider)
        .options(selectinload(Provider.vehicles))
        .where(Provider.is_approved.is_(True))
    )
    providers = providers_result.scalars().all()

    quotes: list[QuoteItem] = []
    distance = float(shipment.distance_km)
    weight = float(shipment.weight_tons)
    volume = float(shipment.volume_m3 or 0)

    recommended_type = VehicleType(recommended)

    for provider in providers:
        available_vehicles = [
            v
            for v in provider.vehicles
            if v.is_available and float(v.capacity_tons or 0) >= weight
        ]
        if not available_vehicles:
            continue

        if shipment.requires_refrigeration:
            refrigerated = [v for v in available_vehicles if v.type == VehicleType.REFRIGERATED_TRUCK]
            if refrigerated:
                vehicle = refrigerated[0]
            elif recommended_type in {v.type for v in available_vehicles}:
                vehicle = next(v for v in available_vehicles if v.type == recommended_type)
            else:
                vehicle = max(available_vehicles, key=lambda v: float(v.capacity_tons or 0))
        elif recommended_type in {v.type for v in available_vehicles}:
            vehicle = next(v for v in available_vehicles if v.type == recommended_type)
        else:
            vehicle = min(available_vehicles, key=lambda v: float(v.capacity_tons or 0))

        pricing = calculate_cost(
            distance_km=distance,
            weight_tons=weight,
            volume_m3=volume,
            vehicle_type=vehicle.type.value,
            urgency=shipment.urgency.value,
            requires_refrigeration=shipment.requires_refrigeration,
        )

        quotes.append(
            QuoteItem(
                provider_id=provider.id,
                provider_name=provider.company_name,
                vehicle_type=vehicle.type,
                vehicle_id=vehicle.id,
                pricing=pricing,
            )
        )

    shipment.status = ShipmentStatus.QUOTED
    await db.flush()

    return ShipmentQuoteResponse(shipment_id=shipment.id, quotes=quotes)
