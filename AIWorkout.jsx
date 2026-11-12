
import { useState } from "react";
import {
  Sparkles,
  Dumbbell,
  Clock,
  Repeat,
  Timer,
  ShieldCheck,
  Target,
  Zap,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./AIWorkout.css";

const initialForm = {
  fitness_goal: "general_fitness",
  fitness_level: "beginner",
  equipment: "no_equipment",
  duration_minutes: 30,
};

const goalLabels = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  endurance: "Endurance",
  general_fitness: "General Fitness",
};

const levelLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const equipmentLabels = {
  no_equipment: "No Equipment",
  dumbbells: "Dumbbells",
  gym: "Gym",
};

function AIWorkout() {
  const [form, setForm] = useState(initialForm);
  const [suggestions, setSuggestions] = useState([]);
  const [recommendationType, setRecommendationType] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "duration_minutes" ? Number(value) : value,
    }));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setSuggestions([]);
      setHasGenerated(false);

      const response = await api.post(
        "/ai-workouts/suggestions",
        {
          fitness_goal: form.fitness_goal,
          fitness_level: form.fitness_level,
          equipment: form.equipment,
          duration_minutes: form.duration_minutes,
        }
      );

      setSuggestions(response.data.suggestions || []);
      setRecommendationType(
        response.data.recommendation_type || ""
      );
      setHasGenerated(true);

      if (response.data.suggestions?.length) {
        toast.success("Your workout suggestions are ready!");
      } else {
        toast.info("No workout suggestions were returned.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to generate workout suggestions."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setSuggestions([]);
    setRecommendationType("");
    setHasGenerated(false);
  };

  return (
    <div className="ai-workout-page">
      <div className="ai-workout-header">
        <div>
          <span className="ai-workout-eyebrow">
            PERSONALIZED FITNESS
          </span>
          <h1>AI Workout Suggestions</h1>
          <p>
            Discover workout routines based on your fitness goals,
            experience and available equipment.
          </p>
        </div>

        <div className="ai-workout-header-icon">
          <Sparkles size={32} />
        </div>
      </div>

      <section className="ai-workout-form-card">
        <div className="ai-workout-section-heading">
          <div className="ai-workout-heading-icon">
            <Target size={21} />
          </div>
          <div>
            <h2>Customize Your Workout</h2>
            <p>Tell us about your fitness preferences.</p>
          </div>
        </div>

        <form onSubmit={handleGenerate}>
          <div className="ai-workout-form-grid">
            <div className="ai-workout-field">
              <label htmlFor="fitness_goal">Fitness Goal</label>
              <select
                id="fitness_goal"
                name="fitness_goal"
                value={form.fitness_goal}
                onChange={handleChange}
              >
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance</option>
                <option value="general_fitness">General Fitness</option>
              </select>
            </div>

            <div className="ai-workout-field">
              <label htmlFor="fitness_level">Fitness Level</label>
              <select
                id="fitness_level"
                name="fitness_level"
                value={form.fitness_level}
                onChange={handleChange}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="ai-workout-field">
              <label htmlFor="equipment">Available Equipment</label>
              <select
                id="equipment"
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
              >
                <option value="no_equipment">No Equipment</option>
                <option value="dumbbells">Dumbbells</option>
                <option value="gym">Gym Equipment</option>
              </select>
            </div>

            <div className="ai-workout-field">
              <label htmlFor="duration_minutes">
                Workout Duration
              </label>
              <select
                id="duration_minutes"
                name="duration_minutes"
                value={form.duration_minutes}
                onChange={handleChange}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>
          </div>

          <div className="ai-workout-form-actions">
            <button
              type="button"
              className="ai-workout-reset-button"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>

            <button
              type="submit"
              className="ai-workout-generate-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={19} className="ai-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={19} />
                  Generate Suggestions
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {loading && (
        <div className="ai-workout-loading">
          <LoaderCircle size={30} className="ai-spin" />
          <p>Preparing your personalized workouts...</p>
        </div>
      )}

      {hasGenerated && !loading && (
        <section className="ai-workout-results">
          <div className="ai-workout-results-heading">
            <div>
              <span className="ai-workout-eyebrow">
                YOUR RECOMMENDATIONS
              </span>
              <h2>Recommended Workouts</h2>
              <p>
                Three workout variations based on your preferences.
              </p>
            </div>

            <span className="ai-workout-result-count">
              {suggestions.length} suggestions
            </span>
          </div>

          {suggestions.length === 0 ? (
            <div className="ai-workout-empty">
              No suggestions are available. Try generating again.
            </div>
          ) : (
            <div className="ai-workout-suggestion-grid">
              {suggestions.map((suggestion, index) => (
                <article
                  className="ai-workout-suggestion-card"
                  key={`${suggestion.title}-${index}`}
                >
                  <div className="ai-workout-card-top">
                    <div className="ai-workout-card-icon">
                      <Dumbbell size={23} />
                    </div>
                    <span className="ai-workout-variation">
                      OPTION {index + 1}
                    </span>
                  </div>

                  <h3>{suggestion.title}</h3>
                  <p className="ai-workout-description">
                    {suggestion.description}
                  </p>

                  <div className="ai-workout-meta">
                    <span>
                      <Clock size={15} />
                      {suggestion.total_duration_minutes} min
                    </span>
                    <span>
                      <Zap size={15} />
                      {levelLabels[suggestion.fitness_level] ||
                        suggestion.fitness_level}
                    </span>
                  </div>

                  <div className="ai-workout-tags">
                    <span>
                      {goalLabels[suggestion.fitness_goal] ||
                        suggestion.fitness_goal}
                    </span>
                    <span>
                      {equipmentLabels[suggestion.equipment] ||
                        suggestion.equipment}
                    </span>
                  </div>

                  <div className="ai-workout-exercises-heading">
                    <h4>Exercise Plan</h4>
                    <span>
                      {suggestion.exercises?.length || 0} exercises
                    </span>
                  </div>

                  <div className="ai-workout-exercise-list">
                    {suggestion.exercises?.map((exercise, exerciseIndex) => (
                      <div
                        className="ai-workout-exercise"
                        key={`${exercise.name}-${exerciseIndex}`}
                      >
                        <div className="ai-workout-exercise-number">
                          {exerciseIndex + 1}
                        </div>

                        <div className="ai-workout-exercise-content">
                          <div className="ai-workout-exercise-title">
                            <strong>{exercise.name}</strong>
                            <span>{exercise.category}</span>
                          </div>

                          <div className="ai-workout-exercise-stats">
                            <span>
                              <Repeat size={13} />
                              {exercise.sets} sets
                            </span>
                            <span>
                              {exercise.reps} reps
                            </span>
                            <span>
                              <Timer size={13} />
                              {exercise.rest_seconds}s rest
                            </span>
                            <span>
                              <Clock size={13} />
                              {exercise.duration_minutes} min
                            </span>
                          </div>

                          <p>{exercise.instructions}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ai-workout-safety">
                    <ShieldCheck size={19} />
                    <div>
                      <strong>Safety Tip</strong>
                      <p>{suggestion.safety_tip}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {recommendationType && (
            <p className="ai-workout-engine-note">
              <CheckCircle2 size={16} />
              {recommendationType}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default AIWorkout;
