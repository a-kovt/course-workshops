import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader

from race_conditions.services.claims import ClaimService
from race_conditions.services.live import LiveFeed
from race_conditions.services.rounds import RoundService
from race_conditions.settings import Settings, get_settings


async def get_claim_service(request: Request) -> ClaimService:
    service: ClaimService = request.state.claims
    return service


async def get_round_service(request: Request) -> RoundService:
    service: RoundService = request.state.rounds
    return service


async def get_live_feed(request: Request) -> LiveFeed:
    feed: LiveFeed = request.state.feed
    return feed


SettingsDep = Annotated[Settings, Depends(get_settings)]
ClaimServiceDep = Annotated[ClaimService, Depends(get_claim_service)]
RoundServiceDep = Annotated[RoundService, Depends(get_round_service)]
LiveFeedDep = Annotated[LiveFeed, Depends(get_live_feed)]

admin_token_header = APIKeyHeader(name="X-Admin-Token", auto_error=False)
AdminTokenDep = Annotated[str | None, Security(admin_token_header)]


async def require_admin(token: AdminTokenDep, settings: SettingsDep) -> None:
    expected = settings.admin_token.get_secret_value()
    if token is None or not secrets.compare_digest(token, expected):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Wrong host token")


async def require_reset_right(token: AdminTokenDep, settings: SettingsDep) -> None:
    if not settings.public_reset:
        await require_admin(token, settings)
