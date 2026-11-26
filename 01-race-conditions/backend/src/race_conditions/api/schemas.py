import uuid
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from race_conditions.models import GameState, Mode


class ClaimRequest(BaseModel):
    user: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    claim_id: uuid.UUID | None = None


class RoundSettings(BaseModel):
    mode: Mode
    prizes: int = Field(default=5, ge=1, le=1_000)
    delay_ms: int = Field(default=200, ge=0, le=5_000)


class RoundResponse(BaseModel):
    state: GameState
    purged: int | None = None
