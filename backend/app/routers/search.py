from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.provider import ProviderResponse
from app.schemas.shipment import ShipmentResponse
from app.services import search as search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = await search_service.global_search(q, current_user, db)
    return {
        "shipments": [ShipmentResponse.model_validate(s) for s in results["shipments"]],
        "providers": [ProviderResponse.model_validate(p) for p in results["providers"]],
    }
