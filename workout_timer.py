
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import WorkoutSession, User
from app.schemas_workout_timer import (
    WorkoutSessionStart,
    WorkoutSessionResponse,
)


router = APIRouter()


# Approximate MET values used for calorie estimation.
MET_VALUES = {
    "walking": 3.5,
    "running": 8.0,
    "cycling": 6.0,
    "cardio": 6.0,
    "strength": 5.0,
    "yoga": 2.5,
}


def get_utc_now():
    return datetime.now(timezone.utc)


def make_aware_utc(value: datetime):
    # SQLite may return timezone-naive datetimes.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def calculate_elapsed_seconds(session: WorkoutSession) -> int:
    elapsed = session.accumulated_seconds or 0

    if session.status == "running":
        started_at = make_aware_utc(session.started_at)
        elapsed += max(
            0,
            int((get_utc_now() - started_at).total_seconds())
        )

    return elapsed


def calculate_calories(
    activity_type: str,
    body_weight_kg: float,
    duration_seconds: int
) -> float:
    duration_hours = duration_seconds / 3600

    met_value = MET_VALUES.get(activity_type, 4.0)

    # Standard approximate MET calorie calculation.
    calories = met_value * body_weight_kg * duration_hours

    return round(calories, 2)


def get_owned_session(
    db: Session,
    session_id: int,
    user_id: int
):
    session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == user_id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    return session


def build_session_response(session: WorkoutSession):
    elapsed = (
        session.duration_seconds
        if session.status == "completed"
        else calculate_elapsed_seconds(session)
    )

    calories = calculate_calories(
        session.activity_type,
        session.body_weight_kg,
        elapsed
    )

    return WorkoutSessionResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        activity_type=session.activity_type,
        status=session.status,
        body_weight_kg=session.body_weight_kg,
        started_at=session.started_at,
        paused_at=session.paused_at,
        ended_at=session.ended_at,
        elapsed_seconds=elapsed,
        duration_seconds=session.duration_seconds,
        calories_burned=calories,
        created_at=session.created_at,
    )


@router.post(
    "/sessions/start",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED
)
def start_workout_session(
    session_data: WorkoutSessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status.in_(["running", "paused"])
        )
        .first()
    )

    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active workout session. "
                   "Complete or resume it before starting another."
        )

    session = WorkoutSession(
        user_id=current_user.id,
        title=session_data.title,
        activity_type=session_data.activity_type,
        body_weight_kg=session_data.body_weight_kg,
        status="running",
        started_at=get_utc_now(),
        accumulated_seconds=0,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return build_session_response(session)


@router.post(
    "/sessions/{session_id}/pause",
    response_model=WorkoutSessionResponse
)
def pause_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(db, session_id, current_user.id)

    if session.status != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only a running workout session can be paused."
        )

    session.accumulated_seconds = calculate_elapsed_seconds(session)
    session.paused_at = get_utc_now()
    session.status = "paused"

    db.commit()
    db.refresh(session)

    return build_session_response(session)


@router.post(
    "/sessions/{session_id}/resume",
    response_model=WorkoutSessionResponse
)
def resume_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(db, session_id, current_user.id)

    if session.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only a paused workout session can be resumed."
        )

    session.started_at = get_utc_now()
    session.paused_at = None
    session.status = "running"

    db.commit()
    db.refresh(session)

    return build_session_response(session)


@router.post(
    "/sessions/{session_id}/stop",
    response_model=WorkoutSessionResponse
)
def stop_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(db, session_id, current_user.id)

    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This workout session is already completed."
        )

    elapsed = calculate_elapsed_seconds(session)

    session.accumulated_seconds = elapsed
    session.duration_seconds = elapsed
    session.ended_at = get_utc_now()
    session.status = "completed"

    session.calories_burned = calculate_calories(
        session.activity_type,
        session.body_weight_kg,
        elapsed
    )

    db.commit()
    db.refresh(session)

    return build_session_response(session)


@router.get(
    "/sessions/active",
    response_model=WorkoutSessionResponse | None
)
def get_active_workout_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status.in_(["running", "paused"])
        )
        .first()
    )

    if not session:
        return None

    return build_session_response(session)


@router.get(
    "/sessions/",
    response_model=list[WorkoutSessionResponse]
)
def get_workout_session_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.created_at.desc())
        .all()
    )

    return [
        build_session_response(session)
        for session in sessions
    ]


@router.get(
    "/sessions/{session_id}",
    response_model=WorkoutSessionResponse
)
def get_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(db, session_id, current_user.id)

    return build_session_response(session)
