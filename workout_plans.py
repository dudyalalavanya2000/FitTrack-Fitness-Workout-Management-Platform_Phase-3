
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkoutPlan, User, Notification
from app.schemas import (
    WorkoutPlanCreate,
    WorkoutPlanUpdate,
    WorkoutPlanResponse
)
from app.dependencies import get_current_user


router = APIRouter()


# Create a workout plan
@router.post(
    "/",
    response_model=WorkoutPlanResponse,
    status_code=status.HTTP_201_CREATED
)
def create_workout_plan(
    plan_data: WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if plan_data.scheduled_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Workout plan date cannot be in the past"
        )

    new_plan = WorkoutPlan(
        **plan_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_plan)

    notification = Notification(
        user_id=current_user.id,
        title="Workout Plan Scheduled",
        message=(
            f"Your workout plan '{plan_data.title}' "
            f"has been scheduled for {plan_data.scheduled_date}."
        ),
        notification_type="workout",
        is_read=False
    )

    db.add(notification)

    db.commit()
    db.refresh(new_plan)

    return new_plan


# Get all workout plans of the logged-in user
@router.get(
    "/",
    response_model=list[WorkoutPlanResponse]
)
def get_my_workout_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plans = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id
    ).order_by(
        WorkoutPlan.scheduled_date.asc()
    ).all()

    return plans


# Get upcoming workout plans
@router.get(
    "/upcoming",
    response_model=list[WorkoutPlanResponse]
)
def get_upcoming_workout_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plans = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id,
        WorkoutPlan.scheduled_date >= date.today()
    ).order_by(
        WorkoutPlan.scheduled_date.asc()
    ).all()

    return plans


# Get an individual workout plan
@router.get(
    "/{plan_id}",
    response_model=WorkoutPlanResponse
)
def get_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )

    return plan


# Update a workout plan
@router.put(
    "/{plan_id}",
    response_model=WorkoutPlanResponse
)
def update_workout_plan(
    plan_id: int,
    plan_data: WorkoutPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )

    update_data = plan_data.model_dump(exclude_unset=True)

    for field in ("title", "scheduled_date"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null"
            )

    new_date = update_data.get(
        "scheduled_date",
        plan.scheduled_date
    )

    if new_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Workout plan date cannot be in the past"
        )

    for key, value in update_data.items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)

    return plan


# Delete a workout plan
@router.delete("/{plan_id}")
def delete_workout_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )

    db.delete(plan)
    db.commit()

    return {
        "message": "Workout plan deleted successfully"
    }
