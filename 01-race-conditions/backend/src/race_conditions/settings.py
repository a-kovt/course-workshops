import socket
from functools import lru_cache
from typing import Annotated

from pydantic import AfterValidator, Field, SecretStr
from pydantic_settings import BaseSettings

from race_conditions.models import Mode


def _not_queue(mode: Mode) -> Mode:
    if mode is Mode.QUEUE:
        msg = "the worker runs a strategy, not the queue mode"
        raise ValueError(msg)
    return mode


class Settings(BaseSettings):
    database_url: str = "postgresql://prize:prize@localhost:5432/prize"
    db_pool_size: int = Field(default=20, ge=2)
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"

    instance: str = Field(default_factory=socket.gethostname)
    admin_token: SecretStr = SecretStr("lecturer")
    public_reset: bool = True

    worker_strategy: Annotated[Mode, AfterValidator(_not_queue)] = Mode.NAIVE
    worker_prefetch: int = Field(default=1, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
