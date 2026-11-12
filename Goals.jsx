import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Trophy,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  title: "",
  description: "",
  goal_type: "custom",
  target_value: "",
  current_value: 0,
  unit: "",
  start_date: today(),
  target_date: "",
  status: "active",
};

function Goals() {
  const [goals, setGoals] = useState([]);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchGoals = async () => {
    try {
      const response = await api.get("/goals/");
      setGoals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load fitness goals."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        fetchGoals();
      }
    });

    return () => {
      cancelled = true;
    };
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
    setFormData({ ...emptyForm, start_date: today() });
    setShowForm(true);
  };

  const openEditForm = (goal) => {
    setEditingId(goal.id);
    setFormData({
      title: goal.title || "",
      description: goal.description || "",
      goal_type: goal.goal_type || "custom",
      target_value: goal.target_value ?? "",
      current_value: goal.current_value ?? 0,
      unit: goal.unit || "",
      start_date: goal.start_date || today(),
      target_date: goal.target_date || "",
      status: goal.status || "active",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ...emptyForm, start_date: today() });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (Number(formData.target_value) <= 0) {
      toast.error("Target value must be greater than zero.");
      return;
    }

    if (Number(formData.current_value) < 0) {
      toast.error("Current value cannot be negative.");
      return;
    }

    if (
      formData.target_date &&
      formData.target_date < formData.start_date
    ) {
      toast.error("Target date cannot be before the start date.");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      goal_type: formData.goal_type,
      target_value: Number(formData.target_value),
      current_value: Number(formData.current_value),
      unit: formData.unit.trim(),
      start_date: formData.start_date,
      target_date: formData.target_date || null,
      status: formData.status,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/goals/${editingId}`, payload);
        toast.success("Fitness goal updated successfully!");
      } else {
        await api.post("/goals/", payload);
        toast.success("Fitness goal created successfully!");
      }

      closeForm();
      await fetchGoals();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to save fitness goal."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) {
      return;
    }

    try {
      await api.delete(`/goals/${id}`);
      toast.success("Fitness goal deleted successfully!");
      await fetchGoals();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to delete fitness goal."
      );
    }
  };

  const handleStatusChange = async (goal) => {
    const newStatus =
      goal.status === "completed" ? "active" : "completed";

    try {
      await api.put(`/goals/${goal.id}`, {
        title: goal.title,
        description: goal.description || "",
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        current_value: goal.current_value,
        unit: goal.unit || "",
        start_date: goal.start_date,
        target_date: goal.target_date || null,
        status: newStatus,
      });

      toast.success(
        newStatus === "completed"
          ? "Congratulations! Goal completed!"
          : "Goal moved back to active."
      );

      await fetchGoals();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to update goal status."
      );
    }
  };

  const completedGoals = goals.filter(
    (goal) => goal.status === "completed"
  );

  const activeGoals = goals.filter(
    (goal) => goal.status === "active"
  );

  const filteredGoals =
    filter === "active"
      ? activeGoals
      : filter === "completed"
        ? completedGoals
        : goals;

  const getPercentage = (goal) => {
    const target = Number(goal.target_value || 0);
    const current = Number(goal.current_value || 0);

    if (target <= 0) return 0;

    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="section-label">FITNESS TARGETS</p>
          <h1>Fitness Goals</h1>
          <p className="page-description">
            Set targets, track achievements, and stay motivated.
          </p>
        </div>

        <button
          className="primary-button goals-add-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Goal
        </button>
      </div>

      <div className="goals-stats">
        <div className="goal-stat-card">
          <Target size={23} />
          <div>
            <p>Total Goals</p>
            <h2>{goals.length}</h2>
          </div>
        </div>

        <div className="goal-stat-card">
          <div className="goal-stat-icon active-goal-icon">
            <Target size={23} />
          </div>
          <div>
            <p>Active Goals</p>
            <h2>{activeGoals.length}</h2>
          </div>
        </div>

        <div className="goal-stat-card">
          <div className="goal-stat-icon completed-goal-icon">
            <Trophy size={23} />
          </div>
          <div>
            <p>Completed Goals</p>
            <h2>{completedGoals.length}</h2>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="content-card goals-form-card">
          <div className="goals-form-heading">
            <div>
              <p className="section-label">GOAL MANAGEMENT</p>
              <h2>
                {editingId !== null ? "Update Fitness Goal" : "Create Fitness Goal"}
              </h2>
            </div>

            <button
              className="icon-button"
              type="button"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={19} />
            </button>
          </div>

          <form className="goals-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Goal Title</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Example: Complete 20 workouts"
                  required
                />
              </div>

              <div className="form-field">
                <label>Goal Type</label>
                <select
                  name="goal_type"
                  value={formData.goal_type}
                  onChange={handleChange}
                  required
                >
                  <option value="weight">Weight</option>
                  <option value="calories">Calories</option>
                  <option value="workout_duration">Workout Duration</option>
                  <option value="water_intake">Water Intake</option>
                  <option value="exercise_minutes">Exercise Minutes</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="form-field">
                <label>Target Value</label>
                <input
                  type="number"
                  name="target_value"
                  value={formData.target_value}
                  onChange={handleChange}
                  min="0.01"
                  step="any"
                  placeholder="Enter target"
                  required
                />
              </div>

              <div className="form-field">
                <label>Current Value</label>
                <input
                  type="number"
                  name="current_value"
                  value={formData.current_value}
                  onChange={handleChange}
                  min="0"
                  step="any"
                  required
                />
              </div>

              <div className="form-field">
                <label>Unit</label>
                <input
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="kg, kcal, minutes, sessions..."
                />
              </div>

              <div className="form-field">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-field">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Target Date</label>
                <input
                  type="date"
                  name="target_date"
                  value={formData.target_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field goals-description-field">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your fitness goal..."
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
                    ? "Update Goal"
                    : "Create Goal"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="goals-filter">
        <button
          className={filter === "all" ? "goal-filter-button selected" : "goal-filter-button"}
          onClick={() => setFilter("all")}
        >
          All Goals ({goals.length})
        </button>

        <button
          className={filter === "active" ? "goal-filter-button selected" : "goal-filter-button"}
          onClick={() => setFilter("active")}
        >
          Active ({activeGoals.length})
        </button>

        <button
          className={filter === "completed" ? "goal-filter-button selected" : "goal-filter-button"}
          onClick={() => setFilter("completed")}
        >
          Completed ({completedGoals.length})
        </button>
      </div>

      <div className="goals-list">
        {loading ? (
          <div className="content-card">
            <p className="empty-message">Loading fitness goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="content-card goals-empty-state">
            <Target size={38} />
            <h3>No goals found</h3>
            <p>Create a fitness goal to start tracking your progress.</p>
            <button className="primary-button" onClick={openAddForm}>
              <Plus size={17} />
              Create Goal
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const percentage = getPercentage(goal);
            const completed = goal.status === "completed";

            return (
              <div className="content-card goal-card" key={goal.id}>
                <div className="goal-card-top">
                  <div className="goal-title-area">
                    <div className="goal-card-icon">
                      {completed ? <Trophy size={22} /> : <Target size={22} />}
                    </div>

                    <div>
                      <h3>{goal.title}</h3>
                      <p>{goal.description || goal.goal_type}</p>
                    </div>
                  </div>

                  <span className={completed ? "goal-status completed" : "goal-status active"}>
                    {goal.status}
                  </span>
                </div>

                <div className="goal-progress-info">
                  <span>Progress</span>
                  <strong>{percentage}%</strong>
                </div>

                <div className="goal-progress-track">
                  <div
                    className="goal-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="goal-values">
                  <span>
                    {goal.current_value ?? 0} / {goal.target_value}{" "}
                    {goal.unit || ""}
                  </span>
                  <span>
                    Target: {goal.target_date || "Not set"}
                  </span>
                </div>

                <div className="goal-card-actions">
                  <button
                    className="goal-action-button"
                    onClick={() => handleStatusChange(goal)}
                  >
                    <Trophy size={15} />
                    {completed ? "Reopen Goal" : "Mark Completed"}
                  </button>

                  <button
                    className="icon-button edit-button"
                    onClick={() => openEditForm(goal)}
                    title="Edit goal"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    className="icon-button delete-button"
                    onClick={() => handleDelete(goal.id)}
                    title="Delete goal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Goals;