import asyncio
import os
from collections.abc import AsyncIterator

import pytest

from race_conditions import db
from race_conditions.models import Claim, Mode, Result
from race_conditions.strategies import STRATEGIES

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(DATABASE_URL is None, reason="TEST_DATABASE_URL is not set"),
]

PLAYERS = 20
PRIZES = 3
DELAY_MS = 50


@pytest.fixture(scope="module")
async def pool() -> AsyncIterator[db.Pool]:
    assert DATABASE_URL is not None
    pool = await db.create_pool(DATABASE_URL, max_size=PLAYERS + 2)
    yield pool
    await pool.close()


async def new_round(pool: db.Pool, mode: Mode) -> int:
    async with pool.acquire() as conn:
        await db.start_round(conn, mode, PRIZES, DELAY_MS)
        return (await db.read_state(conn)).round


async def claim(pool: db.Pool, mode: Mode, user: str, round_: int) -> Result:
    async with pool.acquire() as conn:
        outcome = await STRATEGIES[mode](conn, Claim(user, round_, "test", mode))
        return outcome.result


async def race(pool: db.Pool, mode: Mode) -> list[Result]:
    round_ = await new_round(pool, mode)
    return await asyncio.gather(*(claim(pool, mode, f"player-{i}", round_) for i in range(PLAYERS)))


async def test_naive_hands_out_more_prizes_than_exist(pool: db.Pool) -> None:
    results = await race(pool, Mode.NAIVE)

    assert results.count(Result.WON) > PRIZES


@pytest.mark.parametrize("mode", [Mode.LOCK, Mode.FOR_UPDATE, Mode.ATOMIC])
async def test_safe_strategies_hand_out_every_prize_once(pool: db.Pool, mode: Mode) -> None:
    results = await race(pool, mode)

    assert results.count(Result.WON) == PRIZES
    assert results.count(Result.SOLD_OUT) == PLAYERS - PRIZES


async def test_atomic_repeated_claim_returns_the_first_result(pool: db.Pool) -> None:
    round_ = await new_round(pool, Mode.ATOMIC)

    results = await asyncio.gather(*(claim(pool, Mode.ATOMIC, "eager", round_) for _ in range(3)))

    assert sorted(results) == sorted([Result.WON, Result.DUPLICATE, Result.DUPLICATE])
