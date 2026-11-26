import time
import uuid
from dataclasses import dataclass

from opentelemetry import trace

from race_conditions import db, metrics
from race_conditions.broker import ClaimMessage, ClaimPublisher
from race_conditions.models import Claim, GameState, Mode, Outcome, Result, StaleClaimError
from race_conditions.services.live import LiveFeed
from race_conditions.strategies import STRATEGIES

tracer = trace.get_tracer(__name__)


@dataclass(frozen=True, slots=True)
class ClaimReceipt:
    result: Result
    instance: str
    previous: Result | None = None
    claim_id: str | None = None
    state: GameState | None = None


async def process_claim(pool: db.Pool, mode: Mode, claim: Claim) -> tuple[Outcome, GameState]:
    started = time.perf_counter()
    with tracer.start_as_current_span(f"claim {claim.label}") as span:
        span.set_attributes({"prize.user": claim.user, "prize.strategy": mode})
        async with pool.acquire() as conn:
            try:
                outcome = await STRATEGIES[mode](conn, claim)
            except StaleClaimError:
                outcome = Outcome(Result.STALE)
            span.set_attribute("prize.result", outcome.result)
            event = await db.announce(
                conn,
                {
                    "type": "claim",
                    "round": claim.round,
                    "user": claim.user,
                    "result": outcome.result,
                    "previous": outcome.previous,
                    "instance": claim.instance,
                    "mode": claim.label,
                    "claim_id": claim.claim_id,
                },
            )
    metrics.claims.add(1, {"mode": claim.label, "result": outcome.result})
    metrics.claim_duration.record((time.perf_counter() - started) * 1000, {"mode": claim.label})
    return outcome, GameState.model_validate(event["state"])


class ClaimService:
    def __init__(
        self, pool: db.Pool, feed: LiveFeed, publisher: ClaimPublisher, instance: str
    ) -> None:
        self._pool = pool
        self._feed = feed
        self._publisher = publisher
        self._instance = instance

    async def submit(self, user: str, claim_id: uuid.UUID | None) -> ClaimReceipt:
        state = self._feed.state or await db.read_state(self._pool)
        if state.mode is Mode.QUEUE:
            return await self._enqueue(user, state.round, str(claim_id or uuid.uuid4()))

        claim = Claim(user, state.round, self._instance, state.mode)
        outcome, new_state = await process_claim(self._pool, state.mode, claim)
        return ClaimReceipt(
            outcome.result, self._instance, previous=outcome.previous, state=new_state
        )

    async def _enqueue(self, user: str, round_: int, claim_id: str) -> ClaimReceipt:
        await self._publisher.publish(
            ClaimMessage(claim_id=claim_id, user=user, round=round_, accepted_by=self._instance)
        )
        metrics.claims.add(1, {"mode": Mode.QUEUE, "result": Result.QUEUED})
        return ClaimReceipt(Result.QUEUED, self._instance, claim_id=claim_id)
