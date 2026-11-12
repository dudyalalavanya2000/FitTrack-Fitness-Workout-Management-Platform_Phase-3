
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler
)

from app.routes import (
    auth,
    workouts,
    progress,
    goals,
    reports,
    notifications,
    workout_plans,
    exercises,
    streaks,
    badges,
    dashboard,
    meals,
    water,
    ai_workouts,
    workout_timer,
    health_integrations,
    advanced_analytics,
    reminders,
)


# Create missing database tables without deleting existing data
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_reminder_scheduler()
    yield
    stop_reminder_scheduler()


app = FastAPI(
    title="FitTrack - Fitness & Workout Management Platform",
    description="Fitness tracking and workout management API",
    version="2.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Module 1 - Authentication
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

# Module 2 - Workout Management
app.include_router(
    workouts.router,
    prefix="/api/v1/workouts",
    tags=["Workouts"]
)

# Module 3 - Daily Progress Tracking
app.include_router(
    progress.router,
    prefix="/api/v1/progress",
    tags=["Daily Progress"]
)

# Module 4 - Fitness Goals Management
app.include_router(
    goals.router,
    prefix="/api/v1/goals",
    tags=["Fitness Goals"]
)

# Reports & Analytics
app.include_router(
    reports.router,
    prefix="/api/v1/reports",
    tags=["Reports & Analytics"]
)

# Notifications
app.include_router(
    notifications.router,
    prefix="/api/v1/notifications",
    tags=["Notifications"]
)

# Workout Plans
app.include_router(
    workout_plans.router,
    prefix="/api/v1/workout-plans",
    tags=["Workout Plans & Scheduling"]
)

# Exercise Library
app.include_router(
    exercises.router,
    prefix="/api/v1/exercises",
    tags=["Exercise Library"]
)

# Streak Tracking
app.include_router(
    streaks.router,
    prefix="/api/v1/streaks",
    tags=["Streak Tracking"]
)

# Achievement Badges
app.include_router(
    badges.router,
    prefix="/api/v1/badges",
    tags=["Achievement Badges"]
)

# Personalized Dashboard
app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["Personalized Dashboard"]
)

# Module 13 - Nutrition & Meal Tracking
app.include_router(
    meals.router,
    prefix="/api/v1/meals",
    tags=["Nutrition & Meal Tracking"]
)

# Module 14 - Water Intake Tracker
app.include_router(
    water.router,
    prefix="/api/v1/water",
    tags=["Water Intake Tracker"]
)

# Module 15 - AI Workout Suggestions
app.include_router(
    ai_workouts.router,
    prefix="/api/v1/ai-workouts",
    tags=["AI Workout Suggestions"]
)

# Module 16 - Workout Timer & Live Tracking
app.include_router(
    workout_timer.router,
    prefix="/api/v1/workout-timer",
    tags=["Workout Timer & Live Tracking"]
)

# Module 17 - Third-Party Fitness Integration
app.include_router(
    health_integrations.router,
    prefix="/api/v1/health",
    tags=["Health Integrations"]
)

# Module 18 - Advanced Analytics Dashboard
app.include_router(
    advanced_analytics.router,
    prefix="/api/v1/analytics",
    tags=["Advanced Analytics Dashboard"]
)

# Module 19 - In-App Reminders & Alerts
app.include_router(
    reminders.router,
    prefix="/api/v1/reminders",
    tags=["In-App Reminders & Alerts"]
)


@app.get("/")
def root():
    return {
        "message": "Welcome to FitTrack API",
        "status": "Running",
        "version": "2.0.0"
    }
