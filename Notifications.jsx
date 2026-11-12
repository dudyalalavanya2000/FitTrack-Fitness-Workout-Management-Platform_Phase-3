import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  CalendarCheck,
  Dumbbell,
  Info,
  CircleCheck,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const response = await api.get("/notifications/");
      setNotifications(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        fetchNotifications();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );

      toast.success("Notification marked as read");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to update notification"
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) {
      toast.info("You have no unread notifications");
      return;
    }

    try {
      setActionLoading(true);

      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to update notifications"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const createDailyReminder = async () => {
    try {
      setActionLoading(true);

      const response = await api.post("/notifications/daily-reminder");

      await fetchNotifications();

      if (response.data.is_read) {
        toast.info("Today's reminder already exists and is read");
      } else {
        toast.success("Daily fitness reminder is ready!");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to create daily reminder"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const deleteNotification = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/notifications/${id}`);

      setNotifications((previous) =>
        previous.filter((notification) => notification.id !== id)
      );

      toast.success("Notification deleted successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to delete notification"
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "daily_reminder":
        return <CalendarCheck size={21} />;

      case "workout":
        return <Dumbbell size={21} />;

      default:
        return <Info size={21} />;
    }
  };

  return (
    <div className="page-content notifications-page">
      <div className="page-heading">
        <div>
          <p className="section-label">FITTRACK</p>
          <h1>Notifications</h1>
          <p className="page-description">
            Stay updated with your fitness activities and reminders.
          </p>
        </div>

        <div className="notification-heading-icon">
          <Bell size={27} />
        </div>
      </div>

      <div className="notification-summary-grid">
        <div className="notification-summary-card">
          <div className="notification-summary-icon total-icon">
            <Bell size={22} />
          </div>
          <div>
            <p>Total Notifications</p>
            <h2>{notifications.length}</h2>
          </div>
        </div>

        <div className="notification-summary-card">
          <div className="notification-summary-icon unread-icon">
            <Clock size={22} />
          </div>
          <div>
            <p>Unread Notifications</p>
            <h2>{unreadCount}</h2>
          </div>
        </div>

        <div className="notification-summary-card">
          <div className="notification-summary-icon read-icon">
            <CircleCheck size={22} />
          </div>
          <div>
            <p>Read Notifications</p>
            <h2>{notifications.length - unreadCount}</h2>
          </div>
        </div>
      </div>

      <div className="notification-toolbar">
        <div>
          <h2>Recent Notifications</h2>
          <p>Manage your fitness updates and reminders.</p>
        </div>

        <div className="notification-actions">
          <button
            className="notification-action-btn reminder-btn"
            onClick={createDailyReminder}
            disabled={actionLoading}
          >
            <CalendarCheck size={17} />
            Daily Reminder
          </button>

          <button
            className="notification-action-btn refresh-btn"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="notification-action-btn read-all-btn"
            onClick={markAllAsRead}
            disabled={actionLoading || unreadCount === 0}
          >
            <CheckCheck size={17} />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="notification-empty">
            <RefreshCw className="loading-icon" size={30} />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={42} />
            <h3>No notifications yet</h3>
            <p>
              Your workout updates and fitness reminders will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              className={`notification-item ${
                notification.is_read ? "notification-read" : "notification-unread"
              }`}
              key={notification.id}
            >
              <div className="notification-item-icon">
                {getNotificationIcon(notification.notification_type)}
              </div>

              <div className="notification-item-content">
                <div className="notification-title-row">
                  <h3>{notification.title}</h3>

                  {!notification.is_read && (
                    <span className="unread-badge">New</span>
                  )}
                </div>

                <p>{notification.message}</p>

                <span className="notification-date">
                  <Clock size={14} />
                  {formatDate(notification.created_at)}
                </span>

                <span className="notification-type">
                  {String(
                    notification.notification_type || "general"
                  ).replaceAll("_", " ")}
                </span>
              </div>

              <div className="notification-item-actions">
                {!notification.is_read && (
                  <button
                    className="notification-icon-btn mark-read-btn"
                    onClick={() => markAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <CheckCheck size={19} />
                  </button>
                )}

                <button
                  className="notification-icon-btn delete-notification-btn"
                  onClick={() => deleteNotification(notification.id)}
                  title="Delete notification"
                >
                  <Trash2 size={19} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;