from collections.abc import AsyncIterator, Callable, Iterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from race_conditions.main import app
from race_conditions.settings import Settings, get_settings

type Override = Callable[[Callable[..., Any], object], None]


@pytest.fixture
def settings() -> Settings:
    return Settings(admin_token="test-token", public_reset=True, instance="test")


@pytest.fixture
def override(settings: Settings) -> Iterator[Override]:
    def replace(dependency: Callable[..., Any], value: object) -> None:
        app.dependency_overrides[dependency] = lambda: value

    replace(get_settings, settings)
    yield replace
    app.dependency_overrides.clear()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
