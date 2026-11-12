from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import Workout, Streak


def recalculate_user_streak(
    db: Session,
    user_id: int
):
    today = date.today()

    # Get all distinct workout dates up to today.
    workout_rows = db.query(
        Workout.workout_date
    ).filter(
        Workout.user_id == user_id,
        Workout.workout_date <= today
    ).distinct().order_by(
        Workout.workout_date.desc()
    ).all()

    workout_dates = [
        row[0] for row in workout_rows
    ]

    last_workout_date = (
        workout_dates[0] if workout_dates else None
    )

    # Calculate current streak.
    current_streak = 0

    if (
        last_workout_date is not None
        and last_workout_date >= today - timedelta(days=1)
    ):
        current_streak = 1
        previous_date = last_workout_date

        for workout_day in workout_dates[1:]:
            expected_date = previous_date - timedelta(days=1)

            if workout_day == expected_date:
                current_streak += 1
                previous_date = workout_day
            else:
                break

    # Calculate longest historical streak.
    longest_streak = 0
    running_streak = 0
    previous_date = None

    for workout_day in reversed(workout_dates):
        if (
            previous_date is not None
            and workout_day == previous_date + timedelta(days=1)
        ):
            running_streak += 1
        else:
            running_streak = 1

        longest_streak = max(
            longest_streak,
            running_streak
        )

        previous_date = workout_day

    # Find or create the user's streak record.
    streak = db.query(Streak).filter(
        Streak.user_id == user_id
    ).first()

    if streak is None:
        streak = Streak(
            user_id=user_id,
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_workout_date=last_workout_date
        )

        db.add(streak)
    else:
        streak.current_streak = current_streak
        streak.longest_streak = max(
            streak.longest_streak,
            longest_streak
        )
        streak.last_workout_date = last_workout_date

    return streak