import json
from typing import Any

import asyncpg
from asyncpg.pool import PoolConnectionProxy

from race_conditions.models import GameState, Mode, Winner

type Connection = asyncpg.Connection[asyncpg.Record] | PoolConnectionProxy[asyncpg.Record]
type Pool = asyncpg.Pool[asyncpg.Record]
type Executor = Pool | Connection

CHANNEL = "prize_events"

STATE_QUERY = """
    SELECT round, mode, prizes_total, prizes_left, delay_ms, winners
    FROM game_state
"""

ANNOUNCE_QUERY = """
    SELECT payload, pg_notify($1, payload)
    FROM (
        SELECT ($2::jsonb || jsonb_build_object('state', to_jsonb(state)))::text AS payload
        FROM game_state AS state
    ) AS event
"""


async def create_pool(dsn: str, max_size: int) -> Pool:
    return await asyncpg.create_pool(dsn, min_size=2, max_size=max_size)


async def connect(dsn: str) -> asyncpg.Connection[asyncpg.Record]:
    return await asyncpg.connect(dsn)


async def read_state(executor: Executor) -> GameState:
    row = await executor.fetchrow(STATE_QUERY)
    return GameState.model_validate(dict(row or {}))


async def recent_winners(executor: Executor, round_: int, limit: int = 50) -> list[Winner]:
    rows = await executor.fetch(
        """
        SELECT user_name, instance, mode FROM winners
        WHERE round = $1
        ORDER BY id DESC
        LIMIT $2
        """,
        round_,
        limit,
    )
    return [Winner.model_validate(dict(row)) for row in rows]


async def announce(executor: Executor, event: dict[str, Any]) -> dict[str, Any]:
    payload = await executor.fetchval(ANNOUNCE_QUERY, CHANNEL, json.dumps(event))
    announced: dict[str, Any] = json.loads(payload)
    return announced


async def start_round(executor: Executor, mode: Mode, prizes: int, delay_ms: int) -> None:
    await executor.execute(
        """
        UPDATE game
        SET round = round + 1, mode = $1, prizes_total = $2, prizes_left = $2,
            delay_ms = $3, started_at = now()
        WHERE id = 1
        """,
        mode,
        prizes,
        delay_ms,
    )


async def next_round(conn: Connection, *, wipe: bool = False) -> None:
    # The round grows even on a wipe, so claims still in the queue come back stale.
    async with conn.transaction():
        if wipe:
            await conn.execute("TRUNCATE winners, attempts")
        await conn.execute(
            """
            UPDATE game
            SET round = round + 1, prizes_left = prizes_total, started_at = now()
            WHERE id = 1
            """
        )
