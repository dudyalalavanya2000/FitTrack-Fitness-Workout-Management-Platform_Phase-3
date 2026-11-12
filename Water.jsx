
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Droplets,
  CalendarDays,
  Plus,
  Edit,
  Trash2,
  X,
  Target,
  GlassWater,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./Water.css";

function getLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialForm = {
  quantity_ml: "",
  intake_date: getLocalDate(),
};

function Water() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [form, setForm] = useState(initialForm);
  const [goalInput, setGoalInput] = useState("2500");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const dailyRecords = useMemo(
    () =>
      records.filter(
        (record) => record.intake_date === selectedDate
      ),
    [records, selectedDate]
  );

  const loadWaterData = useCallback(async () => {
    try {
      setLoading(true);

      const [recordsResponse, summaryResponse] = await Promise.all([
        api.get("/water/"),
        api.get("/water/daily", {
          params: { summary_date: selectedDate },
        }),
      ]);

      setRecords(recordsResponse.data);
      setSummary(summaryResponse.data);
      setGoalInput(String(summaryResponse.data.daily_goal_ml));
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to load water intake information."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    Promise.resolve().then(loadWaterData);
  }, [loadWaterData]);

  const resetForm = () => {
    setForm({
      quantity_ml: "",
      intake_date: selectedDate,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const quantity = Number(form.quantity_ml);

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 5000) {
      toast.error("Enter a whole number between 1 and 5000 ml.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        quantity_ml: quantity,
        intake_date: form.intake_date,
      };

      if (editingId) {
        await api.put(`/water/${editingId}`, payload);
        toast.success("Water intake updated successfully!");
      } else {
        await api.post("/water/", payload);
        toast.success("Water intake recorded successfully!");
      }

      resetForm();
      await loadWaterData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to save water intake."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setForm({
      quantity_ml: String(record.quantity_ml),
      intake_date: record.intake_date,
    });

    setEditingId(record.id);
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (recordId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this water intake record?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/water/${recordId}`);
      toast.success("Water intake record deleted successfully!");
      await loadWaterData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to delete water record."
      );
    }
  };

  const handleGoalUpdate = async (event) => {
    event.preventDefault();

    const target = Number(goalInput);

    if (!Number.isInteger(target) || target < 250 || target > 10000) {
      toast.error("Daily goal must be between 250 and 10000 ml.");
      return;
    }

    try {
      setSavingGoal(true);

      await api.put("/water/goal", {
        target_ml: target,
      });

      toast.success("Daily water goal updated!");
      await loadWaterData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to update daily goal."
      );
    } finally {
      setSavingGoal(false);
    }
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return "Time unavailable";

    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const progress = Math.min(
    Number(summary?.progress_percentage ?? 0),
    100
  );

  return (
    <div className="water-page">
      <div className="water-header">
        <div>
          <span className="water-eyebrow">HEALTH & WELLNESS</span>
          <h1>Water Intake Tracker</h1>
          <p>
            Stay hydrated, track your daily water intake and build healthy
            habits.
          </p>
        </div>

        <button
          className="water-add-button"
          onClick={() => {
            resetForm();
            setForm({
              quantity_ml: "",
              intake_date: selectedDate,
            });
            setShowForm(true);
          }}
        >
          <Plus size={19} />
          Add Water
        </button>
      </div>

      <div className="water-date-picker">
        <CalendarDays size={19} />
        <label htmlFor="water-date">Select date</label>
        <input
          id="water-date"
          type="date"
          value={selectedDate}
          max={getLocalDate()}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>

      {showForm && (
        <section className="water-form-card">
          <div className="water-form-heading">
            <div>
              <h2>{editingId ? "Update Water Intake" : "Record Water Intake"}</h2>
              <p>Enter the amount of water you consumed.</p>
            </div>

            <button
              type="button"
              className="water-close-button"
              onClick={resetForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="water-form-grid">
              <div className="water-field">
                <label htmlFor="quantity_ml">Water quantity (ml)</label>
                <input
                  id="quantity_ml"
                  name="quantity_ml"
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  placeholder="e.g. 250"
                  value={form.quantity_ml}
                  onChange={handleInputChange}
                  required
                />
                <small>Enter an amount between 1 and 5000 ml.</small>
              </div>

              <div className="water-field">
                <label htmlFor="intake_date">Intake date</label>
                <input
                  id="intake_date"
                  name="intake_date"
                  type="date"
                  max={getLocalDate()}
                  value={form.intake_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="water-form-actions">
              <button
                type="button"
                className="water-cancel-button"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="water-submit-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Intake"
                    : "Save Intake"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="water-progress-card">
        <div className="water-progress-top">
          <div>
            <span className="water-card-label">DAILY HYDRATION</span>
            <h2>Your hydration progress</h2>
            <p>Keep drinking water throughout the day.</p>
          </div>

          <div className="water-progress-icon">
            <Droplets size={27} />
          </div>
        </div>

        <div className="water-progress-values">
          <div>
            <h3>
              {Number(summary?.total_intake_ml ?? 0).toLocaleString()}
              <small> ml</small>
            </h3>
            <span>Consumed</span>
          </div>

          <div className="water-goal-value">
            <h3>
              {Number(summary?.daily_goal_ml ?? 2500).toLocaleString()}
              <small> ml</small>
            </h3>
            <span>Daily goal</span>
          </div>
        </div>

        <div
          className="water-progress-track"
          role="progressbar"
          aria-label="Daily water intake progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            className="water-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="water-progress-bottom">
          <strong>{progress.toFixed(1)}% completed</strong>
          <span>
            {Number(summary?.remaining_ml ?? 0).toLocaleString()} ml remaining
          </span>
        </div>

        {progress >= 100 && (
          <div className="water-goal-complete">
            <CheckCircle2 size={18} />
            Daily water goal achieved. Great job!
          </div>
        )}
      </section>

      <section className="water-goal-card">
        <div className="water-goal-heading">
          <div className="water-goal-icon">
            <Target size={22} />
          </div>
          <div>
            <h2>Daily Water Goal</h2>
            <p>Customize your daily hydration target.</p>
          </div>
        </div>

        <form className="water-goal-form" onSubmit={handleGoalUpdate}>
          <div className="water-field">
            <label htmlFor="daily-water-goal">Daily target (ml)</label>
            <input
              id="daily-water-goal"
              type="number"
              min="250"
              max="10000"
              step="1"
              value={goalInput}
              onChange={(event) => setGoalInput(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="water-submit-button"
            disabled={savingGoal}
          >
            {savingGoal ? "Updating..." : "Update Goal"}
          </button>
        </form>
      </section>

      <div className="water-history-heading">
        <div>
          <h2>Water Intake History</h2>
          <p>
            {summary?.total_records ?? 0} records on {selectedDate}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="water-empty-state">Loading water intake data...</div>
      ) : dailyRecords.length === 0 ? (
        <div className="water-empty-state">
          <GlassWater size={40} />
          <h3>No water intake recorded</h3>
          <p>Add your first water record to start tracking hydration.</p>
          <button
            className="water-add-button"
            onClick={() => {
              setForm({
                quantity_ml: "",
                intake_date: selectedDate,
              });
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Record Water
          </button>
        </div>
      ) : (
        <div className="water-record-list">
          {dailyRecords.map((record) => (
            <article className="water-record-card" key={record.id}>
              <div className="water-record-main">
                <div className="water-record-icon">
                  <Droplets size={22} />
                </div>

                <div className="water-record-info">
                  <h3>{record.quantity_ml.toLocaleString()} ml</h3>
                  <span>{formatTime(record.created_at)}</span>
                </div>
              </div>

              <div className="water-record-actions">
                <button
                  type="button"
                  onClick={() => handleEdit(record)}
                  title="Edit water record"
                  aria-label="Edit water record"
                >
                  <Edit size={17} />
                </button>

                <button
                  type="button"
                  className="water-delete-button"
                  onClick={() => handleDelete(record.id)}
                  title="Delete water record"
                  aria-label="Delete water record"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Water;
