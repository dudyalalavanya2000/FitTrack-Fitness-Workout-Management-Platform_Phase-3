
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Meal, User
from app.schemas import (
    MealCreate,
    MealUpdate,
    MealResponse,
    DailyNutritionSummary,
)


router = APIRouter()


# Add a new meal

@router.post(
    "/",
    response_model=MealResponse,
    status_code=status.HTTP_201_CREATED
)
def create_meal(
    meal_data: MealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = Meal(
        user_id=current_user.id,
        **meal_data.model_dump()
    )

    db.add(meal)
    db.commit()
    db.refresh(meal)

    return meal


# Get all meals of the logged-in user

@router.get("/", response_model=list[MealResponse])
def get_meals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Meal)
        .filter(Meal.user_id == current_user.id)
        .order_by(Meal.created_at.desc())
        .all()
    )


# Get daily nutrition summary

@router.get(
    "/daily",
    response_model=DailyNutritionSummary
)
def get_daily_nutrition(
    summary_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary_date = summary_date or date.today()

    start_datetime = datetime.combine(
        summary_date,
        time.min
    )

    end_datetime = start_datetime + timedelta(days=1)

    result = (
        db.query(
            func.count(Meal.id).label("total_meals"),
            func.coalesce(
                func.sum(Meal.calories), 0
            ).label("total_calories"),
            func.coalesce(
                func.sum(Meal.protein), 0
            ).label("total_protein"),
            func.coalesce(
                func.sum(Meal.carbs), 0
            ).label("total_carbs"),
            func.coalesce(
                func.sum(Meal.fats), 0
            ).label("total_fats"),
        )
        .filter(
            Meal.user_id == current_user.id,
            Meal.created_at >= start_datetime,
            Meal.created_at < end_datetime,
        )
        .first()
    )

    return DailyNutritionSummary(
        summary_date=summary_date,
        total_meals=result.total_meals,
        total_calories=result.total_calories,
        total_protein=round(float(result.total_protein), 2),
        total_carbs=round(float(result.total_carbs), 2),
        total_fats=round(float(result.total_fats), 2),
    )


# Get a specific meal

@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = (
        db.query(Meal)
        .filter(
            Meal.id == meal_id,
            Meal.user_id == current_user.id,
        )
        .first()
    )

    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found",
        )

    return meal


# Update a meal

@router.put("/{meal_id}", response_model=MealResponse)
def update_meal(
    meal_id: int,
    meal_data: MealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = (
        db.query(Meal)
        .filter(
            Meal.id == meal_id,
            Meal.user_id == current_user.id,
        )
        .first()
    )

    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found",
        )

    update_data = meal_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in update_data.items():
        setattr(meal, field, value)

    db.commit()
    db.refresh(meal)

    return meal


# Delete a meal

@router.delete("/{meal_id}")
def delete_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = (
        db.query(Meal)
        .filter(
            Meal.id == meal_id,
            Meal.user_id == current_user.id,
        )
        .first()
    )

    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found",
        )

    db.delete(meal)
    db.commit()

    return {
        "message": "Meal deleted successfully"
    }
