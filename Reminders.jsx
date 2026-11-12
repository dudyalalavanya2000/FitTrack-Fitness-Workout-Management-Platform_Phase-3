
import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  Plus,
  Pencil,
  Trash2,
  X,
  Clock,
  CalendarDays,
  Dumbbell,
  Utensils,
  Droplets,
  Power,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./Reminders.css";

const weekdays = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyForm = {
  reminder_type: "workout",
  title: "",
  message: "",
  scheduled_time: "07:00",
  reminder_date: getLocalDate(),
  recurrence: "daily",
  weekday: "0",
  timezone: "Asia/Kolkata",
  is_active: true,
};

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || "Invalid input").join(", ");
  }

  return detail || error?.message || fallback;
}

function formatTime(value) {
  if (!value) return "--";

  const [hours, minutes] = String(value).split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
}

function getReminderIcon(type) {
  if (type === "meal") return Utensils;
  if (type === "water") return Droplets;
  return Dumbbell;
}

function getScheduleLabel(reminder) {
  if (reminder.recurrence === "once") {
    return `Once · ${formatDate(reminder.reminder_date)}`;
  }

  if (reminder.recurrence === "weekly") {
    const day = weekdays.find(
      (item) => item.value === reminder.weekday
    );

    return `Every ${day?.label || "week"}`;
  }

  return "Every day";
}

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [filter, setFilter] = useState("all");

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);

      const [allResponse, activeResponse] = await Promise.all([
        api.get("/reminders/"),
        api.get("/reminders/active"),
      ]);

      setReminders(
        Array.isArray(allResponse.data) ? allResponse.data : []
      );

      setActiveReminders(
        Array.isArray(activeResponse.data) ? activeResponse.data : []
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load reminders.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadReminders);
  }, [loadReminders]);

  const resetForm = () => {
    setForm({
      ...emptyForm,
      reminder_date: getLocalDate(),
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      reminder_date: getLocalDate(),
    });
    setShowForm(true);
  };

  const openEditForm = (reminder) => {
    setEditingId(reminder.id);

    setForm({
      reminder_type: reminder.reminder_type,
      title: reminder.title,
      message: reminder.message,
      scheduled_time: String(reminder.scheduled_time).slice(0, 5),
      reminder_date: reminder.reminder_date || getLocalDate(),
      recurrence: reminder.recurrence,
      weekday:
        reminder.weekday !== null && reminder.weekday !== undefined
          ? String(reminder.weekday)
          : "0",
      timezone: reminder.timezone || "Asia/Kolkata",
      is_active: reminder.is_active,
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const payload = {
      reminder_type: form.reminder_type,
      title: form.title.trim(),
      message: form.message.trim(),
      scheduled_time: form.scheduled_time,
      recurrence: form.recurrence,
      timezone: form.timezone.trim(),
      is_active: form.is_active,
      reminder_date:
        form.recurrence === "once" ? form.reminder_date : null,
      weekday:
        form.recurrence === "weekly"
          ? Number(form.weekday)
          : null,
    };

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.title.trim().length < 2) {
      toast.error("Please enter a reminder title.");
      return;
    }

    if (form.message.trim().length < 2) {
      toast.error("Please enter a reminder message.");
      return;
    }

    if (!form.scheduled_time) {
      toast.error("Please select a reminder time.");
      return;
    }

    if (form.recurrence === "once" && !form.reminder_date) {
      toast.error("Please select a date for the one-time reminder.");
      return;
    }

    if (
      form.recurrence === "once" &&
      form.reminder_date < getLocalDate()
    ) {
      toast.error("Reminder date cannot be in the past.");
      return;
    }

    if (
      form.recurrence === "weekly" &&
      (form.weekday === "" || form.weekday === null)
    ) {
      toast.error("Please select a weekday.");
      return;
    }

    if (!form.timezone.trim()) {
      toast.error("Please enter a valid timezone.");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingId !== null) {
        await api.put(`/reminders/${editingId}`, payload);
        toast.success("Reminder updated successfully!");
      } else {
        await api.post("/reminders/", payload);
        toast.success("Reminder created successfully!");
      }

      resetForm();
      await loadReminders();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to save reminder.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (reminder) => {
    try {
      setActionId(reminder.id);

      const action = reminder.is_active ? "deactivate" : "activate";

      await api.patch(`/reminders/${reminder.id}/${action}`);

      toast.success(
        reminder.is_active
          ? "Reminder deactivated."
          : "Reminder activated."
      );

      await loadReminders();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to update reminder status.")
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (reminder) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${reminder.title}"?`
    );

    if (!confirmed) return;

    try {
      setActionId(reminder.id);

      await api.delete(`/reminders/${reminder.id}`);

      toast.success("Reminder deleted successfully!");

      if (editingId === reminder.id) {
        resetForm();
      }

      await loadReminders();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to delete reminder.")
      );
    } finally {
      setActionId(null);
    }
  };

  const filteredReminders = reminders.filter((reminder) => {
    if (filter === "active") return reminder.is_active;
    if (filter === "inactive") return !reminder.is_active;
    return true;
  });

  const activeCount = activeReminders.length;
  const inactiveCount = reminders.length - activeCount;

  return (
    <div className="page-content reminders-page">
      <div className="page-heading reminders-page-heading">
        <div>
          <p className="section-label">HEALTH & WELLNESS</p>
          <h1>Reminders & Alerts</h1>
          <p className="page-description">
            Create personalized reminders to stay consistent with
            your workouts, meals, and hydration.
          </p>
        </div>

        <button
          type="button"
          className="primary-button reminders-add-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Create Reminder
        </button>
      </div>

      <div className="reminders-stats-grid">
        <article className="reminders-stat-card">
          <div className="reminders-stat-icon purple">
            <BellRing size={22} />
          </div>
          <div>
            <span>Total Reminders</span>
            <strong>{reminders.length}</strong>
          </div>
        </article>

        <article className="reminders-stat-card">
          <div className="reminders-stat-icon green">
            <Power size={22} />
          </div>
          <div>
            <span>Active Reminders</span>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article className="reminders-stat-card">
          <div className="reminders-stat-icon orange">
            <Clock size={22} />
          </div>
          <div>
            <span>Inactive Reminders</span>
            <strong>{inactiveCount}</strong>
          </div>
        </article>
      </div>

      {showForm && (
        <section className="content-card reminder-form-card">
          <div className="reminder-form-heading">
            <div>
              <p className="section-label">PERSONAL SCHEDULE</p>
              <h2>
                {editingId !== null
                  ? "Update Reminder"
                  : "Create New Reminder"}
              </h2>
              <p>
                Choose what you want to remember and when it should
                be scheduled.
              </p>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={resetForm}
              aria-label="Close reminder form"
            >
              <X size={19} />
            </button>
          </div>

          <form className="reminder-form" onSubmit={handleSubmit}>
            <div className="reminder-form-grid">
              <div className="form-field">
                <label htmlFor="reminder_type">Reminder Category</label>
                <select
                  id="reminder_type"
                  name="reminder_type"
                  value={form.reminder_type}
                  onChange={handleChange}
                  required
                >
                  <option value="workout">Workout</option>
                  <option value="meal">Meal</option>
                  <option value="water">Water Intake</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="reminder_title">Reminder Title</label>
                <input
                  id="reminder_title"
                  name="title"
                  type="text"
                  minLength="2"
                  maxLength="150"
                  placeholder="e.g. Morning Workout"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field reminder-full-width">
                <label htmlFor="reminder_message">Message</label>
                <textarea
                  id="reminder_message"
                  name="message"
                  rows="3"
                  minLength="2"
                  placeholder="Write a short reminder message..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="scheduled_time">Reminder Time</label>
                <input
                  id="scheduled_time"
                  name="scheduled_time"
                  type="time"
                  value={form.scheduled_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="recurrence">Repeat</label>
                <select
                  id="recurrence"
                  name="recurrence"
                  value={form.recurrence}
                  onChange={handleChange}
                  required
                >
                  <option value="once">One Time</option>
                  <option value="daily">Every Day</option>
                  <option value="weekly">Every Week</option>
                </select>
              </div>

              {form.recurrence === "once" && (
                <div className="form-field">
                  <label htmlFor="reminder_date">Reminder Date</label>
                  <input
                    id="reminder_date"
                    name="reminder_date"
                    type="date"
                    min={getLocalDate()}
                    value={form.reminder_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {form.recurrence === "weekly" && (
                <div className="form-field">
                  <label htmlFor="weekday">Weekday</label>
                  <select
                    id="weekday"
                    name="weekday"
                    value={form.weekday}
                    onChange={handleChange}
                    required
                  >
                    {weekdays.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="timezone">Timezone</label>
                <input
                  id="timezone"
                  name="timezone"
                  type="text"
                  value={form.timezone}
                  onChange={handleChange}
                  placeholder="Asia/Kolkata"
                  required
                />
                <small>
                  Use a valid timezone such as Asia/Kolkata.
                </small>
              </div>
            </div>

            <label className="reminder-active-checkbox">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />
              <span>Activate this reminder immediately</span>
            </label>

            <div className="reminder-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Reminder"
                    : "Save Reminder"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card reminders-list-card">
        <div className="reminders-list-heading">
          <div>
            <h2>Your Reminders</h2>
            <p>Manage your scheduled fitness activities.</p>
          </div>

          <button
            type="button"
            className="reminders-refresh-button"
            onClick={loadReminders}
            disabled={loading}
            title="Refresh reminders"
          >
            <RefreshCw
              size={17}
              className={loading ? "reminders-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="reminders-filter-tabs">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({reminders.length})
          </button>

          <button
            type="button"
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            Active ({activeCount})
          </button>

          <button
            type="button"
            className={filter === "inactive" ? "active" : ""}
            onClick={() => setFilter("inactive")}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        {loading ? (
          <div className="reminders-empty-state">
            Loading your reminders...
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="reminders-empty-state">
            <BellRing size={38} />
            <h3>No reminders found</h3>
            <p>
              {filter === "all"
                ? "Create your first reminder to build a consistent routine."
                : `There are no ${filter} reminders.`}
            </p>

            {filter === "all" && (
              <button
                type="button"
                className="primary-button"
                onClick={openAddForm}
              >
                <Plus size={17} />
                Create Reminder
              </button>
            )}
          </div>
        ) : (
          <div className="reminders-list">
            {filteredReminders.map((reminder) => {
              const Icon = getReminderIcon(reminder.reminder_type);
              const isBusy = actionId === reminder.id;

              return (
                <article
                  className="reminder-item"
                  key={reminder.id}
                >
                  <div
                    className={`reminder-category-icon ${reminder.reminder_type}`}
                  >
                    <Icon size={23} />
                  </div>

                  <div className="reminder-item-content">
                    <div className="reminder-item-title-row">
                      <h3>{reminder.title}</h3>
                      <span
                        className={`reminder-status ${
                          reminder.is_active ? "active" : "inactive"
                        }`}
                      >
                        {reminder.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="reminder-item-message">
                      {reminder.message}
                    </p>

                    <div className="reminder-item-details">
                      <span>
                        <Clock size={14} />
                        {formatTime(reminder.scheduled_time)}
                      </span>

                      <span>
                        <CalendarDays size={14} />
                        {getScheduleLabel(reminder)}
                      </span>

                      <span className="reminder-type-label">
                        {reminder.reminder_type}
                      </span>
                    </div>

                    <small className="reminder-timezone">
                      Timezone: {reminder.timezone}
                    </small>
                  </div>

                  <div className="reminder-item-actions">
                    <button
                      type="button"
                      className="reminder-action-button"
                      onClick={() => openEditForm(reminder)}
                      disabled={isBusy}
                      title="Edit reminder"
                      aria-label="Edit reminder"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      className={`reminder-action-button ${
                        reminder.is_active ? "deactivate" : "activate"
                      }`}
                      onClick={() => handleToggle(reminder)}
                      disabled={isBusy}
                      title={
                        reminder.is_active
                          ? "Deactivate reminder"
                          : "Activate reminder"
                      }
                      aria-label={
                        reminder.is_active
                          ? "Deactivate reminder"
                          : "Activate reminder"
                      }
                    >
                      <Power size={17} />
                    </button>

                    <button
                      type="button"
                      className="reminder-action-button delete"
                      onClick={() => handleDelete(reminder)}
                      disabled={isBusy}
                      title="Delete reminder"
                      aria-label="Delete reminder"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Reminders;
