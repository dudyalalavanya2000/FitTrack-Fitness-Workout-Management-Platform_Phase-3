from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Workout,
    User,
    Notification,
    Exercise,
    WorkoutExercise
)
from app.schemas import (
    WorkoutCreate,
    WorkoutUpdate,
    WorkoutResponse,
    ExerciseResponse,
    WorkoutExerciseResponse
)
from app.dependencies import get_current_user
from app.streak_utils import recalculate_user_streak
from app.badge_utils import award_eligible_badges


router = APIRouter()


# Create a workout and generate notification
@router.post(
    "/",
    response_model=WorkoutResponse,
    status_code=status.HTTP_201_CREATED
)
def create_workout(
    workout_data: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_workout = Workout(
        **workout_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_workout)
    db.flush()

    notification = Notification(
        user_id=current_user.id,
        title="Workout Added Successfully",
        message=(
            f"Your workout '{workout_data.name}' has been added. "
            f"Duration: {workout_data.duration_minutes} minutes."
        ),
        notification_type="workout",
        is_read=False
    )

    db.add(notification)

    recalculate_user_streak(db, current_user.id)

    award_eligible_badges(db, current_user.id)

    db.commit()
    db.refresh(new_workout)

    return new_workout


# Get all workouts belonging to the logged-in user
@router.get("/", response_model=list[WorkoutResponse])
def get_my_workouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id
    ).order_by(Workout.workout_date.desc()).all()

    return workouts


# Add an exercise to a workout
@router.post(
    "/{workout_id}/exercises/{exercise_id}",
    response_model=WorkoutExerciseResponse,
    status_code=status.HTTP_201_CREATED
)
def add_exercise_to_workout(
    workout_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    exercise = db.query(Exercise).filter(
        Exercise.id == exercise_id,
        Exercise.user_id == current_user.id
    ).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    existing_link = db.query(WorkoutExercise).filter(
        WorkoutExercise.workout_id == workout_id,
        WorkoutExercise.exercise_id == exercise_id
    ).first()

    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exercise is already added to the workout"
        )

    workout_exercise = WorkoutExercise(
        workout_id=workout_id,
        exercise_id=exercise_id
    )

    db.add(workout_exercise)
    db.commit()
    db.refresh(workout_exercise)

    return workout_exercise


# View exercises belonging to a workout
@router.get(
    "/{workout_id}/exercises",
    response_model=list[ExerciseResponse]
)
def get_workout_exercises(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    exercises = db.query(Exercise).join(
        WorkoutExercise,
        WorkoutExercise.exercise_id == Exercise.id
    ).filter(
        WorkoutExercise.workout_id == workout_id,
        Exercise.user_id == current_user.id
    ).order_by(Exercise.name.asc()).all()

    return exercises


# Get one workout by ID
@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    return workout


# Update a workout and recalculate streak and badges
@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(
    workout_id: int,
    workout_data: WorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    update_data = workout_data.model_dump(exclude_unset=True)

    for field in (
        "name",
        "workout_type",
        "duration_minutes",
        "workout_date"
    ):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null"
            )

    for key, value in update_data.items():
        setattr(workout, key, value)

    db.flush()

    recalculate_user_streak(db, current_user.id)

    award_eligible_badges(db, current_user.id)

    db.commit()
    db.refresh(workout)

    return workout


# Delete a workout and its exercise associations.
# Then recalculate the user's streak.
@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )

    db.query(WorkoutExercise).filter(
        WorkoutExercise.workout_id == workout.id
    ).delete(synchronize_session=False)

    db.delete(workout)
    db.flush()

    recalculate_user_streak(db, current_user.id)

    # Previously earned badges are permanent and are not removed.
    award_eligible_badges(db, current_user.id)

    db.commit()

    return {
        "message": "Workout deleted successfully"
    }