
import { useEffect, useState } from "react";
import { Plus, Dumbbell, Pencil, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const initialForm = {
  name: "",
  workout_type: "Cardio",
  duration_minutes: "",
  calories_burned: 0,
  notes: "",
  workout_date: new Date().toISOString().slice(0, 10),
};

function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkouts = async () => {
    try {
      const response = await api.get("/workouts/");
      setWorkouts(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to load workouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) fetchWorkouts();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(true);
  };

  const openEditForm = (workout) => {
    setEditingId(workout.id);
    setFormData({
      name: workout.name,
      workout_type: workout.workout_type,
      duration_minutes: workout.duration_minutes,
      calories_burned: workout.calories_burned,
      notes: workout.notes || "",
      workout_date: workout.workout_date,
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...formData,
      duration_minutes: Number(formData.duration_minutes),
      calories_burned: Number(formData.calories_burned),
    };

    try {
      if (editingId) {
        await api.put(`/workouts/${editingId}`, payload);
        toast.success("Workout updated successfully!");
      } else {
        await api.post("/workouts/", payload);
        toast.success("Workout added successfully!");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(initialForm);
      await fetchWorkouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this workout?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/workouts/${id}`);
      toast.success("Workout deleted successfully!");
      await fetchWorkouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to delete workout");
    }
  };

  const totalMinutes = workouts.reduce(
    (sum, workout) => sum + workout.duration_minutes,
    0
  );

  const totalCalories = workouts.reduce(
    (sum, workout) => sum + workout.calories_burned,
    0
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="section-label">FITNESS ACTIVITY</p>
          <h1>Workout Management</h1>
          <p>Create, manage, and track your workouts.</p>
        </div>

        <button className="primary-button add-workout-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Workout
        </button>
      </div>

      <div className="stats-grid workout-stats">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Dumbbell size={23} />
          </div>
          <div>
            <p>Total Workouts</p>
            <h2>{workouts.length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <Dumbbell size={23} />
          </div>
          <div>
            <p>Total Minutes</p>
            <h2>{totalMinutes}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Dumbbell size={23} />
          </div>
          <div>
            <p>Calories Burned</p>
            <h2>{totalCalories.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="content-card workout-form-card">
          <div className="card-heading">
            <h2>{editingId ? "Update Workout" : "Add New Workout"}</h2>
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="workout-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Workout Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Example: Morning Running"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-field">
                <label>Workout Type</label>
                <select
                  name="workout_type"
                  value={formData.workout_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Cardio">Cardio</option>
                  <option value="Strength">Strength Training</option>
                  <option value="Yoga">Yoga</option>
                  <option value="Running">Running</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-field">
                <label>Calories Burned</label>
                <input
                  type="number"
                  name="calories_burned"
                  value={formData.calories_burned}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>

              <div className="form-field">
                <label>Workout Date</label>
                <input
                  type="date"
                  name="workout_date"
                  value={formData.workout_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Notes</label>
                <input
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
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
                  : editingId
                    ? "Update Workout"
                    : "Save Workout"}
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="content-card workout-table-card">
        <div className="card-heading">
          <h2>Workout History</h2>
          <span>{workouts.length} records</span>
        </div>

        {loading ? (
          <p className="empty-message">Loading workouts...</p>
        ) : workouts.length === 0 ? (
          <p className="empty-message">
            No workouts found. Add your first workout!
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="workout-table">
              <thead>
                <tr>
                  <th>Workout</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Calories</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {workouts.map((workout) => (
                  <tr key={workout.id}>
                    <td>
                      <strong>{workout.name}</strong>
                      {workout.notes && (
                        <small className="workout-note">{workout.notes}</small>
                      )}
                    </td>
                    <td>
                      <span className="type-badge">
                        {workout.workout_type}
                      </span>
                    </td>
                    <td>{workout.duration_minutes} min</td>
                    <td>{workout.calories_burned} kcal</td>
                    <td>{workout.workout_date}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button edit-button"
                          onClick={() => openEditForm(workout)}
                          aria-label="Edit workout"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="icon-button delete-button"
                          onClick={() => handleDelete(workout.id)}
                          aria-label="Delete workout"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Workouts;
