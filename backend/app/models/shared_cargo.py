import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import SharedCargoBookingStatus, SharedCargoStatus


class SharedCargo(Base):
    __tablename__ = "shared_cargo"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("providers.id"))
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    route_from: Mapped[str] = mapped_column(Text, nullable=False)
    route_from_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8))
    route_from_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8))
    route_to: Mapped[str] = mapped_column(Text, nullable=False)
    route_to_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8))
    route_to_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8))
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    departure_time: Mapped[time | None] = mapped_column(Time)
    total_capacity_tons: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    used_capacity_tons: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0"))
    price_per_ton: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[SharedCargoStatus] = mapped_column(default=SharedCargoStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    provider = relationship("Provider", lazy="selectin")
    vehicle = relationship("Vehicle", lazy="selectin")
    bookings = relationship("SharedCargoBooking", back_populates="shared_cargo", lazy="selectin")


class SharedCargoBooking(Base):
    __tablename__ = "shared_cargo_bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shared_cargo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shared_cargo.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    tons_booked: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cargo_description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[SharedCargoBookingStatus] = mapped_column(default=SharedCargoBookingStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shared_cargo = relationship("SharedCargo", back_populates="bookings")
    customer = relationship("User", lazy="selectin")
    payments = relationship("Payment", back_populates="shared_cargo_booking", lazy="selectin")
