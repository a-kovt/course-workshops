import uuid

import pytest
from fastapi import status
from httpx import AsyncClient

from race_conditions.api.dependencies import get_claim_service, get_round_service
from race_conditions.broker import BrokerUnavailableError
from race_conditions.models import GameState, Mode, Result
from race_conditions.services.claims import ClaimReceipt
from race_conditions.settings import Settings
from tests.conftest import Override

STATE = GameState(round=7, mode=Mode.ATOMIC, prizes_total=5, prizes_left=4, delay_ms=200, winners=1)


class FakeClaims:
    def __init__(self, receipt: ClaimReceipt | None = None) -> None:
        self.receipt = receipt
        self.calls: list[tuple[str, uuid.UUID | None]] = []

    async def submit(self, user: str, claim_id: uuid.UUID | None) -> ClaimReceipt:
        self.calls.append((user, claim_id))
        if self.receipt is None:
            raise BrokerUnavailableError
        return self.receipt


class FakeRounds:
    def __init__(self) -> None:
        self.started: list[tuple[Mode, int, int]] = []

    async def restart(self) -> GameState:
        return STATE

    async def countdown(self) -> GameState:
        return STATE

    async def start(self, mode: Mode, prizes: int, delay_ms: int) -> GameState:
        self.started.append((mode, prizes, delay_ms))
        return STATE

    async def wipe(self) -> tuple[GameState, int | None]:
        return STATE, 3


def host_headers(settings: Settings) -> dict[str, str]:
    return {"X-Admin-Token": settings.admin_token.get_secret_value()}


async def test_claim_returns_the_strategy_result(client: AsyncClient, override: Override) -> None:
    claims = FakeClaims(ClaimReceipt(Result.WON, "app1", state=STATE))
    override(get_claim_service, claims)

    response = await client.post("/api/game/claims", json={"user": "  alice  "})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["result"] == "won"
    assert response.json()["state"]["round"] == STATE.round
    assert claims.calls == [("alice", None)]


async def test_queued_claim_is_accepted_with_its_id(
    client: AsyncClient, override: Override
) -> None:
    claim_id = uuid.uuid4()
    receipt = ClaimReceipt(Result.QUEUED, "app2", claim_id=str(claim_id))
    override(get_claim_service, FakeClaims(receipt))

    response = await client.post(
        "/api/game/claims", json={"user": "bob", "claim_id": str(claim_id)}
    )

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json()["claim_id"] == str(claim_id)


async def test_claim_without_broker_is_unavailable(client: AsyncClient, override: Override) -> None:
    override(get_claim_service, FakeClaims())

    response = await client.post("/api/game/claims", json={"user": "carol"})

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.parametrize("user", ["", "   ", "x" * 41])
async def test_claim_rejects_invalid_user(
    client: AsyncClient, override: Override, user: str
) -> None:
    override(get_claim_service, FakeClaims())

    response = await client.post("/api/game/claims", json={"user": user})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


@pytest.mark.parametrize("headers", [{}, {"X-Admin-Token": "wrong"}])
async def test_host_commands_need_the_token(
    client: AsyncClient, override: Override, headers: dict[str, str]
) -> None:
    override(get_round_service, FakeRounds())

    response = await client.delete("/api/game/results", headers=headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


async def test_host_starts_a_round_with_new_settings(
    client: AsyncClient, override: Override, settings: Settings
) -> None:
    rounds = FakeRounds()
    override(get_round_service, rounds)

    response = await client.post(
        "/api/game/rounds",
        json={"mode": "for_update", "prizes": 3, "delay_ms": 0},
        headers=host_headers(settings),
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert rounds.started == [(Mode.FOR_UPDATE, 3, 0)]


async def test_players_cannot_change_round_settings(
    client: AsyncClient, override: Override
) -> None:
    rounds = FakeRounds()
    override(get_round_service, rounds)

    response = await client.post("/api/game/rounds", json={"mode": "naive"})

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert rounds.started == []


async def test_players_reset_rounds_when_allowed(client: AsyncClient, override: Override) -> None:
    override(get_round_service, FakeRounds())

    response = await client.post("/api/game/rounds")

    assert response.status_code == status.HTTP_201_CREATED


async def test_only_host_resets_rounds_when_public_reset_is_off(
    client: AsyncClient, override: Override, settings: Settings
) -> None:
    settings.public_reset = False
    override(get_round_service, FakeRounds())

    player = await client.post("/api/game/rounds")
    host = await client.post("/api/game/rounds", headers=host_headers(settings))

    assert player.status_code == status.HTTP_403_FORBIDDEN
    assert host.status_code == status.HTTP_201_CREATED
