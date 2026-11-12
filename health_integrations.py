
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    User,
    HealthIntegration,
    ExternalActivity
)
from app.schemas_health import (
    HealthIntegrationCreate,
    HealthIntegrationResponse,
    ExternalActivityCreate,
    ExternalActivityResponse,
    HealthSyncResponse
)


router = APIRouter()


HealthProvider = Literal["health_connect", "apple_health"]


def validate_provider(provider: str):
    if provider not in ["health_connect", "apple_health"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported health provider."
        )


def get_user_integration(
    db: Session,
    user_id: int,
    provider: str
):
    return (
        db.query(HealthIntegration)
        .filter(
            HealthIntegration.user_id == user_id,
            HealthIntegration.provider == provider
        )
        .first()
    )


# --------------------------------------------------
# Connect Health Provider
# --------------------------------------------------

@router.post(
    "/connect",
    response_model=HealthIntegrationResponse,
    status_code=status.HTTP_201_CREATED
)
def connect_health_provider(
    integration_data: HealthIntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    provider = integration_data.provider

    integration = get_user_integration(
        db,
        current_user.id,
        provider
    )

    if integration:
        integration.is_connected = True
    else:
        integration = HealthIntegration(
            user_id=current_user.id,
            provider=provider,
            is_connected=True
        )
        db.add(integration)

    db.commit()
    db.refresh(integration)

    return integration


# --------------------------------------------------
# Get Connected Providers
# --------------------------------------------------

@router.get(
    "/integrations",
    response_model=list[HealthIntegrationResponse]
)
def get_health_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(HealthIntegration)
        .filter(HealthIntegration.user_id == current_user.id)
        .order_by(HealthIntegration.created_at.desc())
        .all()
    )


# --------------------------------------------------
# Disconnect Health Provider
# --------------------------------------------------

@router.delete(
    "/disconnect/{provider}",
    response_model=HealthIntegrationResponse
)
def disconnect_health_provider(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_provider(provider)

    integration = get_user_integration(
        db,
        current_user.id,
        provider
    )

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health integration not found."
        )

    integration.is_connected = False

    db.commit()
    db.refresh(integration)

    return integration


# --------------------------------------------------
# Sync External Activities
# --------------------------------------------------

@router.post(
    "/sync/{provider}",
    response_model=HealthSyncResponse
)
def sync_health_activities(
    provider: str,
    activities: list[ExternalActivityCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_provider(provider)

    integration = get_user_integration(
        db,
        current_user.id,
        provider
    )

    if not integration or not integration.is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect this health provider before syncing."
        )

    imported_count = 0
    skipped_count = 0
    seen_external_ids = set()

    for activity in activities:

        # Prevent duplicates inside the same request.
        if activity.external_id in seen_external_ids:
            skipped_count += 1
            continue

        seen_external_ids.add(activity.external_id)

        # Prevent importing records already stored in the database.
        existing_activity = (
            db.query(ExternalActivity)
            .filter(
                ExternalActivity.user_id == current_user.id,
                ExternalActivity.provider == provider,
                ExternalActivity.external_id == activity.external_id
            )
            .first()
        )

        if existing_activity:
            skipped_count += 1
            continue

        new_activity = ExternalActivity(
            user_id=current_user.id,
            provider=provider,
            external_id=activity.external_id,
            activity_type=activity.activity_type,
            activity_name=activity.activity_name,
            started_at=activity.started_at,
            ended_at=activity.ended_at,
            duration_minutes=activity.duration_minutes,
            steps=activity.steps,
            calories_burned=activity.calories_burned,
            distance_meters=activity.distance_meters,
            source_name=activity.source_name
        )

        db.add(new_activity)
        imported_count += 1

    integration.last_synced_at = datetime.now(timezone.utc)

    db.commit()

    return HealthSyncResponse(
        message="Health activities synchronization completed.",
        imported_count=imported_count,
        skipped_count=skipped_count
    )


# --------------------------------------------------
# Get Imported Activities
# --------------------------------------------------

@router.get(
    "/activities",
    response_model=list[ExternalActivityResponse]
)
def get_external_activities(
    provider: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExternalActivity).filter(
        ExternalActivity.user_id == current_user.id
    )

    if provider:
        validate_provider(provider)
        query = query.filter(
            ExternalActivity.provider == provider
        )

    return (
        query
        .order_by(ExternalActivity.started_at.desc())
        .all()
    )
