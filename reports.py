from collections import defaultdict
from datetime import date, timedelta
import calendar

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Workout, Progress, Goal, User


router = APIRouter()


# ---------------------------------------------------------
# COMMON DATE AND DATA HELPERS
# ---------------------------------------------------------

def get_date_range(
    start_date: date | None,
    end_date: date | None,
    default_days: int = 30
):
    today = date.today()

    if end_date is None:
        end_date = today

    if start_date is None:
        start_date = end_date - timedelta(days=default_days - 1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be later than end date"
        )

    return start_date, end_date


def get_user_workouts(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date
):
    return db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.workout_date >= start_date,
        Workout.workout_date <= end_date
    ).all()


def get_user_progress(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date
):
    return db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.progress_date >= start_date,
        Progress.progress_date <= end_date
    ).all()


def calculate_period_summary(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date
):
    workouts = get_user_workouts(
        db, user_id, start_date, end_date
    )

    progress_records = get_user_progress(
        db, user_id, start_date, end_date
    )

    weight_records = sorted(
        [
            record for record in progress_records
            if record.weight_kg is not None
        ],
        key=lambda record: record.progress_date
    )

    weights = [
        record.weight_kg for record in weight_records
    ]

    average_weight = (
        round(sum(weights) / len(weights), 2)
        if weights else None
    )

    first_weight = weights[0] if weights else None
    last_weight = weights[-1] if weights else None

    weight_change = (
        round(last_weight - first_weight, 2)
        if first_weight is not None and last_weight is not None
        else None
    )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_workouts": len(workouts),
        "total_workout_duration_minutes": sum(
            workout.duration_minutes or 0
            for workout in workouts
        ),
        "total_calories_burned": sum(
            workout.calories_burned or 0
            for workout in workouts
        ),
        "total_progress_entries": len(progress_records),
        "total_calories_consumed": sum(
            record.calories_consumed or 0
            for record in progress_records
        ),
        "total_water_intake_ml": sum(
            record.water_intake_ml or 0
            for record in progress_records
        ),
        "total_exercise_minutes": sum(
            record.exercise_minutes or 0
            for record in progress_records
        ),
        "average_weight_kg": average_weight,
        "first_recorded_weight_kg": first_weight,
        "latest_recorded_weight_kg": last_weight,
        "weight_change_kg": weight_change
    }


def calculate_change(current_value, previous_value):
    if current_value is None or previous_value is None:
        return {
            "difference": None,
            "percentage_change": None
        }

    difference = round(current_value - previous_value, 2)

    if previous_value == 0:
        percentage = 0.0 if current_value == 0 else None
    else:
        percentage = round(
            (difference / abs(previous_value)) * 100,
            2
        )

    return {
        "difference": difference,
        "percentage_change": percentage
    }


def compare_periods(current, previous):
    comparison_fields = [
        "total_workouts",
        "total_workout_duration_minutes",
        "total_calories_burned",
        "total_progress_entries",
        "total_calories_consumed",
        "total_water_intake_ml",
        "total_exercise_minutes",
        "average_weight_kg"
    ]

    changes = {}

    for field in comparison_fields:
        changes[field] = calculate_change(
            current[field],
            previous[field]
        )

    return changes


# ---------------------------------------------------------
# 1. OVERALL FITNESS SUMMARY
# ---------------------------------------------------------

@router.get("/summary")
def get_fitness_summary(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_date_range(
        start_date,
        end_date
    )

    summary = calculate_period_summary(
        db,
        current_user.id,
        start_date,
        end_date
    )

    return {
        "report_period": summary["period"],
        "fitness_summary": {
            "total_workouts": summary["total_workouts"],
            "total_workout_duration_minutes":
                summary["total_workout_duration_minutes"],
            "total_calories_burned":
                summary["total_calories_burned"]
        },
        "daily_progress_summary": {
            "total_progress_entries":
                summary["total_progress_entries"],
            "total_calories_consumed":
                summary["total_calories_consumed"],
            "total_water_intake_ml":
                summary["total_water_intake_ml"],
            "total_exercise_minutes":
                summary["total_exercise_minutes"],
            "average_weight_kg":
                summary["average_weight_kg"]
        }
    }


# ---------------------------------------------------------
# 2. DAILY WORKOUT AND PROGRESS REPORT
# ---------------------------------------------------------

@router.get("/daily")
def get_daily_report(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_date_range(
        start_date,
        end_date,
        default_days=7
    )

    workouts = get_user_workouts(
        db,
        current_user.id,
        start_date,
        end_date
    )

    progress_records = get_user_progress(
        db,
        current_user.id,
        start_date,
        end_date
    )

    daily_data = defaultdict(
        lambda: {
            "workout_count": 0,
            "workout_duration_minutes": 0,
            "calories_burned": 0,
            "calories_consumed": 0,
            "water_intake_ml": 0,
            "progress_exercise_minutes": 0,
            "weight_kg": None
        }
    )

    for workout in workouts:
        day = workout.workout_date
        daily_data[day]["workout_count"] += 1
        daily_data[day]["workout_duration_minutes"] += (
            workout.duration_minutes or 0
        )
        daily_data[day]["calories_burned"] += (
            workout.calories_burned or 0
        )

    for record in progress_records:
        day = record.progress_date

        daily_data[day]["calories_consumed"] += (
            record.calories_consumed or 0
        )

        daily_data[day]["water_intake_ml"] += (
            record.water_intake_ml or 0
        )

        daily_data[day]["progress_exercise_minutes"] += (
            record.exercise_minutes or 0
        )

        if record.weight_kg is not None:
            daily_data[day]["weight_kg"] = record.weight_kg

    report = []

    for report_date in sorted(daily_data.keys()):
        report.append({
            "date": report_date,
            **daily_data[report_date]
        })

    return {
        "report_period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_days_with_records": len(report),
        "daily_reports": report
    }


# ---------------------------------------------------------
# 3. WEEKLY WORKOUT REPORT
# ---------------------------------------------------------

@router.get("/weekly")
def get_weekly_report(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_date_range(
        start_date,
        end_date,
        default_days=56
    )

    workouts = get_user_workouts(
        db,
        current_user.id,
        start_date,
        end_date
    )

    weekly_data = defaultdict(
        lambda: {
            "week_start": None,
            "week_end": None,
            "total_workouts": 0,
            "total_duration_minutes": 0,
            "total_calories_burned": 0
        }
    )

    for workout in workouts:
        workout_date = workout.workout_date
        iso_calendar = workout_date.isocalendar()

        week_key = (
            f"{iso_calendar.year}-W{iso_calendar.week:02d}"
        )

        week_start = workout_date - timedelta(
            days=workout_date.weekday()
        )

        week_end = week_start + timedelta(days=6)

        weekly_data[week_key]["week_start"] = week_start
        weekly_data[week_key]["week_end"] = week_end

        weekly_data[week_key]["total_workouts"] += 1

        weekly_data[week_key]["total_duration_minutes"] += (
            workout.duration_minutes or 0
        )

        weekly_data[week_key]["total_calories_burned"] += (
            workout.calories_burned or 0
        )

    weekly_reports = []

    for week_key in sorted(weekly_data.keys()):
        weekly_reports.append({
            "week": week_key,
            **weekly_data[week_key]
        })

    return {
        "report_period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_weeks_with_workouts": len(weekly_reports),
        "weekly_reports": weekly_reports
    }


# ---------------------------------------------------------
# 4. DAILY PROGRESS TRACKING REPORT
# ---------------------------------------------------------

@router.get("/progress")
def get_progress_report(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_date_range(
        start_date,
        end_date
    )

    progress_records = get_user_progress(
        db,
        current_user.id,
        start_date,
        end_date
    )

    progress_records.sort(
        key=lambda record: record.progress_date
    )

    reports = []

    for record in progress_records:
        reports.append({
            "id": record.id,
            "date": record.progress_date,
            "weight_kg": record.weight_kg,
            "calories_consumed": record.calories_consumed,
            "water_intake_ml": record.water_intake_ml,
            "exercise_minutes": record.exercise_minutes,
            "notes": record.notes
        })

    latest_weight_record = next(
        (
            record
            for record in reversed(progress_records)
            if record.weight_kg is not None
        ),
        None
    )

    return {
        "report_period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_progress_entries": len(progress_records),
        "latest_recorded_weight_kg": (
            latest_weight_record.weight_kg
            if latest_weight_record
            else None
        ),
        "progress_reports": reports
    }


# ---------------------------------------------------------
# 5. FITNESS GOAL ANALYTICS
# ---------------------------------------------------------

@router.get("/goals")
def get_goal_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id
    ).all()

    total_goals = len(goals)

    active_goals = sum(
        1 for goal in goals
        if goal.status == "active"
    )

    completed_goals = sum(
        1 for goal in goals
        if goal.status == "completed"
    )

    completion_rate = (
        round((completed_goals / total_goals) * 100, 2)
        if total_goals > 0
        else 0
    )

    goal_details = []

    for goal in goals:
        goal_details.append({
            "id": goal.id,
            "title": goal.title,
            "goal_type": goal.goal_type,
            "target_value": goal.target_value,
            "current_value": goal.current_value,
            "unit": goal.unit,
            "status": goal.status
        })

    return {
        "goal_summary": {
            "total_goals": total_goals,
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "completion_rate_percentage": completion_rate
        },
        "goals": goal_details
    }


# ---------------------------------------------------------
# 6. WEEKLY PROGRESS COMPARISON
# ---------------------------------------------------------

@router.get("/comparison/weekly")
def get_weekly_comparison(
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if end_date is None:
        end_date = date.today()

    current_start = end_date - timedelta(days=6)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=6)

    current_summary = calculate_period_summary(
        db,
        current_user.id,
        current_start,
        end_date
    )

    previous_summary = calculate_period_summary(
        db,
        current_user.id,
        previous_start,
        previous_end
    )

    changes = compare_periods(
        current_summary,
        previous_summary
    )

    return {
        "comparison_type": "weekly",
        "current_period": current_summary,
        "previous_period": previous_summary,
        "changes": changes
    }


# ---------------------------------------------------------
# 7. MONTHLY PROGRESS COMPARISON
# ---------------------------------------------------------

@router.get("/comparison/monthly")
def get_monthly_comparison(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_year = year if year is not None else today.year
    selected_month = month if month is not None else today.month

    current_start = date(
        selected_year,
        selected_month,
        1
    )

    current_last_day = calendar.monthrange(
        selected_year,
        selected_month
    )[1]

    current_end = date(
        selected_year,
        selected_month,
        current_last_day
    )

    previous_month = (
        12 if selected_month == 1
        else selected_month - 1
    )

    previous_year = (
        selected_year - 1
        if selected_month == 1
        else selected_year
    )

    previous_start = date(
        previous_year,
        previous_month,
        1
    )

    previous_last_day = calendar.monthrange(
        previous_year,
        previous_month
    )[1]

    previous_end = date(
        previous_year,
        previous_month,
        previous_last_day
    )

    current_summary = calculate_period_summary(
        db,
        current_user.id,
        current_start,
        current_end
    )

    previous_summary = calculate_period_summary(
        db,
        current_user.id,
        previous_start,
        previous_end
    )

    changes = compare_periods(
        current_summary,
        previous_summary
    )

    return {
        "comparison_type": "monthly",
        "current_period": current_summary,
        "previous_period": previous_summary,
        "changes": changes
    }


# ---------------------------------------------------------
# 8. DAILY PROGRESS TRENDS FOR CHARTS
# ---------------------------------------------------------

@router.get("/trends")
def get_progress_trends(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date, end_date = get_date_range(
        start_date,
        end_date,
        default_days=30
    )

    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=400,
            detail="Trend date range cannot exceed 366 days"
        )

    workouts = get_user_workouts(
        db,
        current_user.id,
        start_date,
        end_date
    )

    progress_records = get_user_progress(
        db,
        current_user.id,
        start_date,
        end_date
    )

    daily_data = {}

    current_date = start_date

    while current_date <= end_date:
        daily_data[current_date] = {
            "date": current_date,
            "workout_count": 0,
            "workout_duration_minutes": 0,
            "calories_burned": 0,
            "weight_kg": None,
            "calories_consumed": 0,
            "water_intake_ml": 0,
            "exercise_minutes": 0
        }

        current_date += timedelta(days=1)

    for workout in workouts:
        day = workout.workout_date

        daily_data[day]["workout_count"] += 1

        daily_data[day]["workout_duration_minutes"] += (
            workout.duration_minutes or 0
        )

        daily_data[day]["calories_burned"] += (
            workout.calories_burned or 0
        )

    for record in progress_records:
        day = record.progress_date

        daily_data[day]["weight_kg"] = record.weight_kg

        daily_data[day]["calories_consumed"] = (
            record.calories_consumed or 0
        )

        daily_data[day]["water_intake_ml"] = (
            record.water_intake_ml or 0
        )

        daily_data[day]["exercise_minutes"] = (
            record.exercise_minutes or 0
        )

    trend_data = [
        daily_data[day]
        for day in sorted(daily_data.keys())
    ]

    return {
        "report_period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "total_days": len(trend_data),
        "trend_data": trend_data
    }