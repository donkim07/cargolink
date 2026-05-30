from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.enums import AuctionStatus, UserRole
from app.models.user import User
from app.schemas.auction import (
    AuctionBidCreate,
    AuctionBidResponse,
    AuctionCreate,
    AuctionResponse,
    SelectWinnerRequest,
)
from app.services import auctions as auction_service

router = APIRouter(prefix="/auctions", tags=["auctions"])


def _enrich_auction(auction) -> AuctionResponse:
    response = AuctionResponse.model_validate(auction)
    if auction.bids:
        response.lowest_bid = min(b.amount for b in auction.bids)
        response.bid_count = len(auction.bids)
    if auction.shipment:
        response.pickup_address = auction.shipment.pickup_address
        response.destination_address = auction.shipment.destination_address
    return response


@router.post("", response_model=AuctionResponse, status_code=201)
async def create_auction(
    data: AuctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    auction = await auction_service.create_auction(data, current_user, db)
    return AuctionResponse.model_validate(auction)


@router.get("", response_model=list[AuctionResponse])
async def list_auctions(
    status: AuctionStatus | None = Query(None),
    mine: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer_id = current_user.id if mine else None
    open_only = not mine
    auctions = await auction_service.list_auctions(db, status, customer_id, open_only)
    return [_enrich_auction(a) for a in auctions]


@router.post("/{auction_id}/bid", response_model=AuctionBidResponse, status_code=201)
async def place_bid(
    auction_id: UUID,
    data: AuctionBidCreate,
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
):
    bid = await auction_service.place_bid(auction_id, data, current_user, db)
    return AuctionBidResponse.model_validate(bid)


@router.get("/{auction_id}/bids", response_model=list[AuctionBidResponse])
async def get_bids(
    auction_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    bids = await auction_service.get_auction_bids(auction_id, db)
    return [AuctionBidResponse.model_validate(b) for b in bids]


@router.post("/{auction_id}/select-winner")
async def select_winner(
    auction_id: UUID,
    data: SelectWinnerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await auction_service.select_winner(auction_id, data, current_user, db)
    return {
        "booking_id": str(booking.id),
        "tracking_code": booking.tracking_code,
        "total_cost": float(booking.total_cost),
    }
