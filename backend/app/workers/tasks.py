from app.workers.celery_app import celery_app


@celery_app.task(name="send_sms_notification")
def send_sms_notification(phone: str, message: str, purpose: str):
    """Background SMS task — runs sync Africa's Talking call in worker process."""
    import asyncio

    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    from app.services.sms import send_sms

    async def _run():
        engine = create_async_engine(__import__("app.core.config", fromlist=["settings"]).settings.database_url)
        session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with session_factory() as db:
            await send_sms(phone, message, purpose, db)
            await db.commit()
        await engine.dispose()

    asyncio.run(_run())
