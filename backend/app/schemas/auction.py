from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AuctionStatus


class AuctionCreate(BaseModel):
    shipment_id: UUID
    duration_hours: int = Field(default=24, ge=1, le=168)


class AuctionBidCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    notes: str | None = None


class AuctionBidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auction_id: UUID
    provider_id: UUID
    amount: Decimal
    notes: str | None
    is_winning: bool
    created_at: datetime


class AuctionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    starts_at: datetime
    ends_at: datetime
    status: AuctionStatus
    winning_bid_id: UUID | None
    created_at: datetime
    bids: list[AuctionBidResponse] = []
    lowest_bid: Decimal | None = None
    bid_count: int = 0
    pickup_address: str | None = None
    destination_address: str | None = None


class SelectWinnerRequest(BaseModel):
    bid_id: UUID
