from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import StreakResponse
from app.streak_utils import recalculate_user_streak


router = APIRouter()


# Get and automatically recalculate the logged-in user's streak
@router.get(
    "/me",
    response_model=StreakResponse
)
def get_my_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    streak = recalculate_user_streak(
        db,
        current_user.id
    )

    db.commit()
    db.refresh(streak)

    return streak