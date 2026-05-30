import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CargoType, ShipmentStatus, UrgencyLevel


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    cargo_type: Mapped[CargoType] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    weight_tons: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    volume_m3: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    pickup_address: Mapped[str | None] = mapped_column(Text)
    pickup_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8))
    pickup_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8))
    destination_address: Mapped[str | None] = mapped_column(Text)
    destination_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8))
    destination_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8))
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    urgency: Mapped[UrgencyLevel] = mapped_column(default=UrgencyLevel.STANDARD)
    status: Mapped[ShipmentStatus] = mapped_column(default=ShipmentStatus.PENDING)
    requires_refrigeration: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_departure_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer = relationship("User", lazy="selectin")
    bookings = relationship("Booking", back_populates="shipment", lazy="selectin")
    auctions = relationship("Auction", back_populates="shipment", lazy="selectin")
