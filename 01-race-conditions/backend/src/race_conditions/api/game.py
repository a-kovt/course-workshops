from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from race_conditions.api.dependencies import (
    AdminTokenDep,
    ClaimServiceDep,
    RoundServiceDep,
    SettingsDep,
    require_admin,
    require_reset_right,
)
from race_conditions.api.schemas import ClaimRequest, RoundResponse, RoundSettings
from race_conditions.broker import BrokerUnavailableError
from race_conditions.models import Result, Snapshot
from race_conditions.services.claims import ClaimReceipt

router = APIRouter(prefix="/api/game", tags=["game"])

FORBIDDEN: dict[int | str, dict[str, Any]] = {
    status.HTTP_403_FORBIDDEN: {"description": "Host token required"}
}


@router.get("")
async def get_game(rounds: RoundServiceDep) -> Snapshot:
    return await rounds.snapshot()


@router.post(
    "/claims",
    responses={
        status.HTTP_202_ACCEPTED: {"description": "Queued; the result arrives over SSE"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Queue mode without a broker"},
    },
)
async def create_claim(
    body: ClaimRequest, claims: ClaimServiceDep, response: Response
) -> ClaimReceipt:
    try:
        receipt = await claims.submit(body.user, body.claim_id)
    except BrokerUnavailableError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Message broker is not running"
        ) from exc
    if receipt.result is Result.QUEUED:
        response.status_code = status.HTTP_202_ACCEPTED
    return receipt


@router.post("/rounds", status_code=status.HTTP_201_CREATED, responses=FORBIDDEN)
async def create_round(
    rounds: RoundServiceDep,
    token: AdminTokenDep,
    settings: SettingsDep,
    new_settings: RoundSettings | None = None,
) -> RoundResponse:
    if new_settings is None:
        await require_reset_right(token, settings)
        return RoundResponse(state=await rounds.restart())
    await require_admin(token, settings)
    state = await rounds.start(new_settings.mode, new_settings.prizes, new_settings.delay_ms)
    return RoundResponse(state=state)


@router.post("/countdowns", dependencies=[Depends(require_reset_right)], responses=FORBIDDEN)
async def create_countdown(rounds: RoundServiceDep) -> RoundResponse:
    return RoundResponse(state=await rounds.countdown())


@router.delete("/results", dependencies=[Depends(require_admin)], responses=FORBIDDEN)
async def delete_results(rounds: RoundServiceDep) -> RoundResponse:
    state, purged = await rounds.wipe()
    return RoundResponse(state=state, purged=purged)
