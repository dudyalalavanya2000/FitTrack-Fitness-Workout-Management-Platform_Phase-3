
from collections import defaultdict
from datetime import date, timedelta
import calendar

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    User,
    Workout,
    Progress,
    Goal,
    WorkoutSession,
    ExternalActivity,
)


router = APIRouter()


# --------------------------------------------------
# COMMON DATE HELPERS
# --------------------------------------------------

def get_period_dates(
    period: str,
    start_date: date | None = None,
    end_date: date | None = None
):
    today = date.today()

    if end_date is None:
        end_date = today

    if start_date is not None:
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date cannot be later than end date."
            )

        if (end_date - start_date).days > 365:
            raise HTTPException(
                status_code=400,
                detail="Date range cannot exceed 366 days."
            )

        return start_date, end_date

    if period == "week":
        start_date = end_date - timedelta(days=6)

    elif period == "month":
        start_date = end_date - timedelta(days=29)

    elif period == "year":
        start_date = end_date - timedelta(days=364)

    else:
        raise HTTPException(
            status_code=400,
            detail="Period must be week, month, or year."
        )

    return start_date, end_date


def get_workouts(db, user_id, start_date, end_date):
    return db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.workout_date >= start_date,
        Workout.workout_date <= end_date
    ).all()


def get_progress_records(db, user_id, start_date, end_date):
    return db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.progress_date >= start_date,
        Progress.progress_date <= end_date
    ).order_by(
        Progress.progress_date.asc()
    ).all()


# --------------------------------------------------
# 1. ADVANCED ANALYTICS OVERVIEW
# --------------------------------------------------

@router.get("/overview")
def get_advanced_analytics_overview(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_period_dates(
        period,
        start_date,
        end_date
    )

    workouts = get_workouts(
        db, current_user.id, start_date, end_date
    )

    progress_records = get_progress_records(
        db, current_user.id, start_date, end_date
    )

    completed_sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.status == "completed",
        WorkoutSession.ended_at.isnot(None)
    ).all()

    completed_sessions = [
        session for session in completed_sessions
        if start_date <= session.ended_at.date() <= end_date
    ]

    total_workouts = len(workouts)
    total_duration = sum(
        workout.duration_minutes or 0
        for workout in workouts
    )

    total_calories = sum(
        workout.calories_burned or 0
        for workout in workouts
    )

    session_duration = sum(
        session.duration_seconds or 0
        for session in completed_sessions
    )

    session_calories = sum(
        session.calories_burned or 0
        for session in completed_sessions
    )

    total_weight_entries = [
        record for record in progress_records
        if record.weight_kg is not None
    ]

    latest_weight = (
        total_weight_entries[-1].weight_kg
        if total_weight_entries else None
    )

    first_weight = (
        total_weight_entries[0].weight_kg
        if total_weight_entries else None
    )

    return {
        "period": {
            "type": period,
            "start_date": start_date,
            "end_date": end_date
        },
        "workout_analytics": {
            "total_workouts": total_workouts,
            "total_duration_minutes": total_duration,
            "average_duration_minutes": (
                round(total_duration / total_workouts, 2)
                if total_workouts else 0
            ),
            "total_calories_burned": total_calories,
            "completed_timer_sessions": len(completed_sessions),
            "timer_duration_minutes": round(
                session_duration / 60, 2
            ),
            "timer_calories_burned": round(
                session_calories, 2
            )
        },
        "progress_analytics": {
            "progress_entries": len(progress_records),
            "latest_weight_kg": latest_weight,
            "first_weight_kg": first_weight,
            "weight_change_kg": (
                round(latest_weight - first_weight, 2)
                if latest_weight is not None
                and first_weight is not None
                else None
            ),
            "total_exercise_minutes": sum(
                record.exercise_minutes or 0
                for record in progress_records
            )
        }
    }


# --------------------------------------------------
# 2. WORKOUT TRENDS
# --------------------------------------------------

@router.get("/workout-trends")
def get_workout_trends(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_period_dates(
        period,
        start_date,
        end_date
    )

    workouts = get_workouts(
        db, current_user.id, start_date, end_date
    )

    daily_data = defaultdict(
        lambda: {
            "workout_count": 0,
            "duration_minutes": 0,
            "calories_burned": 0
        }
    )

    for workout in workouts:
        day = workout.workout_date

        daily_data[day]["workout_count"] += 1
        daily_data[day]["duration_minutes"] += (
            workout.duration_minutes or 0
        )
        daily_data[day]["calories_burned"] += (
            workout.calories_burned or 0
        )

    trends = []

    current_day = start_date

    while current_day <= end_date:
        values = daily_data[current_day]

        trends.append({
            "date": current_day,
            **values
        })

        current_day += timedelta(days=1)

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_days": len(trends),
        "workout_trends": trends
    }


# --------------------------------------------------
# 3. CALORIES BURNED ANALYTICS
# --------------------------------------------------

@router.get("/calories")
def get_calorie_analytics(
    period: str = Query(default="month"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_period_dates(
        period,
        start_date,
        end_date
    )

    workouts = get_workouts(
        db, current_user.id, start_date, end_date
    )

    daily_calories = defaultdict(int)

    for workout in workouts:
        daily_calories[workout.workout_date] += (
            workout.calories_burned or 0
        )

    calories_data = []

    current_day = start_date

    while current_day <= end_date:
        calories_data.append({
            "date": current_day,
            "calories_burned": daily_calories[current_day]
        })

        current_day += timedelta(days=1)

    total_calories = sum(daily_calories.values())

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_calories_burned": total_calories,
        "average_daily_calories": round(
            total_calories / len(calories_data), 2
        ) if calories_data else 0,
        "daily_calories": calories_data
    }


# --------------------------------------------------
# 4. WORKOUT TYPE DISTRIBUTION
# --------------------------------------------------

@router.get("/activity-distribution")
def get_activity_distribution(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_period_dates(
        "month",
        start_date,
        end_date
    )

    workouts = get_workouts(
        db, current_user.id, start_date, end_date
    )

    activity_data = defaultdict(
        lambda: {
            "workout_count": 0,
            "total_duration_minutes": 0,
            "total_calories_burned": 0
        }
    )

    for workout in workouts:
        activity_type = workout.workout_type

        activity_data[activity_type]["workout_count"] += 1

        activity_data[activity_type]["total_duration_minutes"] += (
            workout.duration_minutes or 0
        )

        activity_data[activity_type]["total_calories_burned"] += (
            workout.calories_burned or 0
        )

    distribution = []

    for activity_type, values in sorted(activity_data.items()):
        distribution.append({
            "activity_type": activity_type,
            **values
        })

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_workouts": len(workouts),
        "activity_distribution": distribution
    }


# --------------------------------------------------
# 5. WEIGHT PROGRESS ANALYTICS
# --------------------------------------------------

@router.get("/weight-progress")
def get_weight_progress(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_period_dates(
        "year",
        start_date,
        end_date
    )

    progress_records = get_progress_records(
        db, current_user.id, start_date, end_date
    )

    weight_data = [
        {
            "date": record.progress_date,
            "weight_kg": record.weight_kg
        }
        for record in progress_records
        if record.weight_kg is not None
    ]

    first_weight = (
        weight_data[0]["weight_kg"]
        if weight_data else None
    )

    latest_weight = (
        weight_data[-1]["weight_kg"]
        if weight_data else None
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_weight_records": len(weight_data),
        "first_weight_kg": first_weight,
        "latest_weight_kg": latest_weight,
        "weight_change_kg": (
            round(latest_weight - first_weight, 2)
            if first_weight is not None
            and latest_weight is not None
            else None
        ),
        "weight_history": weight_data
    }


# --------------------------------------------------
# 6. FITNESS GOAL PERFORMANCE
# --------------------------------------------------

@router.get("/goal-performance")
def get_goal_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id
    ).order_by(
        Goal.created_at.desc()
    ).all()

    goal_data = []

    for goal in goals:
        percentage = (
            goal.current_value / goal.target_value * 100
            if goal.target_value > 0 else 0
        )

        percentage = min(round(percentage, 2), 100.0)

        goal_data.append({
            "id": goal.id,
            "title": goal.title,
            "goal_type": goal.goal_type,
            "target_value": goal.target_value,
            "current_value": goal.current_value,
            "unit": goal.unit,
            "status": goal.status,
            "completion_percentage": percentage
        })

    total_goals = len(goals)

    completed_goals = sum(
        1 for goal in goals
        if goal.status == "completed"
    )

    active_goals = sum(
        1 for goal in goals
        if goal.status == "active"
    )

    return {
        "goal_summary": {
            "total_goals": total_goals,
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "completion_rate_percentage": (
                round(completed_goals / total_goals * 100, 2)
                if total_goals else 0
            )
        },
        "goal_performance": goal_data
    }


# --------------------------------------------------
# 7. PERSONAL FITNESS INSIGHTS
# --------------------------------------------------

@router.get("/insights")
def get_fitness_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    current_start = today - timedelta(days=6)
    previous_start = today - timedelta(days=13)
    previous_end = today - timedelta(days=7)

    current_workouts = get_workouts(
        db, current_user.id, current_start, today
    )

    previous_workouts = get_workouts(
        db, current_user.id, previous_start, previous_end
    )

    current_count = len(current_workouts)
    previous_count = len(previous_workouts)

    current_calories = sum(
        workout.calories_burned or 0
        for workout in current_workouts
    )

    previous_calories = sum(
        workout.calories_burned or 0
        for workout in previous_workouts
    )

    current_duration = sum(
        workout.duration_minutes or 0
        for workout in current_workouts
    )

    previous_duration = sum(
        workout.duration_minutes or 0
        for workout in previous_workouts
    )

    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id
    ).all()

    completed_goals = sum(
        1 for goal in goals
        if goal.status == "completed"
    )

    insights = []

    if current_count > previous_count:
        insights.append(
            "You completed more workouts this week than last week."
        )
    elif current_count < previous_count:
        insights.append(
            "Your workout count decreased compared with last week."
        )
    elif current_count > 0:
        insights.append(
            "You maintained the same workout frequency as last week."
        )
    else:
        insights.append(
            "Start logging workouts to build your weekly activity trend."
        )

    if current_calories > previous_calories:
        insights.append(
            "Your recorded calories burned increased this week."
        )
    elif current_calories < previous_calories:
        insights.append(
            "Your recorded calories burned decreased this week."
        )

    if current_duration > previous_duration:
        insights.append(
            "Your total workout duration increased this week."
        )

    if completed_goals > 0:
        insights.append(
            f"You have completed {completed_goals} fitness goal(s)."
        )

    if not goals:
        insights.append(
            "Create a fitness goal to track your personal progress."
        )

    return {
        "comparison_period": {
            "current_week_start": current_start,
            "current_week_end": today,
            "previous_week_start": previous_start,
            "previous_week_end": previous_end
        },
        "current_week": {
            "workouts": current_count,
            "duration_minutes": current_duration,
            "calories_burned": current_calories
        },
        "previous_week": {
            "workouts": previous_count,
            "duration_minutes": previous_duration,
            "calories_burned": previous_calories
        },
        "completed_goals": completed_goals,
        "insights": insights
    }
