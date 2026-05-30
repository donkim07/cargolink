from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User


async def list_notifications(user: User, db: AsyncSession, unread_only: bool = False) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    result = await db.execute(query.order_by(Notification.created_at.desc()).limit(50))
    return list(result.scalars().all())


async def mark_read(notification_id: UUID, user: User, db: AsyncSession) -> Notification:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    await db.flush()
    return notification


async def mark_all_read(user: User, db: AsyncSession) -> int:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True
    await db.flush()
    return len(notifications)
