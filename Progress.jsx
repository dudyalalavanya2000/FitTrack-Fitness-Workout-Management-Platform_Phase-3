
import { useEffect, useState } from "react";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  X,
  Scale,
  Flame,
  Droplets,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const getToday = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  progress_date: getToday(),
  weight_kg: "",
  calories_consumed: 0,
  water_intake_ml: 0,
  exercise_minutes: 0,
  notes: "",
};

function Progress() {
  const [progressRecords, setProgressRecords] = useState([]);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProgress = async () => {
    try {
      const response = await api.get("/progress/");
      const records = Array.isArray(response.data) ? response.data : [];
      setProgressRecords(records);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load daily progress."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetchProgress);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, progress_date: getToday() });
    setShowForm(true);
  };

  const openEditForm = (record) => {
    setEditingId(record.id);
    setFormData({
      progress_date: record.progress_date || getToday(),
      weight_kg: record.weight_kg ?? "",
      calories_consumed: record.calories_consumed ?? 0,
      water_intake_ml: record.water_intake_ml ?? 0,
      exercise_minutes: record.exercise_minutes ?? 0,
      notes: record.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ...emptyForm, progress_date: getToday() });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.progress_date) {
      toast.error("Please select a progress date.");
      return;
    }

    if (formData.weight_kg !== "" && Number(formData.weight_kg) <= 0) {
      toast.error("Weight must be greater than zero.");
      return;
    }

    const payload = {
      progress_date: formData.progress_date,
      weight_kg:
        formData.weight_kg === "" ? null : Number(formData.weight_kg),
      calories_consumed: Number(formData.calories_consumed),
      water_intake_ml: Number(formData.water_intake_ml),
      exercise_minutes: Number(formData.exercise_minutes),
      notes: formData.notes.trim(),
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/progress/${editingId}`, payload);
        toast.success("Daily progress updated successfully!");
      } else {
        await api.post("/progress/", payload);
        toast.success("Daily progress added successfully!");
      }

      closeForm();
      await fetchProgress();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to save daily progress."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this progress record?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/progress/${id}`);
      toast.success("Progress record deleted successfully!");
      await fetchProgress();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to delete progress record."
      );
    }
  };

  const totalCalories = progressRecords.reduce(
    (total, record) => total + Number(record.calories_consumed || 0),
    0
  );

  const totalWater = progressRecords.reduce(
    (total, record) => total + Number(record.water_intake_ml || 0),
    0
  );

  const totalExercise = progressRecords.reduce(
    (total, record) => total + Number(record.exercise_minutes || 0),
    0
  );

  const latestRecord = [...progressRecords].sort((a, b) =>
    String(b.progress_date).localeCompare(String(a.progress_date))
  )[0];

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="section-label">FITNESS ACTIVITY</p>
          <h1>Daily Progress</h1>
          <p className="page-description">
            Track your daily health and fitness activities.
          </p>
        </div>

        <button className="primary-button progress-add-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Progress
        </button>
      </div>

      <div className="progress-stats">
        <div className="progress-stat-card">
          <div className="progress-stat-icon purple">
            <Scale size={22} />
          </div>
          <div>
            <p>Latest Weight</p>
            <h2>
              {latestRecord?.weight_kg != null
                ? `${latestRecord.weight_kg} kg`
                : "--"}
            </h2>
          </div>
        </div>

        <div className="progress-stat-card">
          <div className="progress-stat-icon orange">
            <Flame size={22} />
          </div>
          <div>
            <p>Total Calories Consumed</p>
            <h2>{totalCalories.toLocaleString()} kcal</h2>
          </div>
        </div>

        <div className="progress-stat-card">
          <div className="progress-stat-icon blue">
            <Droplets size={22} />
          </div>
          <div>
            <p>Total Water Intake</p>
            <h2>{totalWater.toLocaleString()} ml</h2>
          </div>
        </div>

        <div className="progress-stat-card">
          <div className="progress-stat-icon green">
            <Clock size={22} />
          </div>
          <div>
            <p>Total Exercise</p>
            <h2>{totalExercise} min</h2>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="content-card progress-form-card">
          <div className="progress-form-heading">
            <div>
              <p className="section-label">DAILY TRACKER</p>
              <h2>{editingId !== null ? "Update Progress" : "Add Daily Progress"}</h2>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={19} />
            </button>
          </div>

          <form className="progress-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="progress_date">Progress Date</label>
                <input
                  id="progress_date"
                  type="date"
                  name="progress_date"
                  value={formData.progress_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="weight_kg">Weight (kg)</label>
                <input
                  id="weight_kg"
                  type="number"
                  name="weight_kg"
                  placeholder="Enter weight"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  min="0.1"
                  max="500"
                  step="0.1"
                />
              </div>

              <div className="form-field">
                <label htmlFor="calories_consumed">Calories Consumed (kcal)</label>
                <input
                  id="calories_consumed"
                  type="number"
                  name="calories_consumed"
                  value={formData.calories_consumed}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="water_intake_ml">Water Intake (ml)</label>
                <input
                  id="water_intake_ml"
                  type="number"
                  name="water_intake_ml"
                  value={formData.water_intake_ml}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="exercise_minutes">Exercise (minutes)</label>
                <input
                  id="exercise_minutes"
                  type="number"
                  name="exercise_minutes"
                  value={formData.exercise_minutes}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div className="form-field progress-notes-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Add notes about your day..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
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
                    ? "Update Progress"
                    : "Save Progress"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card progress-history-card">
        <div className="card-heading">
          <div>
            <h2>Progress History</h2>
            <p>{progressRecords.length} records</p>
          </div>
          <Activity size={22} />
        </div>

        {loading ? (
          <p className="empty-message">Loading progress records...</p>
        ) : progressRecords.length === 0 ? (
          <div className="progress-empty-state">
            <Activity size={35} />
            <h3>No progress records yet</h3>
            <p>Add your first daily progress record to get started.</p>
            <button className="primary-button" onClick={openAddForm}>
              <Plus size={17} />
              Add Progress
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="workout-table progress-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Calories</th>
                  <th>Water</th>
                  <th>Exercise</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {[...progressRecords]
                  .sort((a, b) =>
                    String(b.progress_date).localeCompare(String(a.progress_date))
                  )
                  .map((record) => (
                    <tr key={record.id}>
                      <td>
                        {record.progress_date
                          ? new Date(
                              `${record.progress_date}T00:00:00`
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {record.weight_kg != null
                          ? `${record.weight_kg} kg`
                          : "-"}
                      </td>
                      <td>{record.calories_consumed ?? 0} kcal</td>
                      <td>{record.water_intake_ml ?? 0} ml</td>
                      <td>{record.exercise_minutes ?? 0} min</td>
                      <td>
                        <span className="progress-note">
                          {record.notes || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="icon-button edit-button"
                            onClick={() => openEditForm(record)}
                            title="Edit progress"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="icon-button delete-button"
                            onClick={() => handleDelete(record.id)}
                            title="Delete progress"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Progress;
