
from datetime import date, time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Reminder, User


router = APIRouter()


ReminderType = Literal["workout", "meal", "water"]
RecurrenceType = Literal["once", "daily", "weekly"]


class ReminderCreate(BaseModel):
    reminder_type: ReminderType
    title: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=2)
    scheduled_time: time
    reminder_date: date | None = None
    recurrence: RecurrenceType = "daily"
    weekday: int | None = Field(default=None, ge=0, le=6)
    timezone: str = "Asia/Kolkata"
    is_active: bool = True

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.recurrence == "once" and self.reminder_date is None:
            raise ValueError(
                "reminder_date is required for one-time reminders"
            )

        if self.recurrence != "once" and self.reminder_date is not None:
            raise ValueError(
                "reminder_date is only allowed for one-time reminders"
            )

        if self.recurrence == "weekly" and self.weekday is None:
            raise ValueError(
                "weekday is required for weekly reminders "
                "(Monday=0, Sunday=6)"
            )

        if self.recurrence != "weekly" and self.weekday is not None:
            raise ValueError(
                "weekday is only allowed for weekly reminders"
            )

        if self.reminder_date is not None and self.reminder_date < date.today():
            raise ValueError("reminder_date cannot be in the past")

        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Invalid timezone")

        return self


class ReminderUpdate(BaseModel):
    reminder_type: ReminderType | None = None
    title: str | None = Field(default=None, min_length=2, max_length=150)
    message: str | None = Field(default=None, min_length=2)
    scheduled_time: time | None = None
    reminder_date: date | None = None
    recurrence: RecurrenceType | None = None
    weekday: int | None = Field(default=None, ge=0, le=6)
    timezone: str | None = None
    is_active: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    reminder_type: str
    title: str
    message: str
    scheduled_time: time
    reminder_date: date | None
    recurrence: str
    weekday: int | None
    timezone: str
    is_active: bool
    last_triggered_date: date | None

    model_config = ConfigDict(from_attributes=True)


def get_user_reminder(
    reminder_id: int,
    current_user: User,
    db: Session
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id
    ).first()

    if reminder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )

    return reminder


@router.post(
    "/",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED
)
def create_reminder(
    reminder_data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reminder = Reminder(
        user_id=current_user.id,
        **reminder_data.model_dump()
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return reminder


@router.get("/", response_model=list[ReminderResponse])
def get_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Reminder).filter(
        Reminder.user_id == current_user.id
    ).order_by(Reminder.created_at.desc()).all()


@router.get("/active", response_model=list[ReminderResponse])
def get_active_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_active.is_(True)
    ).order_by(Reminder.scheduled_time.asc()).all()


@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_reminder(reminder_id, current_user, db)


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reminder = get_user_reminder(reminder_id, current_user, db)

    update_data = reminder_data.model_dump(exclude_unset=True)

    # Validate the complete updated schedule before saving.
    current_data = {
        "reminder_type": reminder.reminder_type,
        "title": reminder.title,
        "message": reminder.message,
        "scheduled_time": reminder.scheduled_time,
        "reminder_date": reminder.reminder_date,
        "recurrence": reminder.recurrence,
        "weekday": reminder.weekday,
        "timezone": reminder.timezone,
        "is_active": reminder.is_active
    }

    current_data.update(update_data)

    try:
        validated_data = ReminderCreate.model_validate(current_data)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error)
        )

    for field, value in validated_data.model_dump().items():
        setattr(reminder, field, value)

    # Allow a changed schedule to trigger again.
    if any(
        field in update_data
        for field in ("scheduled_time", "reminder_date", "recurrence", "weekday")
    ):
        reminder.last_triggered_date = None

    db.commit()
    db.refresh(reminder)

    return reminder


@router.patch("/{reminder_id}/activate", response_model=ReminderResponse)
def activate_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reminder = get_user_reminder(reminder_id, current_user, db)

    reminder.is_active = True
    reminder.last_triggered_date = None

    db.commit()
    db.refresh(reminder)

    return reminder


@router.patch("/{reminder_id}/deactivate", response_model=ReminderResponse)
def deactivate_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reminder = get_user_reminder(reminder_id, current_user, db)

    reminder.is_active = False

    db.commit()
    db.refresh(reminder)

    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reminder = get_user_reminder(reminder_id, current_user, db)

    db.delete(reminder)
    db.commit()

    return {
        "message": "Reminder deleted successfully"
    }
