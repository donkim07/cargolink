from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.driver import Driver
from app.models.enums import UserRole, VehicleType
from app.models.provider import Provider
from app.models.shared_cargo import SharedCargo
from app.models.user import User
from app.models.vehicle import Vehicle


async def seed_demo_data(db: AsyncSession) -> None:
    approved_count = await db.scalar(
        select(func.count(Provider.id)).where(Provider.is_approved.is_(True))
    )
    if approved_count and approved_count > 0:
        return

    providers_data = [
        {
            "phone": "+255711111001",
            "name": "Kilimanjaro Logistics",
            "company": "Kilimanjaro Logistics Ltd",
            "vehicles": [
                ("T 101 ABC", VehicleType.TRUCK, 15, 40),
                ("T 102 ABC", VehicleType.REFRIGERATED_TRUCK, 12, 35),
            ],
        },
        {
            "phone": "+255711111002",
            "name": "Serengeti Haulage",
            "company": "Serengeti Haulage Co",
            "vehicles": [
                ("T 201 XYZ", VehicleType.TRUCK, 20, 50),
                ("T 202 XYZ", VehicleType.PICKUP, 5, 15),
                ("T 203 XYZ", VehicleType.VAN, 2, 8),
            ],
        },
        {
            "phone": "+255711111003",
            "name": "Coastal Freight TZ",
            "company": "Coastal Freight Tanzania",
            "vehicles": [
                ("T 301 DEF", VehicleType.CONTAINER, 25, 60),
                ("T 302 DEF", VehicleType.REFRIGERATED_TRUCK, 10, 30),
            ],
        },
    ]

    created_providers: list[Provider] = []

    for pdata in providers_data:
        user = User(
            phone=pdata["phone"],
            full_name=pdata["name"],
            role=UserRole.PROVIDER,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        provider = Provider(
            user_id=user.id,
            company_name=pdata["company"],
            registration_number=f"TZ-{pdata['phone'][-4:]}",
            rating=Decimal("4.50"),
            total_deliveries=120,
            response_rate=Decimal("95.00"),
            is_approved=True,
            description=f"Trusted freight partner — {pdata['company']}",
        )
        db.add(provider)
        await db.flush()

        for plate, vtype, tons, vol in pdata["vehicles"]:
            db.add(
                Vehicle(
                    provider_id=provider.id,
                    type=vtype,
                    plate_number=plate,
                    capacity_tons=Decimal(str(tons)),
                    capacity_volume_m3=Decimal(str(vol)),
                    is_available=True,
                )
            )
        created_providers.append(provider)

    if created_providers:
        p = created_providers[0]
        for idx, (phone, name) in enumerate(
            [("+255711111101", "Juma Mwangi"), ("+255711111102", "Asha Hassan")],
            start=1,
        ):
            driver_user = User(
                phone=phone,
                full_name=name,
                role=UserRole.DRIVER,
                is_verified=True,
            )
            db.add(driver_user)
            await db.flush()
            db.add(
                Driver(
                    provider_id=p.id,
                    user_id=driver_user.id,
                    license_number=f"DL-{idx:04d}",
                    is_available=True,
                )
            )

    # Admin user
    admin_exists = await db.scalar(select(User.id).where(User.role == UserRole.ADMIN))
    if not admin_exists:
        db.add(
            User(
                phone="+255700000001",
                full_name="CargoLink Admin",
                email="admin@cargolink.africa",
                role=UserRole.ADMIN,
                is_verified=True,
            )
        )

    # Shared cargo listings
    if created_providers:
        p = created_providers[0]
        vehicle = (
            await db.execute(select(Vehicle).where(Vehicle.provider_id == p.id).limit(1))
        ).scalar_one()
        db.add(
            SharedCargo(
                provider_id=p.id,
                vehicle_id=vehicle.id,
                route_from="Dar es Salaam",
                route_to="Dodoma",
                departure_date=date.today() + timedelta(days=3),
                total_capacity_tons=Decimal("20"),
                used_capacity_tons=Decimal("5"),
                price_per_ton=Decimal("85000"),
            )
        )
        p2 = created_providers[1]
        vehicle2 = (
            await db.execute(select(Vehicle).where(Vehicle.provider_id == p2.id).limit(1))
        ).scalar_one()
        db.add(
            SharedCargo(
                provider_id=p2.id,
                vehicle_id=vehicle2.id,
                route_from="Dar es Salaam",
                route_to="Mwanza",
                departure_date=date.today() + timedelta(days=5),
                total_capacity_tons=Decimal("15"),
                price_per_ton=Decimal("95000"),
            )
        )

    await db.flush()
