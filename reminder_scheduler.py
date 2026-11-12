
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Reminder, Notification


scheduler = BackgroundScheduler()


def process_due_reminders():
    """
    Check active reminders and create in-app notifications
    when their scheduled time is reached.
    """

    db: Session = SessionLocal()

    try:
        reminders = db.query(Reminder).filter(
            Reminder.is_active.is_(True)
        ).all()

        now_utc = datetime.now(ZoneInfo("UTC"))

        for reminder in reminders:
            try:
                user_timezone = ZoneInfo(reminder.timezone or "Asia/Kolkata")
                local_now = now_utc.astimezone(user_timezone)
                today = local_now.date()

                # Prevent duplicate notifications on the same day.
                if reminder.last_triggered_date == today:
                    continue

                # Check whether this reminder is due.
                if reminder.scheduled_time > local_now.time().replace(tzinfo=None):
                    continue

                if reminder.recurrence == "once":
                    if reminder.reminder_date != today:
                        continue

                elif reminder.recurrence == "weekly":
                    if reminder.weekday != today.weekday():
                        continue

                elif reminder.recurrence == "daily":
                    pass

                else:
                    continue

                notification = Notification(
                    user_id=reminder.user_id,
                    title=reminder.title,
                    message=reminder.message,
                    notification_type="reminder",
                    is_read=False
                )

                db.add(notification)

                reminder.last_triggered_date = today

                if reminder.recurrence == "once":
                    reminder.is_active = False

            except Exception as reminder_error:
                print(
                    f"Reminder {reminder.id} processing error: "
                    f"{reminder_error}"
                )

        db.commit()

    except Exception as error:
        db.rollback()
        print(f"Reminder scheduler error: {error}")

    finally:
        db.close()


def start_reminder_scheduler():
    """Start the background reminder scheduler."""

    if not scheduler.running:
        scheduler.add_job(
            process_due_reminders,
            trigger="interval",
            seconds=30,
            id="fittrack_reminder_job",
            replace_existing=True,
            max_instances=1
        )

        scheduler.start()

        print("FitTrack reminder scheduler started.")


def stop_reminder_scheduler():
    """Stop the background scheduler safely."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("FitTrack reminder scheduler stopped.")
