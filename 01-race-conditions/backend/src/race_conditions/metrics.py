from collections.abc import Callable, Generator, Iterable
from contextlib import contextmanager

from opentelemetry import metrics
from opentelemetry.metrics import CallbackOptions, Observation

from race_conditions.models import GameState

meter = metrics.get_meter(__name__)

claims = meter.create_counter("prize_claims", description="Claim attempts by mode and result")
claim_duration = meter.create_histogram(
    "prize_claim_duration", unit="ms", description="Time to handle one claim"
)
queue_wait = meter.create_histogram(
    "prize_queue_wait", unit="ms", description="Time a claim waited in the queue"
)
sse_clients = meter.create_up_down_counter("prize_sse_clients", description="Open SSE streams")


@contextmanager
def track_sse_client() -> Generator[None]:
    sse_clients.add(1)
    try:
        yield
    finally:
        sse_clients.add(-1)


def observe_game_state(current_state: Callable[[], GameState | None]) -> None:
    def gauge(
        field: Callable[[GameState], int],
    ) -> Callable[[CallbackOptions], Iterable[Observation]]:
        def callback(_options: CallbackOptions) -> Iterable[Observation]:
            state = current_state()
            return [] if state is None else [Observation(field(state))]

        return callback

    meter.create_observable_gauge("prize_prizes_left", callbacks=[gauge(lambda s: s.prizes_left)])
    meter.create_observable_gauge("prize_winners", callbacks=[gauge(lambda s: s.winners)])
    meter.create_observable_gauge("prize_oversold", callbacks=[gauge(lambda s: s.oversold)])
