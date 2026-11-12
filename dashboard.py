
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    User,
    Workout,
    Progress,
    WorkoutPlan,
    Goal,
    Streak,
    Badge,
    UserBadge
)
from app.schemas import DashboardResponse
from app.streak_utils import recalculate_user_streak


router = APIRouter()


@router.get(
    "/",
    response_model=DashboardResponse
)
def get_personalized_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    # 1. Today's workouts
    todays_workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id,
        Workout.workout_date == today
    ).order_by(
        Workout.created_at.desc()
    ).all()

    total_duration = sum(
        workout.duration_minutes
        for workout in todays_workouts
    )

    total_calories = sum(
        workout.calories_burned or 0
        for workout in todays_workouts
    )

    # 2. Today's progress record
    todays_progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.progress_date == today
    ).first()

    progress_summary = None

    if todays_progress:
        progress_summary = {
            "progress_date": todays_progress.progress_date,
            "weight_kg": todays_progress.weight_kg,
            "calories_consumed": todays_progress.calories_consumed,
            "water_intake_ml": todays_progress.water_intake_ml,
            "exercise_minutes": todays_progress.exercise_minutes
        }

    daily_summary = {
        "summary_date": today,
        "workouts_completed": len(todays_workouts),
        "total_duration_minutes": total_duration,
        "calories_burned": total_calories,
        "progress": progress_summary
    }

    # 3. Upcoming workout plans (next five)
    upcoming_workouts = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id,
        WorkoutPlan.scheduled_date >= today
    ).order_by(
        WorkoutPlan.scheduled_date.asc()
    ).limit(5).all()

    # 4. Goal progress
    user_goals = db.query(Goal).filter(
        Goal.user_id == current_user.id
    ).order_by(
        Goal.created_at.desc()
    ).all()

    goals_summary = []

    for goal in user_goals:
        percentage = (
            goal.current_value / goal.target_value
        ) * 100 if goal.target_value > 0 else 0

        percentage = min(round(percentage, 2), 100.0)

        goals_summary.append({
            "id": goal.id,
            "title": goal.title,
            "goal_type": goal.goal_type,
            "target_value": goal.target_value,
            "current_value": goal.current_value,
            "unit": goal.unit,
            "status": goal.status,
            "target_date": goal.target_date,
            "progress_percentage": percentage
        })

    # 5. Recalculate the logged-in user's workout streak
    user_streak = recalculate_user_streak(
        db,
        current_user.id
    )

    db.commit()
    db.refresh(user_streak)

    streak_summary = {
        "current_streak": user_streak.current_streak,
        "longest_streak": user_streak.longest_streak,
        "last_workout_date": user_streak.last_workout_date
    }

    # 6. Get the logged-in user's earned badges
    earned_badges = db.query(
        UserBadge,
        Badge
    ).join(
        Badge,
        UserBadge.badge_id == Badge.id
    ).filter(
        UserBadge.user_id == current_user.id
    ).order_by(
        UserBadge.earned_at.desc()
    ).all()

    badges_summary = []

    for user_badge, badge in earned_badges:
        badges_summary.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "earned_at": user_badge.earned_at
        })

    # 7. Return the complete personalized dashboard
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "daily_summary": daily_summary,
        "upcoming_workouts": upcoming_workouts,
        "goals": goals_summary,
        "streak": streak_summary,
        "earned_badges": badges_summary
    }
