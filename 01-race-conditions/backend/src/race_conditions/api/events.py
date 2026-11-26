from collections.abc import AsyncIterable

from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent

from race_conditions import metrics
from race_conditions.api.dependencies import LiveFeedDep, RoundServiceDep

router = APIRouter(prefix="/api/game", tags=["events"])

RECONNECT_MS = 1_000


@router.get("/events", response_class=EventSourceResponse)
async def stream_events(
    feed: LiveFeedDep, rounds: RoundServiceDep
) -> AsyncIterable[ServerSentEvent]:
    with feed.subscribe() as queue, metrics.track_sse_client():
        snapshot = await rounds.snapshot()
        yield ServerSentEvent(data=snapshot, event=snapshot.type, retry=RECONNECT_MS)
        while True:
            event = await queue.get()
            yield ServerSentEvent(raw_data=event.payload, event=event.type)
