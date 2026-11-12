from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Exercise, WorkoutExercise, User
from app.schemas import (
    ExerciseCreate,
    ExerciseUpdate,
    ExerciseResponse,
    ExerciseCategory
)
from app.dependencies import get_current_user


router = APIRouter()


# Create a new exercise
@router.post(
    "/",
    response_model=ExerciseResponse,
    status_code=status.HTTP_201_CREATED
)
def create_exercise(
    exercise_data: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_exercise = Exercise(
        **exercise_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)

    return new_exercise


# Get all exercises, with optional category filtering
@router.get("/", response_model=list[ExerciseResponse])
def get_exercises(
    category: ExerciseCategory | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Exercise).filter(
        Exercise.user_id == current_user.id
    )

    if category:
        query = query.filter(Exercise.category == category)

    return query.order_by(Exercise.name.asc()).all()


# Search exercises by name
@router.get("/search", response_model=list[ExerciseResponse])
def search_exercises(
    query: str = Query(min_length=1, max_length=100),
    category: ExerciseCategory | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    search_term = query.strip()

    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query cannot be empty"
        )

    exercise_query = db.query(Exercise).filter(
        Exercise.user_id == current_user.id,
        Exercise.name.ilike(f"%{search_term}%")
    )

    if category:
        exercise_query = exercise_query.filter(
            Exercise.category == category
        )

    return exercise_query.order_by(Exercise.name.asc()).all()


# Get one exercise by ID
@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.user_id == current_user.id
    ).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    return exercise


# Update an exercise
@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.user_id == current_user.id
    ).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    update_data = exercise_data.model_dump(exclude_unset=True)

    for field in ("name", "category", "duration_minutes"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null"
            )

    for key, value in update_data.items():
        setattr(exercise, key, value)

    db.commit()
    db.refresh(exercise)

    return exercise


# Delete an exercise and its workout associations
@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.user_id == current_user.id
    ).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    db.query(WorkoutExercise).filter(
        WorkoutExercise.exercise_id == exercise.id
    ).delete(synchronize_session=False)

    db.delete(exercise)
    db.commit()

    return {
        "message": "Exercise deleted successfully"
    }