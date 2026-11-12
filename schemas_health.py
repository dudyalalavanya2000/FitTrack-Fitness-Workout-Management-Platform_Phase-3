
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


HealthProvider = Literal["health_connect", "apple_health"]


class HealthIntegrationCreate(BaseModel):
    provider: HealthProvider


class HealthIntegrationResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    is_connected: bool
    last_synced_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ExternalActivityCreate(BaseModel):
    external_id: str = Field(min_length=1, max_length=150)
    activity_type: str = Field(min_length=2, max_length=50)
    activity_name: str | None = Field(default=None, max_length=150)

    started_at: datetime
    ended_at: datetime | None = None

    duration_minutes: float = Field(default=0, ge=0)
    steps: int = Field(default=0, ge=0)
    calories_burned: float = Field(default=0, ge=0)
    distance_meters: float = Field(default=0, ge=0)

    source_name: str | None = Field(default=None, max_length=100)


class ExternalActivityResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    external_id: str
    activity_type: str
    activity_name: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: float
    steps: int
    calories_burned: float
    distance_meters: float
    source_name: str | None
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class HealthSyncResponse(BaseModel):
    message: str
    imported_count: int
    skipped_count: int
