import asyncio
from collections.abc import AsyncGenerator, MutableMapping
from contextlib import asynccontextmanager
from typing import Any, TypedDict

from fastapi import FastAPI

from race_conditions import api, db, metrics
from race_conditions.broker import ClaimPublisher
from race_conditions.services.claims import ClaimService
from race_conditions.services.live import LiveFeed
from race_conditions.services.rounds import RoundService
from race_conditions.settings import get_settings
from race_conditions.telemetry import setup_telemetry


class State(TypedDict):
    claims: ClaimService
    rounds: RoundService
    feed: LiveFeed


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[State]:
    settings = get_settings()
    setup_telemetry("race-conditions-api", settings.instance)
    pool = await db.create_pool(settings.database_url, settings.db_pool_size)
    publisher = ClaimPublisher(settings.rabbitmq_url)
    feed = LiveFeed(settings.database_url, pool)
    metrics.observe_game_state(lambda: feed.state)

    async with asyncio.TaskGroup() as tasks:
        listener = tasks.create_task(feed.run())
        try:
            yield State(
                claims=ClaimService(pool, feed, publisher, settings.instance),
                rounds=RoundService(pool, publisher, settings.instance),
                feed=feed,
            )
        finally:
            listener.cancel()
            await publisher.close()
            await pool.close()


def _is_event_stream(scope: MutableMapping[str, Any]) -> bool:
    return bool(scope.get("path") == "/api/game/events")


app = FastAPI(
    title="Race Conditions",
    lifespan=lifespan,
    max_body_size=16 * 1024,
    telemetry={"exclude": _is_event_stream},
)
app.include_router(api.router)
