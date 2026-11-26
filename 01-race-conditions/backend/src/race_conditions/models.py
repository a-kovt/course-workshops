from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel


class Mode(StrEnum):
    NAIVE = "naive"
    LOCK = "lock"
    FOR_UPDATE = "for_update"
    ATOMIC = "atomic"
    QUEUE = "queue"


class Result(StrEnum):
    WON = "won"
    SOLD_OUT = "sold_out"
    DUPLICATE = "duplicate"
    STALE = "stale"
    QUEUED = "queued"


class GameState(BaseModel):
    round: int
    mode: Mode
    prizes_total: int
    prizes_left: int
    delay_ms: int
    winners: int

    @property
    def oversold(self) -> int:
        return max(0, self.winners - self.prizes_total)


class Winner(BaseModel):
    user_name: str
    instance: str
    mode: str


class Snapshot(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    state: GameState
    winners: list[Winner]
    instance: str


@dataclass(frozen=True, slots=True)
class Claim:
    user: str
    round: int
    instance: str
    label: str
    claim_id: str | None = None


@dataclass(frozen=True, slots=True)
class Outcome:
    result: Result
    previous: Result | None = None


class StaleClaimError(Exception):
    pass
