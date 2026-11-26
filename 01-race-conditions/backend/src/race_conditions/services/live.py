import asyncio
import json
import logging
from collections.abc import Generator
from contextlib import contextmanager, suppress
from dataclasses import dataclass

import asyncpg

from race_conditions import db
from race_conditions.models import GameState

logger = logging.getLogger(__name__)

RECONNECT_DELAY_S = 1


@dataclass(frozen=True, slots=True)
class LiveEvent:
    type: str
    payload: str


class LiveFeed:
    def __init__(self, dsn: str, pool: db.Pool) -> None:
        self._dsn = dsn
        self._pool = pool
        self._subscribers: set[asyncio.Queue[LiveEvent]] = set()
        self.state: GameState | None = None

    @contextmanager
    def subscribe(self, maxsize: int = 1_000) -> Generator[asyncio.Queue[LiveEvent]]:
        queue: asyncio.Queue[LiveEvent] = asyncio.Queue(maxsize=maxsize)
        self._subscribers.add(queue)
        try:
            yield queue
        finally:
            self._subscribers.discard(queue)

    async def run(self) -> None:
        while True:
            try:
                await self._listen()
            except OSError, asyncpg.PostgresError:
                logger.warning("LISTEN connection lost, reconnecting", exc_info=True)
            await asyncio.sleep(RECONNECT_DELAY_S)

    async def _listen(self) -> None:
        listener = await db.connect(self._dsn)
        closed = asyncio.Event()
        listener.add_termination_listener(lambda _conn: closed.set())
        try:
            await listener.add_listener(db.CHANNEL, self._on_notify)
            self.state = await db.read_state(self._pool)
            await closed.wait()
        finally:
            if not listener.is_closed():
                await listener.close()

    def _on_notify(self, _conn: object, _pid: int, _channel: str, payload: object) -> None:
        text = str(payload)
        event = json.loads(text)
        self.state = GameState.model_validate(event["state"])
        live_event = LiveEvent(event["type"], text)
        for queue in self._subscribers:
            # A slow client skips events; the next one brings the full state.
            with suppress(asyncio.QueueFull):
                queue.put_nowait(live_event)
