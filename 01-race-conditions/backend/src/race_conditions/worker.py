import asyncio
import logging
import signal
from datetime import UTC, datetime

from aio_pika.abc import AbstractIncomingMessage
from opentelemetry import trace
from opentelemetry.trace import SpanKind
from pydantic import ValidationError

from race_conditions import broker, db, metrics
from race_conditions.broker import ClaimMessage
from race_conditions.models import Claim
from race_conditions.services.claims import process_claim
from race_conditions.settings import Settings, get_settings
from race_conditions.telemetry import setup_telemetry

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


async def handle(message: AbstractIncomingMessage, pool: db.Pool, settings: Settings) -> None:
    try:
        body = ClaimMessage.model_validate_json(message.body)
    except ValidationError:
        logger.warning("Rejecting malformed message %s", message.message_id)
        await message.reject(requeue=False)
        return

    strategy = settings.worker_strategy
    claim = Claim(body.user, body.round, settings.instance, f"queue/{strategy}", body.claim_id)
    waited_ms = (datetime.now(UTC) - body.published_at).total_seconds() * 1000
    metrics.queue_wait.record(waited_ms, {"strategy": strategy})

    with tracer.start_as_current_span(
        "claims process",
        context=broker.trace_context(message),
        kind=SpanKind.CONSUMER,
        attributes={
            "messaging.message.id": body.claim_id,
            "messaging.rabbitmq.redelivered": message.redelivered,
        },
    ):
        # Ack after commit (at-least-once); a failed claim is retried once, then dropped.
        async with message.process(requeue=True, reject_on_redelivered=True):
            await process_claim(pool, strategy, claim)


async def run(settings: Settings) -> None:
    current = asyncio.current_task()
    if current is not None:
        asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, current.cancel)

    pool = await db.create_pool(settings.database_url, settings.db_pool_size)
    logger.info(
        "Worker %s started: strategy=%s prefetch=%d",
        settings.instance,
        settings.worker_strategy,
        settings.worker_prefetch,
    )
    try:
        async with (
            broker.consume(settings.rabbitmq_url, settings.worker_prefetch) as messages,
            asyncio.TaskGroup() as tasks,
        ):
            async for message in messages:
                tasks.create_task(_handle_safely(message, pool, settings))
    finally:
        await pool.close()


async def _handle_safely(
    message: AbstractIncomingMessage, pool: db.Pool, settings: Settings
) -> None:
    try:
        await handle(message, pool, settings)
    except Exception:
        logger.exception("Claim %s failed", message.message_id)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    settings = get_settings()
    setup_telemetry("race-conditions-worker", settings.instance)

    try:
        asyncio.run(run(settings))
    except asyncio.CancelledError:
        logger.info("Worker stopped")


if __name__ == "__main__":
    main()
