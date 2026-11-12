
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ActivityType = Literal[
    "walking",
    "running",
    "cycling",
    "cardio",
    "strength",
    "yoga"
]


class WorkoutSessionStart(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    activity_type: ActivityType
    body_weight_kg: float = Field(gt=0, le=300)


class WorkoutSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    activity_type: str
    status: str
    body_weight_kg: float
    started_at: datetime
    paused_at: datetime | None
    ended_at: datetime | None
    elapsed_seconds: int
    duration_seconds: int | None
    calories_burned: float
    created_at: datetime | None

    model_config = {"from_attributes": True}
