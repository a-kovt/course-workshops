import asyncio
from collections.abc import Awaitable, Callable

import asyncpg
from opentelemetry import trace

from race_conditions.db import Connection
from race_conditions.models import Claim, Mode, Outcome, Result, StaleClaimError

type Strategy = Callable[[Connection, Claim], Awaitable[Outcome]]

tracer = trace.get_tracer(__name__)

INSERT_WINNER = """
    INSERT INTO winners (round, user_name, mode, instance)
    VALUES ($1, $2, $3, $4)
"""


async def read_game(conn: Connection, claim: Claim, *, for_update: bool = False) -> asyncpg.Record:
    query = "SELECT prizes_left, delay_ms FROM game WHERE id = 1 AND round = $1"
    if for_update:
        query += " FOR UPDATE"
    game = await conn.fetchrow(query, claim.round)
    if game is None:
        raise StaleClaimError
    return game


async def slow_step(delay_ms: int) -> None:
    if delay_ms <= 0:
        return
    with tracer.start_as_current_span("slow step") as span:
        span.set_attribute("prize.delay_ms", delay_ms)
        await asyncio.sleep(delay_ms / 1000)


async def record_winner(conn: Connection, claim: Claim) -> None:
    await conn.execute(INSERT_WINNER, claim.round, claim.user, claim.label, claim.instance)


# Read, check, write. Two requests both read prizes_left = 1, both pass
# the check and both write 0: two winners, one prize (a lost update).
async def naive(conn: Connection, claim: Claim) -> Outcome:
    game = await read_game(conn, claim)
    await slow_step(game["delay_ms"])
    if game["prizes_left"] <= 0:
        return Outcome(Result.SOLD_OUT)
    await conn.execute(
        "UPDATE game SET prizes_left = $1 WHERE id = 1 AND round = $2",
        game["prizes_left"] - 1,
        claim.round,
    )
    await record_winner(conn, claim)
    return Outcome(Result.WON)


# A lock in process memory serialises requests of one process only.
# Behind a load balancer every instance has its own lock.
_process_lock = asyncio.Lock()


async def lock(conn: Connection, claim: Claim) -> Outcome:
    async with _process_lock:
        return await naive(conn, claim)


# Pessimistic locking: the row stays locked from the read until commit,
# for every instance. Correct, but concurrent claims wait in line.
async def for_update(conn: Connection, claim: Claim) -> Outcome:
    async with conn.transaction():
        game = await read_game(conn, claim, for_update=True)
        if game["prizes_left"] <= 0:
            return Outcome(Result.SOLD_OUT)
        await slow_step(game["delay_ms"])
        await conn.execute("UPDATE game SET prizes_left = prizes_left - 1 WHERE id = 1")
        await record_winner(conn, claim)
        return Outcome(Result.WON)


# The check and the write are one conditional UPDATE, and the attempts
# primary key allows one attempt per user and round. A repeated click or a
# redelivered message gets the first result back instead of a second prize.
async def atomic(conn: Connection, claim: Claim) -> Outcome:
    async with conn.transaction():
        game = await read_game(conn, claim)
        first_attempt = await conn.fetchval(
            """
            INSERT INTO attempts (round, user_name, status, claim_id)
            VALUES ($1, $2, 'pending', $3)
            ON CONFLICT DO NOTHING
            RETURNING true
            """,
            claim.round,
            claim.user,
            claim.claim_id,
        )
        if first_attempt is None:
            previous = await conn.fetchval(
                "SELECT status FROM attempts WHERE round = $1 AND user_name = $2",
                claim.round,
                claim.user,
            )
            return Outcome(Result.DUPLICATE, previous=Result(previous))

        await slow_step(game["delay_ms"])
        prizes_left = await conn.fetchval(
            """
            UPDATE game SET prizes_left = prizes_left - 1
            WHERE id = 1 AND round = $1 AND prizes_left > 0
            RETURNING prizes_left
            """,
            claim.round,
        )
        result = Result.SOLD_OUT if prizes_left is None else Result.WON
        if result is Result.WON:
            await record_winner(conn, claim)
        await conn.execute(
            "UPDATE attempts SET status = $3 WHERE round = $1 AND user_name = $2",
            claim.round,
            claim.user,
            result,
        )
        return Outcome(result)


STRATEGIES: dict[Mode, Strategy] = {
    Mode.NAIVE: naive,
    Mode.LOCK: lock,
    Mode.FOR_UPDATE: for_update,
    Mode.ATOMIC: atomic,
}
