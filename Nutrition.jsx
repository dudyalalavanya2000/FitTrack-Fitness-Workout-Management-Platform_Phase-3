import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Apple,
  Beef,
  CalendarDays,
  Edit,
  Flame,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./Nutrition.css";

const initialForm = {
  meal_type: "Breakfast",
  food_name: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
};

function getLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Nutrition() {
  const [meals, setMeals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const dailyMeals = useMemo(() => {
    return meals.filter(
      (meal) => meal.created_at?.slice(0, 10) === selectedDate
    );
  }, [meals, selectedDate]);

  const loadNutrition = useCallback(async () => {
    try {
      setLoading(true);

      const [mealsResponse, summaryResponse] = await Promise.all([
        api.get("/meals/"),
        api.get("/meals/daily", {
          params: { summary_date: selectedDate },
        }),
      ]);

      setMeals(mealsResponse.data);
      setSummary(summaryResponse.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load nutrition data."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        loadNutrition();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadNutrition]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      meal_type: form.meal_type,
      food_name: form.food_name.trim(),
      calories: Number(form.calories),
      protein: Number(form.protein || 0),
      carbs: Number(form.carbs || 0),
      fats: Number(form.fats || 0),
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/meals/${editingId}`, payload);
        toast.success("Meal updated successfully!");
      } else {
        await api.post("/meals/", payload);
        toast.success("Meal added successfully!");
      }

      resetForm();
      await loadNutrition();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to save meal."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (meal) => {
    setForm({
      meal_type: meal.meal_type,
      food_name: meal.food_name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
    });

    setEditingId(meal.id);
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (mealId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this meal?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/meals/${mealId}`);
      toast.success("Meal deleted successfully!");
      await loadNutrition();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to delete meal."
      );
    }
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return "Time unavailable";

    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="nutrition-page">
      <div className="nutrition-header">
        <div>
          <span className="nutrition-eyebrow">HEALTH & WELLNESS</span>
          <h1>Nutrition & Meals</h1>
          <p>
            Track your daily food intake and stay on top of your nutrition.
          </p>
        </div>

        <button
          className="nutrition-add-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={19} />
          Add Meal
        </button>
      </div>

      <div className="nutrition-date-picker">
        <CalendarDays size={19} />
        <label htmlFor="nutrition-date">Select date</label>
        <input
          id="nutrition-date"
          type="date"
          value={selectedDate}
          max={getLocalDate()}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>

      {showForm && (
        <section className="nutrition-form-card">
          <div className="nutrition-form-heading">
            <div>
              <h2>{editingId ? "Update Meal" : "Add New Meal"}</h2>
              <p>Enter the food and nutrition details.</p>
            </div>

            <button
              type="button"
              className="nutrition-close-button"
              onClick={resetForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="nutrition-form-grid">
              <div className="nutrition-field">
                <label htmlFor="meal_type">Meal type</label>
                <select
                  id="meal_type"
                  name="meal_type"
                  value={form.meal_type}
                  onChange={handleInputChange}
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <div className="nutrition-field">
                <label htmlFor="food_name">Food name</label>
                <input
                  id="food_name"
                  name="food_name"
                  type="text"
                  placeholder="e.g. Vegetable rice"
                  minLength={2}
                  maxLength={150}
                  value={form.food_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="nutrition-field">
                <label htmlFor="calories">Calories (kcal)</label>
                <input
                  id="calories"
                  name="calories"
                  type="number"
                  min="0"
                  placeholder="e.g. 350"
                  value={form.calories}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="nutrition-field">
                <label htmlFor="protein">Protein (g)</label>
                <input
                  id="protein"
                  name="protein"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 15"
                  value={form.protein}
                  onChange={handleInputChange}
                />
              </div>

              <div className="nutrition-field">
                <label htmlFor="carbs">Carbohydrates (g)</label>
                <input
                  id="carbs"
                  name="carbs"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 45"
                  value={form.carbs}
                  onChange={handleInputChange}
                />
              </div>

              <div className="nutrition-field">
                <label htmlFor="fats">Fats (g)</label>
                <input
                  id="fats"
                  name="fats"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 10"
                  value={form.fats}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="nutrition-form-actions">
              <button
                type="button"
                className="nutrition-cancel-button"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="nutrition-submit-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Meal"
                    : "Save Meal"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="nutrition-section-heading">
        <div>
          <h2>Daily Nutrition Summary</h2>
          <p>Your nutrition totals for {selectedDate}</p>
        </div>
      </div>

      <div className="nutrition-summary-grid">
        <div className="nutrition-summary-card calories-card">
          <div className="nutrition-summary-icon">
            <Flame size={23} />
          </div>
          <div>
            <span>Total Calories</span>
            <h3>
              {summary?.total_calories ?? 0}
              <small> kcal</small>
            </h3>
          </div>
        </div>

        <div className="nutrition-summary-card protein-card">
          <div className="nutrition-summary-icon">
            <Beef size={23} />
          </div>
          <div>
            <span>Protein</span>
            <h3>
              {Number(summary?.total_protein ?? 0).toFixed(1)}
              <small> g</small>
            </h3>
          </div>
        </div>

        <div className="nutrition-summary-card carbs-card">
          <div className="nutrition-summary-icon">
            <Apple size={23} />
          </div>
          <div>
            <span>Carbohydrates</span>
            <h3>
              {Number(summary?.total_carbs ?? 0).toFixed(1)}
              <small> g</small>
            </h3>
          </div>
        </div>

        <div className="nutrition-summary-card fats-card">
          <div className="nutrition-summary-icon">
            <Flame size={23} />
          </div>
          <div>
            <span>Fats</span>
            <h3>
              {Number(summary?.total_fats ?? 0).toFixed(1)}
              <small> g</small>
            </h3>
          </div>
        </div>
      </div>

      <div className="nutrition-meal-heading">
        <div>
          <h2>Meal History</h2>
          <p>
            {summary?.total_meals ?? 0} meals recorded on {selectedDate}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="nutrition-empty-state">
          Loading nutrition data...
        </div>
      ) : dailyMeals.length === 0 ? (
        <div className="nutrition-empty-state">
          <Apple size={38} />
          <h3>No meals recorded</h3>
          <p>Add your first meal to start tracking your nutrition.</p>
          <button
            className="nutrition-add-button"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} />
            Add Your First Meal
          </button>
        </div>
      ) : (
        <div className="nutrition-meal-list">
          {dailyMeals.map((meal) => (
            <article className="nutrition-meal-card" key={meal.id}>
              <div className="nutrition-meal-main">
                <div className="nutrition-meal-icon">
                  <Apple size={22} />
                </div>

                <div className="nutrition-meal-info">
                  <div className="nutrition-meal-title">
                    <h3>{meal.food_name}</h3>
                    <span className="nutrition-meal-type">
                      {meal.meal_type}
                    </span>
                  </div>

                  <span className="nutrition-meal-time">
                    {formatTime(meal.created_at)}
                  </span>

                  <div className="nutrition-macros">
                    <span>Protein: {meal.protein}g</span>
                    <span>Carbs: {meal.carbs}g</span>
                    <span>Fats: {meal.fats}g</span>
                  </div>
                </div>
              </div>

              <div className="nutrition-meal-actions">
                <strong>{meal.calories} kcal</strong>

                <button
                  type="button"
                  onClick={() => handleEdit(meal)}
                  aria-label={`Edit ${meal.food_name}`}
                  title="Edit meal"
                >
                  <Edit size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(meal.id)}
                  aria-label={`Delete ${meal.food_name}`}
                  title="Delete meal"
                  className="nutrition-delete-button"
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

export default Nutrition;