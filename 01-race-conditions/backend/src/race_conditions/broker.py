import asyncio
import time
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any, NamedTuple

import aio_pika
from aio_pika.abc import (
    AbstractChannel,
    AbstractIncomingMessage,
    AbstractQueue,
    AbstractRobustConnection,
)
from opentelemetry import context, propagate
from pydantic import AwareDatetime, BaseModel, Field

QUEUE_NAME = "claims"
CONNECT_TIMEOUT_S = 3
RETRY_AFTER_S = 5


class ClaimMessage(BaseModel):
    claim_id: str
    user: str
    round: int
    accepted_by: str
    published_at: AwareDatetime = Field(default_factory=lambda: datetime.now(UTC))


class BrokerUnavailableError(Exception):
    pass


class _Link(NamedTuple):
    connection: AbstractRobustConnection
    channel: AbstractChannel
    queue: AbstractQueue


async def _open(url: str) -> _Link:
    connection = await aio_pika.connect_robust(url, timeout=CONNECT_TIMEOUT_S)
    channel = await connection.channel()
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    return _Link(connection, channel, queue)


class ClaimPublisher:
    def __init__(self, url: str) -> None:
        self._url = url
        self._link: _Link | None = None
        self._failed_at = float("-inf")
        self._lock = asyncio.Lock()

    async def publish(self, message: ClaimMessage) -> None:
        link = await self._connect()
        headers: dict[str, Any] = {}
        propagate.inject(headers)  # One trace spans the request, the queue and the worker.
        await link.channel.default_exchange.publish(
            aio_pika.Message(
                message.model_dump_json().encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=message.claim_id,
                headers=headers,
            ),
            routing_key=QUEUE_NAME,
        )

    async def purge(self) -> int:
        link = await self._connect()
        result = await link.queue.purge()
        return int(getattr(result, "message_count", 0))

    async def close(self) -> None:
        if self._link is not None:
            await self._link.connection.close()

    async def _connect(self) -> _Link:
        async with self._lock:
            if self._link is None:
                if time.monotonic() - self._failed_at < RETRY_AFTER_S:
                    raise BrokerUnavailableError
                try:
                    self._link = await _open(self._url)
                except (OSError, TimeoutError, aio_pika.exceptions.AMQPError) as exc:
                    self._failed_at = time.monotonic()
                    raise BrokerUnavailableError from exc
            return self._link


@asynccontextmanager
async def consume(
    url: str, prefetch: int
) -> AsyncGenerator[AsyncIterator[AbstractIncomingMessage]]:
    link = await _open(url)
    try:
        await link.channel.set_qos(prefetch_count=prefetch)
        async with link.queue.iterator() as messages:
            yield messages
    finally:
        await link.connection.close()


def trace_context(message: AbstractIncomingMessage) -> context.Context:
    headers = {
        key: value.decode() if isinstance(value, bytes) else str(value)
        for key, value in (message.headers or {}).items()
    }
    return propagate.extract(headers)
