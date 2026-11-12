
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  Square,
  Flame,
  History,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../services/api";
import "./WorkoutTimer.css";

const ACTIVITY_OPTIONS = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "cardio", label: "Cardio" },
  { value: "strength", label: "Strength Training" },
  { value: "yoga", label: "Yoga" },
];

const MET_VALUES = {
  walking: 3.5,
  running: 8,
  cycling: 6,
  cardio: 6,
  strength: 5,
  yoga: 2.5,
};

const initialForm = {
  title: "",
  activity_type: "walking",
  body_weight_kg: "",
};

function formatTime(totalSeconds = 0) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function calculateLiveCalories(session, seconds) {
  if (!session) return 0;

  const met = MET_VALUES[session.activity_type] || 4;
  const weight = Number(session.body_weight_kg) || 0;

  return Number(((met * weight * seconds) / 3600).toFixed(2));
}

function WorkoutTimer() {
  const [form, setForm] = useState(initialForm);
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [clockAnchor, setClockAnchor] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await api.get("/workout-timer/sessions/");
      setHistory(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load workout history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const applySession = useCallback((session) => {
    setActiveSession(session);

    const seconds = session?.elapsed_seconds || 0;
    setElapsedSeconds(seconds);

    if (session?.status === "running") {
      setClockAnchor({
        elapsed: seconds,
        startedAt: Date.now(),
      });
    } else {
      setClockAnchor(null);
    }
  }, []);

  const loadActiveSession = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/workout-timer/sessions/active");

      if (response.data) {
        applySession(response.data);
      } else {
        setActiveSession(null);
        setElapsedSeconds(0);
        setClockAnchor(null);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to check active workout."
      );
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      loadActiveSession();
      loadHistory();
    });

    return () => {
      cancelled = true;
    };
  }, [loadActiveSession, loadHistory]);

  useEffect(() => {
    if (activeSession?.status !== "running" || !clockAnchor) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const elapsed =
        clockAnchor.elapsed +
        Math.floor((Date.now() - clockAnchor.startedAt) / 1000);

      setElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeSession?.status, clockAnchor]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleStart = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Please enter a workout title.");
      return;
    }

    const weight = Number(form.body_weight_kg);

    if (!weight || weight <= 0 || weight > 300) {
      toast.error("Enter a valid body weight between 0 and 300 kg.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/workout-timer/sessions/start", {
        title: form.title.trim(),
        activity_type: form.activity_type,
        body_weight_kg: weight,
      });

      applySession(response.data);
      setForm(initialForm);
      toast.success("Workout started! Let's go.");
      loadHistory();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to start workout."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;

    setSubmitting(true);

    try {
      const response = await api.post(
        `/workout-timer/sessions/${activeSession.id}/pause`
      );

      applySession(response.data);
      toast.info("Workout paused.");
      loadHistory();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to pause workout."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;

    setSubmitting(true);

    try {
      const response = await api.post(
        `/workout-timer/sessions/${activeSession.id}/resume`
      );

      applySession(response.data);
      toast.success("Workout resumed.");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to resume workout."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;

    const confirmed = window.confirm(
      "Are you sure you want to finish this workout?"
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const response = await api.post(
        `/workout-timer/sessions/${activeSession.id}/stop`
      );

      applySession(response.data);
      setActiveSession(response.data);
      setClockAnchor(null);
      setElapsedSeconds(response.data.elapsed_seconds || 0);

      toast.success("Workout completed successfully!");
      loadHistory();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to stop workout."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isRunning = activeSession?.status === "running";
  const isPaused = activeSession?.status === "paused";
  const isCompleted = activeSession?.status === "completed";

  const calories = activeSession
    ? isCompleted
      ? activeSession.calories_burned
      : calculateLiveCalories(activeSession, elapsedSeconds)
    : 0;

  if (loading) {
    return (
      <div className="timer-loading">
        <LoaderCircle className="timer-spinner" size={30} />
        <p>Loading workout timer...</p>
      </div>
    );
  }

  return (
    <div className="workout-timer-page">
      <div className="timer-page-heading">
        <div>
          <span className="timer-eyebrow">WORKOUT TRACKING</span>
          <h1>Workout Timer</h1>
          <p>
            Track your workout sessions, monitor duration and estimate
            calories burned.
          </p>
        </div>

        <div className="timer-heading-icon">
          <Activity size={27} />
        </div>
      </div>

      {(isRunning || isPaused || isCompleted) && activeSession && (
        <section className="live-workout-card">
          <div className="live-workout-top">
            <div>
              <span className="timer-eyebrow">CURRENT SESSION</span>
              <h2>{activeSession.title}</h2>
              <p className="session-activity">
                {activeSession.activity_type.replace("_", " ")}
              </p>
            </div>

            <span
              className={`session-status ${
                isRunning
                  ? "status-running"
                  : isPaused
                    ? "status-paused"
                    : "status-completed"
              }`}
            >
              {isRunning ? "Running" : isPaused ? "Paused" : "Completed"}
            </span>
          </div>

          <div className="timer-display">
            <Clock size={23} />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <p className="timer-caption">
            {isRunning
              ? "Your workout is in progress"
              : isPaused
                ? "Your workout is paused"
                : "Workout session finished"}
          </p>

          <div className="timer-stat-grid">
            <div className="timer-stat">
              <div className="timer-stat-icon calorie-icon">
                <Flame size={20} />
              </div>
              <div>
                <strong>{Number(calories || 0).toFixed(2)}</strong>
                <span>Calories burned</span>
              </div>
            </div>

            <div className="timer-stat">
              <div className="timer-stat-icon activity-icon">
                <Dumbbell size={20} />
              </div>
              <div>
                <strong>
                  {activeSession.activity_type.replace("_", " ")}
                </strong>
                <span>Activity type</span>
              </div>
            </div>
          </div>

          {(isRunning || isPaused) && (
            <div className="timer-controls">
              {isRunning ? (
                <button
                  type="button"
                  className="timer-button pause-button"
                  onClick={handlePause}
                  disabled={submitting}
                >
                  <Pause size={18} />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="timer-button resume-button"
                  onClick={handleResume}
                  disabled={submitting}
                >
                  <Play size={18} />
                  Resume
                </button>
              )}

              <button
                type="button"
                className="timer-button stop-button"
                onClick={handleStop}
                disabled={submitting}
              >
                <Square size={17} />
                Finish Workout
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="completed-message">
              <CheckCircle2 size={19} />
              Workout saved successfully.
            </div>
          )}
        </section>
      )}

      {!isRunning && !isPaused && (
        <section className="timer-setup-card">
          <div className="timer-section-heading">
            <div className="timer-section-icon">
              <Play size={21} />
            </div>
            <div>
              <h2>Start a Workout</h2>
              <p>Enter your workout details to begin tracking.</p>
            </div>
          </div>

          <form onSubmit={handleStart} className="timer-form">
            <div className="timer-form-group">
              <label htmlFor="workout-title">Workout Title</label>
              <input
                id="workout-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="Example: Morning Running"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="timer-form-row">
              <div className="timer-form-group">
                <label htmlFor="activity-type">Activity Type</label>
                <select
                  id="activity-type"
                  name="activity_type"
                  value={form.activity_type}
                  onChange={handleFormChange}
                >
                  {ACTIVITY_OPTIONS.map((activity) => (
                    <option key={activity.value} value={activity.value}>
                      {activity.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="timer-form-group">
                <label htmlFor="body-weight">Body Weight (kg)</label>
                <input
                  id="body-weight"
                  type="number"
                  name="body_weight_kg"
                  value={form.body_weight_kg}
                  onChange={handleFormChange}
                  placeholder="Enter weight in kg"
                  min="0.1"
                  max="300"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="timer-button start-button"
              disabled={submitting}
            >
              {submitting ? (
                <LoaderCircle className="timer-spinner" size={19} />
              ) : (
                <Play size={19} />
              )}
              {submitting ? "Starting..." : "Start Workout"}
            </button>
          </form>
        </section>
      )}

      <section className="workout-history-card">
        <div className="history-heading">
          <div className="timer-section-heading">
            <div className="timer-section-icon history-icon">
              <History size={21} />
            </div>
            <div>
              <h2>Workout History</h2>
              <p>Your previous tracked workout sessions.</p>
            </div>
          </div>

          <button
            type="button"
            className="refresh-history-button"
            onClick={loadHistory}
            disabled={historyLoading}
            aria-label="Refresh workout history"
          >
            <RotateCcw size={17} />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="history-empty">
            <LoaderCircle className="timer-spinner" size={24} />
            <p>Loading workout history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <Dumbbell size={34} />
            <h3>No workout sessions yet</h3>
            <p>Start your first workout to see your history here.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((session) => (
              <div className="history-item" key={session.id}>
                <div className="history-item-icon">
                  <Activity size={20} />
                </div>

                <div className="history-item-details">
                  <h3>{session.title}</h3>
                  <p>
                    {session.activity_type.replace("_", " ")} ·{" "}
                    {formatDate(session.started_at)}
                  </p>
                </div>

                <div className="history-item-stats">
                  <strong>
                    {formatTime(session.elapsed_seconds || 0)}
                  </strong>
                  <span>
                    {Number(session.calories_burned || 0).toFixed(2)} kcal
                  </span>
                </div>

                <span
                  className={`history-status ${
                    session.status === "completed"
                      ? "status-completed"
                      : session.status === "paused"
                        ? "status-paused"
                        : "status-running"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default WorkoutTimer;
