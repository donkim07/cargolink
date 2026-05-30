from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auction import Auction, AuctionBid
from app.models.booking import Booking
from app.models.enums import AuctionStatus, BookingStatus, ShipmentStatus, UserRole
from app.models.provider import Provider
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.auction import AuctionBidCreate, AuctionCreate, SelectWinnerRequest
from app.services.providers import _generate_tracking_code
from app.services.shipments import get_shipment
from app.services.sms import send_auction_won, send_new_bid


async def create_auction(data: AuctionCreate, current_user: User, db: AsyncSession) -> Auction:
    shipment = await get_shipment(data.shipment_id, current_user, db)
    if current_user.role not in (UserRole.CUSTOMER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can create auctions")

    existing = await db.execute(
        select(Auction).where(
            Auction.shipment_id == shipment.id,
            Auction.status == AuctionStatus.OPEN,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Open auction already exists")

    now = datetime.now(UTC)
    auction = Auction(
        shipment_id=shipment.id,
        starts_at=now,
        ends_at=now + timedelta(hours=data.duration_hours),
        status=AuctionStatus.OPEN,
    )
    db.add(auction)
    await db.flush()
    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.bids), selectinload(Auction.shipment))
        .where(Auction.id == auction.id)
    )
    return result.scalar_one()


async def list_auctions(
    db: AsyncSession,
    status_filter: AuctionStatus | None = None,
    customer_id: UUID | None = None,
    open_only: bool = True,
) -> list[Auction]:
    query = select(Auction).options(
        selectinload(Auction.bids),
        selectinload(Auction.shipment),
    )
    if customer_id:
        query = query.join(Shipment).where(Shipment.customer_id == customer_id)
    elif open_only:
        query = query.where(Auction.status == AuctionStatus.OPEN)
    if status_filter:
        query = query.where(Auction.status == status_filter)

    result = await db.execute(query.order_by(Auction.ends_at.asc()))
    auctions = list(result.scalars().unique().all())

    now = datetime.now(UTC)
    changed = False
    for auction in auctions:
        if auction.status == AuctionStatus.OPEN and now > auction.ends_at:
            auction.status = AuctionStatus.CLOSED
            changed = True
    if changed:
        await db.flush()

    if open_only and not customer_id:
        auctions = [a for a in auctions if a.status == AuctionStatus.OPEN]

    return auctions


async def place_bid(
    auction_id: UUID,
    data: AuctionBidCreate,
    current_user: User,
    db: AsyncSession,
) -> AuctionBid:
    provider_result = await db.execute(select(Provider).where(Provider.user_id == current_user.id))
    provider = provider_result.scalar_one_or_none()
    if provider is None or not provider.is_approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approved provider required")

    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.shipment).selectinload(Shipment.customer))
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if auction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found")
    if auction.status != AuctionStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Auction is not open")
    if datetime.now(UTC) > auction.ends_at:
        auction.status = AuctionStatus.CLOSED
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Auction has ended")

    bid = AuctionBid(
        auction_id=auction.id,
        provider_id=provider.id,
        amount=data.amount,
        notes=data.notes,
    )
    db.add(bid)
    await db.flush()

    if auction.shipment and auction.shipment.customer:
        await send_new_bid(
            auction.shipment.customer.phone,
            int(data.amount),
            db,
        )

    return bid


async def get_auction_bids(auction_id: UUID, db: AsyncSession) -> list[AuctionBid]:
    result = await db.execute(
        select(AuctionBid)
        .options(selectinload(AuctionBid.provider))
        .where(AuctionBid.auction_id == auction_id)
        .order_by(AuctionBid.amount.asc())
    )
    return list(result.scalars().all())


async def select_winner(
    auction_id: UUID,
    data: SelectWinnerRequest,
    current_user: User,
    db: AsyncSession,
) -> Booking:
    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.shipment), selectinload(Auction.bids))
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if auction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auction not found")

    shipment = await get_shipment(auction.shipment_id, current_user, db)
    if shipment.customer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only shipment owner can select winner")

    bid_result = await db.execute(
        select(AuctionBid).where(AuctionBid.id == data.bid_id, AuctionBid.auction_id == auction_id)
    )
    bid = bid_result.scalar_one_or_none()
    if bid is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found")

    for existing_bid in auction.bids:
        existing_bid.is_winning = existing_bid.id == bid.id

    auction.winning_bid_id = bid.id
    auction.status = AuctionStatus.CLOSED

    provider_result = await db.execute(
        select(Provider).options(selectinload(Provider.user)).where(Provider.id == bid.provider_id)
    )
    provider = provider_result.scalar_one()

    base = bid.amount
    service_fee = base * Decimal("0.08")
    insurance = base * Decimal("0.02")
    total = base + service_fee + insurance

    booking = Booking(
        shipment_id=shipment.id,
        provider_id=bid.provider_id,
        base_cost=base,
        service_fee=service_fee,
        insurance_fee=insurance,
        total_cost=total,
        tracking_code=_generate_tracking_code(),
        status=BookingStatus.PENDING,
    )
    shipment.status = ShipmentStatus.BOOKED
    db.add(booking)
    await db.flush()

    from app.services import drivers as driver_service

    await driver_service.notify_provider_drivers_new_job(booking, db)

    if provider.user:
        await send_auction_won(provider.user.phone, db)

    return booking
