
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import WaterIntake, WaterGoal, User
from app.schemas import (
    WaterIntakeCreate,
    WaterIntakeUpdate,
    WaterIntakeResponse,
    WaterGoalUpdate,
    WaterDailySummary,
)

router = APIRouter()


def get_user_water_goal(db: Session, user_id: int) -> int:
    goal = (
        db.query(WaterGoal)
        .filter(WaterGoal.user_id == user_id)
        .first()
    )

    return goal.target_ml if goal else 2500


# Create water intake record

@router.post(
    "/",
    response_model=WaterIntakeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_water_intake(
    intake_data: WaterIntakeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = WaterIntake(
        user_id=current_user.id,
        **intake_data.model_dump()
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


# Get all water intake records

@router.get("/", response_model=list[WaterIntakeResponse])
def get_water_intakes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(WaterIntake)
        .filter(WaterIntake.user_id == current_user.id)
        .order_by(WaterIntake.intake_date.desc(), WaterIntake.created_at.desc())
        .all()
    )


# Get daily water summary

@router.get("/daily", response_model=WaterDailySummary)
def get_daily_water_summary(
    summary_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    selected_date = summary_date or date.today()

    result = (
        db.query(
            func.coalesce(func.sum(WaterIntake.quantity_ml), 0).label("total_ml"),
            func.count(WaterIntake.id).label("total_records"),
        )
        .filter(
            WaterIntake.user_id == current_user.id,
            WaterIntake.intake_date == selected_date
        )
        .first()
    )

    goal_ml = get_user_water_goal(db, current_user.id)
    total_ml = int(result.total_ml)

    remaining_ml = max(goal_ml - total_ml, 0)
    progress_percentage = round(
        min((total_ml / goal_ml) * 100, 100),
        2
    )

    return WaterDailySummary(
        summary_date=selected_date,
        total_intake_ml=total_ml,
        daily_goal_ml=goal_ml,
        remaining_ml=remaining_ml,
        progress_percentage=progress_percentage,
        total_records=result.total_records,
    )


# Get and update the daily water goal

@router.put("/goal")
def update_water_goal(
    goal_data: WaterGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = (
        db.query(WaterGoal)
        .filter(WaterGoal.user_id == current_user.id)
        .first()
    )

    if goal:
        goal.target_ml = goal_data.target_ml
    else:
        goal = WaterGoal(
            user_id=current_user.id,
            target_ml=goal_data.target_ml
        )
        db.add(goal)

    db.commit()
    db.refresh(goal)

    return {
        "message": "Daily water goal updated successfully",
        "user_id": current_user.id,
        "daily_goal_ml": goal.target_ml
    }


# Get individual water intake record

@router.get("/{record_id}", response_model=WaterIntakeResponse)
def get_water_intake(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(WaterIntake)
        .filter(
            WaterIntake.id == record_id,
            WaterIntake.user_id == current_user.id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water intake record not found"
        )

    return record


# Update water intake record

@router.put("/{record_id}", response_model=WaterIntakeResponse)
def update_water_intake(
    record_id: int,
    intake_data: WaterIntakeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(WaterIntake)
        .filter(
            WaterIntake.id == record_id,
            WaterIntake.user_id == current_user.id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water intake record not found"
        )

    update_data = intake_data.model_dump(
        exclude_unset=True,
        exclude_none=True
    )

    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    return record


# Delete water intake record

@router.delete("/{record_id}")
def delete_water_intake(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(WaterIntake)
        .filter(
            WaterIntake.id == record_id,
            WaterIntake.user_id == current_user.id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water intake record not found"
        )

    db.delete(record)
    db.commit()

    return {"message": "Water intake record deleted successfully"}
