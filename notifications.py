from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Notification, User
from app.schemas import NotificationResponse


router = APIRouter()


def get_user_notification(
    notification_id: int,
    current_user: User,
    db: Session
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return notification


@router.get("/", response_model=list[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()


@router.get("/unread", response_model=list[NotificationResponse])
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False)
    ).order_by(Notification.created_at.desc()).all()


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = get_user_notification(
        notification_id,
        current_user,
        db
    )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False)
    ).update(
        {"is_read": True},
        synchronize_session=False
    )

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count
    }


@router.post("/daily-reminder", response_model=NotificationResponse)
def create_daily_reminder(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    existing_reminder = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.notification_type == "daily_reminder",
        func.date(Notification.created_at) == today.isoformat()
    ).first()

    if existing_reminder:
        return existing_reminder

    reminder = Notification(
        user_id=current_user.id,
        title="Daily Fitness Reminder",
        message=(
            "Stay consistent with your fitness journey! "
            "Log your workout, update your daily progress, "
            "and keep working toward your goals."
        ),
        notification_type="daily_reminder"
    )

    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return reminder


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = get_user_notification(
        notification_id,
        current_user,
        db
    )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted successfully"
    }