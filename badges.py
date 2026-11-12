from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Badge, User, UserBadge
from app.schemas import BadgeResponse, UserBadgeResponse
from app.badge_utils import ensure_default_badges


router = APIRouter()


# Get all available badges
@router.get("/", response_model=list[BadgeResponse])
def get_all_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_badges(db)
    db.commit()

    return db.query(Badge).order_by(Badge.id.asc()).all()


# Get badges earned by the logged-in user
@router.get("/me", response_model=list[UserBadgeResponse])
def get_my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_badges(db)
    db.commit()

    earned_badges = db.query(
        UserBadge.id.label("id"),
        UserBadge.user_id.label("user_id"),
        Badge.id.label("badge_id"),
        Badge.name.label("badge_name"),
        Badge.description.label("badge_description"),
        Badge.icon.label("badge_icon"),
        UserBadge.earned_at.label("earned_at")
    ).join(
        Badge,
        UserBadge.badge_id == Badge.id
    ).filter(
        UserBadge.user_id == current_user.id
    ).order_by(
        UserBadge.earned_at.desc()
    ).all()

    return [
        {
            "id": badge.id,
            "user_id": badge.user_id,
            "badge_id": badge.badge_id,
            "badge_name": badge.badge_name,
            "badge_description": badge.badge_description,
            "badge_icon": badge.badge_icon,
            "earned_at": badge.earned_at
        }
        for badge in earned_badges
    ]


# Get one available badge by ID
@router.get("/{badge_id}", response_model=BadgeResponse)
def get_badge(
    badge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_badges(db)
    db.commit()

    badge = db.query(Badge).filter(
        Badge.id == badge_id
    ).first()

    if badge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found"
        )

    return badge