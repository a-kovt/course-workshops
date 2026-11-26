from fastapi import APIRouter

from race_conditions.api import events, game

router = APIRouter()
router.include_router(game.router)
router.include_router(events.router)
