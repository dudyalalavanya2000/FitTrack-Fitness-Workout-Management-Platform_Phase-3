from sqlalchemy.orm import Session

from app.models import (
    Badge,
    UserBadge,
    Workout,
    Goal,
    Streak
)


DEFAULT_BADGES = [
    {
        "name": "First Workout",
        "description": "Complete your first workout.",
        "icon": "🏃"
    },
    {
        "name": "3-Day Streak",
        "description": "Complete workouts on 3 consecutive days.",
        "icon": "🔥"
    },
    {
        "name": "7-Day Streak",
        "description": "Complete workouts on 7 consecutive days.",
        "icon": "💪"
    },
    {
        "name": "Workout Champion",
        "description": "Complete 10 workouts.",
        "icon": "🏆"
    },
    {
        "name": "Goal Achiever",
        "description": "Complete your first fitness goal.",
        "icon": "🎯"
    }
]


def ensure_default_badges(db: Session):
    """Create default badge definitions if they do not exist."""

    for badge_data in DEFAULT_BADGES:
        existing_badge = db.query(Badge).filter(
            Badge.name == badge_data["name"]
        ).first()

        if existing_badge is None:
            db.add(Badge(**badge_data))

    db.flush()


def award_eligible_badges(
    db: Session,
    user_id: int
):
    """
    Check the user's workout, streak and goal milestones.
    Award each badge only once.
    """

    ensure_default_badges(db)

    workout_count = db.query(Workout).filter(
        Workout.user_id == user_id
    ).count()

    completed_goal_count = db.query(Goal).filter(
        Goal.user_id == user_id,
        Goal.status == "completed"
    ).count()

    streak = db.query(Streak).filter(
        Streak.user_id == user_id
    ).first()

    current_streak = (
        streak.current_streak if streak else 0
    )

    eligible_badge_names = set()

    if workout_count >= 1:
        eligible_badge_names.add("First Workout")

    if current_streak >= 3:
        eligible_badge_names.add("3-Day Streak")

    if current_streak >= 7:
        eligible_badge_names.add("7-Day Streak")

    if workout_count >= 10:
        eligible_badge_names.add("Workout Champion")

    if completed_goal_count >= 1:
        eligible_badge_names.add("Goal Achiever")

    if not eligible_badge_names:
        return []

    eligible_badges = db.query(Badge).filter(
        Badge.name.in_(eligible_badge_names)
    ).all()

    existing_badge_ids = {
        row[0]
        for row in db.query(UserBadge.badge_id).filter(
            UserBadge.user_id == user_id
        ).all()
    }

    newly_awarded = []

    for badge in eligible_badges:
        if badge.id not in existing_badge_ids:
            user_badge = UserBadge(
                user_id=user_id,
                badge_id=badge.id
            )

            db.add(user_badge)
            newly_awarded.append(badge)

    db.flush()

    return newly_awarded