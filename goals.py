from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Goal, User, Notification
from app.schemas import GoalCreate, GoalUpdate, GoalResponse
from app.badge_utils import award_eligible_badges


router = APIRouter()


def get_user_goal(
    goal_id: int,
    current_user: User,
    db: Session
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    return goal


# Create a fitness goal
@router.post(
    "/",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED
)
def create_goal(
    goal_data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if (
        goal_data.target_date is not None
        and goal_data.target_date < goal_data.start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date cannot be earlier than start date"
        )

    new_goal = Goal(
        user_id=current_user.id,
        **goal_data.model_dump()
    )

    db.add(new_goal)
    db.flush()

    award_eligible_badges(db, current_user.id)

    db.commit()
    db.refresh(new_goal)

    return new_goal


# Get all goals
@router.get("/", response_model=list[GoalResponse])
def get_all_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Goal).filter(
        Goal.user_id == current_user.id
    ).order_by(Goal.created_at.desc()).all()


# Get active goals
@router.get("/active", response_model=list[GoalResponse])
def get_active_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).order_by(Goal.created_at.desc()).all()


# Get completed goals
@router.get("/completed", response_model=list[GoalResponse])
def get_completed_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.status == "completed"
    ).order_by(Goal.created_at.desc()).all()


# Get one goal by ID
@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_goal(goal_id, current_user, db)


# Update a goal and generate completion notification
@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = get_user_goal(goal_id, current_user, db)

    previous_status = goal.status

    update_data = goal_data.model_dump(exclude_unset=True)

    required_fields = [
        "title",
        "goal_type",
        "target_value",
        "current_value",
        "unit",
        "start_date",
        "status"
    ]

    for field in required_fields:
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field} cannot be null"
            )

    new_start_date = update_data.get(
        "start_date",
        goal.start_date
    )

    new_target_date = update_data.get(
        "target_date",
        goal.target_date
    )

    if (
        new_target_date is not None
        and new_target_date < new_start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date cannot be earlier than start date"
        )

    for field, value in update_data.items():
        setattr(goal, field, value)

    if (
        previous_status == "active"
        and goal.status == "completed"
    ):
        notification = Notification(
            user_id=current_user.id,
            title="Fitness Goal Completed!",
            message=(
                f"Congratulations! You completed your goal: "
                f"'{goal.title}'. Keep up the great work!"
            ),
            notification_type="goal",
            is_read=False
        )

        db.add(notification)

    db.flush()

    award_eligible_badges(db, current_user.id)

    db.commit()
    db.refresh(goal)

    return goal


# Delete a goal
@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = get_user_goal(goal_id, current_user, db)

    db.delete(goal)
    db.commit()

    return {
        "message": "Goal deleted successfully"
    }