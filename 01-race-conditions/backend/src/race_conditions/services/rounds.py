from typing import Any

from race_conditions import db
from race_conditions.broker import BrokerUnavailableError, ClaimPublisher
from race_conditions.models import GameState, Mode, Snapshot

COUNTDOWN_SECONDS = 3


class RoundService:
    def __init__(self, pool: db.Pool, publisher: ClaimPublisher, instance: str) -> None:
        self._pool = pool
        self._publisher = publisher
        self._instance = instance

    async def snapshot(self) -> Snapshot:
        async with self._pool.acquire() as conn:
            state = await db.read_state(conn)
            winners = await db.recent_winners(conn, state.round)
        return Snapshot(state=state, winners=winners, instance=self._instance)

    async def start(self, mode: Mode, prizes: int, delay_ms: int) -> GameState:
        async with self._pool.acquire() as conn:
            await db.start_round(conn, mode, prizes, delay_ms)
            return await self._announce(conn, {"type": "reset", "wiped": False})

    async def restart(self, *, wipe: bool = False) -> GameState:
        async with self._pool.acquire() as conn:
            await db.next_round(conn, wipe=wipe)
            return await self._announce(conn, {"type": "reset", "wiped": wipe})

    async def countdown(self) -> GameState:
        return await self._announce(self._pool, {"type": "countdown", "seconds": COUNTDOWN_SECONDS})

    async def wipe(self) -> tuple[GameState, int | None]:
        try:
            purged: int | None = await self._publisher.purge()
        except BrokerUnavailableError:
            purged = None
        return await self.restart(wipe=True), purged

    @staticmethod
    async def _announce(executor: db.Executor, event: dict[str, Any]) -> GameState:
        announced = await db.announce(executor, event)
        return GameState.model_validate(announced["state"])
