
from datetime import date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Float,
    Text,
    ForeignKey,
    UniqueConstraint,
    Boolean,
    Time
)
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    workout_type = Column(String(50), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    calories_burned = Column(Integer, nullable=True, default=0)
    notes = Column(Text, nullable=True)
    workout_date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Progress(Base):
    __tablename__ = "progress"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "progress_date",
            name="unique_user_progress_date"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    progress_date = Column(Date, nullable=False, default=date.today)
    weight_kg = Column(Float, nullable=True)
    calories_consumed = Column(Integer, nullable=False, default=0)
    water_intake_ml = Column(Integer, nullable=False, default=0)
    exercise_minutes = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(String(50), nullable=False)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False, default=0)
    unit = Column(String(30), nullable=False)
    start_date = Column(Date, nullable=False, default=date.today)
    target_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, default="general")
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(30), nullable=False, index=True)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    __table_args__ = (
        UniqueConstraint(
            "workout_id",
            "exercise_id",
            name="unique_workout_exercise"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(
        Integer,
        ForeignKey("workouts.id"),
        nullable=False,
        index=True
    )
    exercise_id = Column(
        Integer,
        ForeignKey("exercises.id"),
        nullable=False,
        index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Streak(Base):
    __tablename__ = "streaks"

    __table_args__ = (
        UniqueConstraint("user_id", name="unique_user_streak"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_workout_date = Column(Date, nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    icon = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserBadge(Base):
    __tablename__ = "user_badges"

    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="unique_user_badge"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False, index=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meal_type = Column(String(20), nullable=False)
    food_name = Column(String(150), nullable=False)
    calories = Column(Integer, nullable=False, default=0)
    protein = Column(Float, nullable=False, default=0)
    carbs = Column(Float, nullable=False, default=0)
    fats = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Phase 3 - Module 14: Water Intake Tracker

class WaterIntake(Base):
    __tablename__ = "water_intakes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quantity_ml = Column(Integer, nullable=False)
    intake_date = Column(Date, nullable=False, default=date.today, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WaterGoal(Base):
    __tablename__ = "water_goals"

    __table_args__ = (
        UniqueConstraint("user_id", name="unique_user_water_goal"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_ml = Column(Integer, nullable=False, default=2500)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


# Phase 3 - Module 16: Workout Timer & Live Tracking

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(100), nullable=False)
    activity_type = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False, default="running", index=True)

    body_weight_kg = Column(Float, nullable=False)

    started_at = Column(DateTime(timezone=True), nullable=False)
    paused_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    accumulated_seconds = Column(Integer, nullable=False, default=0)
    duration_seconds = Column(Integer, nullable=True)
    calories_burned = Column(Float, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Phase 3 - Module 17: Third-Party Fitness Integration

class HealthIntegration(Base):
    __tablename__ = "health_integrations"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            name="unique_user_health_provider"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    provider = Column(String(30), nullable=False)

    is_connected = Column(Boolean, nullable=False, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


class ExternalActivity(Base):
    __tablename__ = "external_activities"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            "external_id",
            name="unique_external_activity"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    provider = Column(String(30), nullable=False)
    external_id = Column(String(150), nullable=False)

    activity_type = Column(String(50), nullable=False)
    activity_name = Column(String(150), nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    duration_minutes = Column(Float, nullable=False, default=0)
    steps = Column(Integer, nullable=False, default=0)
    calories_burned = Column(Float, nullable=False, default=0)
    distance_meters = Column(Float, nullable=False, default=0)

    source_name = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Phase 3 - Module 19: In-App Reminders & Alerts

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Supported types: workout, meal, water
    reminder_type = Column(String(20), nullable=False, index=True)

    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)

    # Time at which the reminder should be triggered
    scheduled_time = Column(Time, nullable=False)

    # Required for one-time reminders
    reminder_date = Column(Date, nullable=True)

    # Supported recurrence: once, daily, weekly
    recurrence = Column(String(20), nullable=False, default="daily")

    # Monday = 0, Sunday = 6; used for weekly reminders
    weekday = Column(Integer, nullable=True)

    # Defaults to Indian Standard Time
    timezone = Column(String(50), nullable=False, default="Asia/Kolkata")

    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Prevents the same reminder from firing more than once per day
    last_triggered_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
