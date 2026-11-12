
import { useEffect, useState } from "react";
import {
  Dumbbell,
  Target,
  Bell,
  Activity,
  Flame,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

function Dashboard() {
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [workoutResponse, goalResponse, notificationResponse] =
          await Promise.all([
            api.get("/workouts/"),
            api.get("/goals/"),
            api.get("/notifications/unread"),
          ]);

        setWorkouts(workoutResponse.data);
        setGoals(goalResponse.data);
        setNotifications(notificationResponse.data);
      } catch (error) {
        toast.error(
          error.response?.data?.detail ||
          "Unable to load dashboard information."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const activeGoals = goals.filter(
    (goal) => goal.status === "active"
  );

  const totalDuration = workouts.reduce(
    (total, workout) => total + workout.duration_minutes,
    0
  );

  const totalCalories = workouts.reduce(
    (total, workout) => total + workout.calories_burned,
    0
  );

  const stats = [
    {
      title: "Total Workouts",
      value: workouts.length,
      icon: Dumbbell,
      color: "purple",
    },
    {
      title: "Workout Minutes",
      value: totalDuration,
      icon: Activity,
      color: "blue",
    },
    {
      title: "Calories Burned",
      value: totalCalories,
      icon: Flame,
      color: "orange",
    },
    {
      title: "Active Goals",
      value: activeGoals.length,
      icon: Target,
      color: "green",
    },
  ];

  if (loading) {
    return <div className="loading-message">Loading your dashboard...</div>;
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="section-label">OVERVIEW</p>
          <h1>Fitness Dashboard</h1>
          <p>Track your activity and stay focused on your goals.</p>
        </div>

        <div className="notification-indicator">
          <Bell size={19} />
          <span>{notifications.length} unread</span>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-card" key={stat.title}>
              <div className={`stat-icon ${stat.color}`}>
                <Icon size={23} />
              </div>

              <div>
                <p>{stat.title}</p>
                <h2>{stat.value.toLocaleString()}</h2>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="content-card">
          <div className="card-heading">
            <h2>Recent Workouts</h2>
            <span>{workouts.length} total</span>
          </div>

          {workouts.length === 0 ? (
            <p className="empty-message">
              No workouts yet. Add your first workout!
            </p>
          ) : (
            <div className="data-list">
              {workouts.slice(0, 5).map((workout) => (
                <div className="data-row" key={workout.id}>
                  <div className="list-icon">
                    <Dumbbell size={19} />
                  </div>

                  <div className="data-description">
                    <strong>{workout.name}</strong>
                    <span>
                      {workout.workout_type} · {workout.duration_minutes} minutes
                    </span>
                  </div>

                  <span className="date-label">
                    {workout.workout_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="card-heading">
            <h2>Fitness Goals</h2>
            <span>{activeGoals.length} active</span>
          </div>

          {activeGoals.length === 0 ? (
            <p className="empty-message">
              No active goals. Create a fitness goal to get started!
            </p>
          ) : (
            <div className="data-list">
              {activeGoals.slice(0, 5).map((goal) => {
                const progress = Math.min(
                  100,
                  Math.max(
                    0,
                    (goal.current_value / goal.target_value) * 100
                  )
                );

                return (
                  <div className="goal-item" key={goal.id}>
                    <div className="goal-title">
                      <strong>{goal.title}</strong>
                      <span>{Math.round(progress)}%</span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <small>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
