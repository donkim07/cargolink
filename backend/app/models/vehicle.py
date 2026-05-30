import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import VehicleType


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("providers.id"))
    type: Mapped[VehicleType] = mapped_column(nullable=False)
    plate_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    capacity_tons: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    capacity_volume_m3: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    current_location_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8))
    current_location_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8))
    year_of_manufacture: Mapped[int | None] = mapped_column(Integer)
    photos: Mapped[list | None] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    provider = relationship("Provider", back_populates="vehicles")
