
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock,
  Flame,
  RefreshCw,
  Scale,
  Target,
  TrendingUp,
  Award,
  Dumbbell,
  LoaderCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./Reports.css";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.message ||
    "Unable to load analytics data."
  );
}

function EmptyChart({ message = "No data available for this period." }) {
  return (
    <div className="analytics-empty">
      <BarChart3 size={30} />
      <p>{message}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, color }) {
  return (
    <article className="analytics-stat-card">
      <div className={`analytics-stat-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div className="analytics-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </article>
  );
}

function BarChart({ data, labelKey, valueKey, valueSuffix = "", color = "purple" }) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => Number(item[valueKey] || 0))
  );

  if (!data.length) return <EmptyChart />;

  return (
    <div className="analytics-bar-chart">
      {data.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const width = Math.max(value > 0 ? 2 : 0, (value / maxValue) * 100);

        return (
          <div className="analytics-bar-row" key={`${item[labelKey]}-${index}`}>
            <div className="analytics-bar-label">
              <span>{item[labelKey]}</span>
              <strong>
                {formatNumber(value, value % 1 ? 1 : 0)}
                {valueSuffix}
              </strong>
            </div>
            <div className="analytics-bar-track">
              <div
                className={`analytics-bar-fill ${color}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, dateKey, valueKey, unit = "" }) {
  const points = useMemo(() => {
    if (!data.length) return [];

    const values = data.map((item) => Number(item[valueKey] || 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    return values.map((value, index) => {
      const x = data.length === 1 ? 50 : 8 + (index / (data.length - 1)) * 84;
      const y = 88 - ((value - min) / range) * 72;

      return { x, y, value, item: data[index] };
    });
  }, [data, valueKey]);

  if (!data.length) return <EmptyChart />;

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="analytics-line-chart">
      <div className="analytics-line-summary">
        <span>{formatNumber(points[0]?.value, 1)}{unit} first</span>
        <span>{formatNumber(points[points.length - 1]?.value, 1)}{unit} latest</span>
      </div>

      <svg
        className="analytics-line-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Progress line chart"
      >
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="5"
            y1={y}
            x2="95"
            y2={y}
            className="analytics-grid-line"
          />
        ))}

        <path d={path} className="analytics-line-path" />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="1.8"
            className="analytics-line-point"
          />
        ))}
      </svg>

      <div className="analytics-line-labels">
        <span>{formatDate(data[0]?.[dateKey])}</span>
        <span>{formatDate(data[data.length - 1]?.[dateKey])}</span>
      </div>
    </div>
  );
}

function Reports() {
  const [period, setPeriod] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [progress, setProgress] = useState([]);
  const [goals, setGoals] = useState([]);
  const [goalSummary, setGoalSummary] = useState(null);

  const [overview, setOverview] = useState(null);
  const [workoutTrends, setWorkoutTrends] = useState([]);
  const [calorieData, setCalorieData] = useState(null);
  const [activityDistribution, setActivityDistribution] = useState([]);
  const [weightData, setWeightData] = useState(null);
  const [goalPerformance, setGoalPerformance] = useState(null);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    if (
      customStartDate &&
      customEndDate &&
      customStartDate > customEndDate
    ) {
      toast.error("Start date cannot be later than end date.");
      return;
    }

    if (Boolean(customStartDate) !== Boolean(customEndDate)) {
      toast.error("Please select both start and end dates.");
      return;
    }

    setLoading(true);
    setRefreshing(true);

    const params = customStartDate
      ? {
          start_date: customStartDate,
          end_date: customEndDate,
        }
      : { period };

    const requests = [
      api.get("/reports/summary"),
      api.get("/reports/daily"),
      api.get("/reports/weekly"),
      api.get("/reports/progress"),
      api.get("/reports/goals"),

      api.get("/analytics/overview", { params }),
      api.get("/analytics/workout-trends", { params }),
      api.get("/analytics/calories", { params }),
      api.get("/analytics/activity-distribution", {
        params: customStartDate
          ? {
              start_date: customStartDate,
              end_date: customEndDate,
            }
          : {},
      }),
      api.get("/analytics/weight-progress", {
        params: customStartDate
          ? {
              start_date: customStartDate,
              end_date: customEndDate,
            }
          : {},
      }),
      api.get("/analytics/goal-performance"),
      api.get("/analytics/insights"),
    ];

    try {
      const results = await Promise.allSettled(requests);

      const [
        summaryResult,
        dailyResult,
        weeklyResult,
        progressResult,
        goalsResult,
        overviewResult,
        trendsResult,
        caloriesResult,
        distributionResult,
        weightResult,
        goalPerformanceResult,
        insightsResult,
      ] = results;

      const assignResult = (result, setter, transform = (value) => value) => {
        if (result.status === "fulfilled") {
          setter(transform(result.value.data));
          return true;
        }
        return false;
      };

      const reportSuccess = [
        assignResult(summaryResult, setSummary),
        assignResult(dailyResult, setDaily, (data) => data.daily_reports || []),
        assignResult(weeklyResult, setWeekly, (data) => data.weekly_reports || []),
        assignResult(progressResult, setProgress, (data) => data.progress_reports || []),
        assignResult(goalsResult, (data) => {
          setGoals(data.goals || []);
          setGoalSummary(data.goal_summary || null);
        }),
      ];

      const analyticsSuccess = [
        assignResult(overviewResult, setOverview),
        assignResult(trendsResult, setWorkoutTrends, (data) => data.workout_trends || []),
        assignResult(caloriesResult, setCalorieData),
        assignResult(distributionResult, setActivityDistribution, (data) => data.activity_distribution || []),
        assignResult(weightResult, setWeightData),
        assignResult(goalPerformanceResult, setGoalPerformance),
        assignResult(insightsResult, setInsights),
      ];

      if (!reportSuccess.some(Boolean) && !analyticsSuccess.some(Boolean)) {
        throw results.find((result) => result.status === "rejected")?.reason;
      }

      if (reportSuccess.some((value) => !value) || analyticsSuccess.some((value) => !value)) {
        toast.warning("Some report sections could not be loaded. Please refresh or check the API.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    Promise.resolve().then(fetchReports);
  }, [fetchReports]);

  const fitness = summary?.fitness_summary || {};
  const workoutAnalytics = overview?.workout_analytics || {};
  const progressAnalytics = overview?.progress_analytics || {};
  const goalStats = goalPerformance?.goal_summary || {};

  const totalWorkouts = Number(
    workoutAnalytics.total_workouts ?? fitness.total_workouts ?? 0
  );

  const totalMinutes = Number(
    workoutAnalytics.total_duration_minutes ??
      fitness.total_workout_duration_minutes ??
      0
  );

  const totalCalories = Number(
    workoutAnalytics.total_calories_burned ??
      fitness.total_calories_burned ??
      0
  );

  const latestWeight =
    weightData?.latest_weight_kg ??
    progressAnalytics.latest_weight_kg ??
    (progress.length > 0 ? progress[0].weight_kg : null);

  const trendChartData = workoutTrends.map((item) => ({
    ...item,
    chart_date: formatDate(item.date),
  }));

  const calorieChartData = (calorieData?.daily_calories || []).filter(
    (item) => Number(item.calories_burned || 0) > 0
  );

  const maxTrendWorkouts = Math.max(
    1,
    ...trendChartData.map((item) => Number(item.workout_count || 0))
  );

  const maxCalorieValue = Math.max(
    1,
    ...calorieChartData.map((item) => Number(item.calories_burned || 0))
  );

  const weightChange = weightData?.weight_change_kg ?? progressAnalytics.weight_change_kg;
  const hasWeightChange = weightChange !== null && weightChange !== undefined;

  return (
    <div className="page-content advanced-reports-page">
      <div className="page-heading analytics-page-heading">
        <div>
          <p className="section-label">FITNESS INSIGHTS</p>
          <h1>Reports & Analytics</h1>
          <p className="page-description">
            Track your performance, workout consistency, calories, weight,
            and fitness goals.
          </p>
        </div>

        <button
          className="primary-button reports-refresh-button"
          onClick={fetchReports}
          disabled={refreshing}
        >
          <RefreshCw size={17} className={refreshing ? "analytics-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Reports"}
        </button>
      </div>

      <section className="analytics-filter-card">
        <div className="analytics-filter-heading">
          <CalendarDays size={19} />
          <div>
            <strong>Analytics Period</strong>
            <span>Choose the date range for your performance reports.</span>
          </div>
        </div>

        <div className="analytics-filter-controls">
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setCustomStartDate("");
              setCustomEndDate("");
            }}
            aria-label="Analytics period"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 365 days</option>
          </select>

          <span className="analytics-filter-or">or custom range</span>

          <input
            type="date"
            value={customStartDate}
            onChange={(event) => setCustomStartDate(event.target.value)}
            aria-label="Start date"
          />

          <span className="analytics-date-separator">to</span>

          <input
            type="date"
            value={customEndDate}
            onChange={(event) => setCustomEndDate(event.target.value)}
            aria-label="End date"
          />

          <button
            type="button"
            className="analytics-apply-button"
            onClick={fetchReports}
            disabled={refreshing}
          >
            Apply
          </button>
        </div>
      </section>

      {loading ? (
        <div className="analytics-loading-card">
          <LoaderCircle size={30} className="analytics-spin" />
          <p>Loading your advanced analytics...</p>
        </div>
      ) : (
        <>
          <section className="analytics-stats-grid">
            <StatCard
              icon={Activity}
              label="Total Workouts"
              value={formatNumber(totalWorkouts)}
              note={`${workoutAnalytics.completed_timer_sessions || 0} timer sessions`}
              color="purple"
            />
            <StatCard
              icon={Clock}
              label="Workout Duration"
              value={`${formatNumber(totalMinutes, 1)} min`}
              note={`Average ${formatNumber(workoutAnalytics.average_duration_minutes, 1)} min per workout`}
              color="blue"
            />
            <StatCard
              icon={Flame}
              label="Calories Burned"
              value={formatNumber(totalCalories, 1)}
              note="Recorded workout calories"
              color="orange"
            />
            <StatCard
              icon={Scale}
              label="Latest Weight"
              value={latestWeight != null ? `${formatNumber(latestWeight, 1)} kg` : "--"}
              note={
                hasWeightChange
                  ? `Change: ${formatNumber(weightChange, 1)} kg`
                  : "No weight change data"
              }
              color="green"
            />
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">PERFORMANCE</span>
                <h2>Workout Trends</h2>
                <p>Daily workout frequency, duration, and calories.</p>
              </div>
              <div className="analytics-heading-icon purple">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="analytics-two-column">
              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <h3>Workout Frequency</h3>
                    <p>Workouts completed each day</p>
                  </div>
                  <Dumbbell size={19} />
                </div>

                {trendChartData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div className="analytics-daily-chart">
                    {trendChartData.map((item, index) => {
                      const count = Number(item.workout_count || 0);
                      const height = Math.max(
                        count > 0 ? 5 : 2,
                        (count / maxTrendWorkouts) * 100
                      );

                      return (
                        <div
                          className="analytics-daily-column"
                          key={`${item.date}-${index}`}
                          title={`${formatDate(item.date)}: ${count} workouts`}
                        >
                          <strong>{count || ""}</strong>
                          <div className="analytics-daily-bar-area">
                            <div
                              className="analytics-daily-bar"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          {index % Math.max(1, Math.ceil(trendChartData.length / 7)) === 0 && (
                            <span>{String(item.date).slice(5)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <h3>Workout Duration</h3>
                    <p>Daily workout minutes</p>
                  </div>
                  <Clock size={19} />
                </div>

                <BarChart
                  data={trendChartData}
                  labelKey="chart_date"
                  valueKey="duration_minutes"
                  valueSuffix=" min"
                  color="blue"
                />
              </article>
            </div>
          </section>

          <section className="analytics-two-column analytics-section">
            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Calories Burned</h3>
                  <p>
                    Total: {formatNumber(calorieData?.total_calories_burned, 1)} kcal
                  </p>
                </div>
                <Flame size={20} />
              </div>

              {calorieChartData.length === 0 ? (
                <EmptyChart message="No calorie records available for this period." />
              ) : (
                <>
                  <div className="analytics-calorie-highlight">
                    <strong>
                      {formatNumber(calorieData?.average_daily_calories, 1)}
                    </strong>
                    <span>Average daily calories</span>
                  </div>

                  <div className="analytics-calorie-bars">
                    {calorieChartData.map((item, index) => (
                      <div
                        className="analytics-calorie-row"
                        key={`${item.date}-${index}`}
                        title={`${formatDate(item.date)}: ${item.calories_burned} kcal`}
                      >
                        <span>{String(item.date).slice(5)}</span>
                        <div className="analytics-calorie-track">
                          <div
                            className="analytics-calorie-fill"
                            style={{
                              width: `${Math.max(
                                2,
                                (Number(item.calories_burned || 0) /
                                  maxCalorieValue) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                        <strong>{formatNumber(item.calories_burned)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>

            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Activity Distribution</h3>
                  <p>
                    {activityDistribution.length} activity types recorded
                  </p>
                </div>
                <Activity size={20} />
              </div>

              {activityDistribution.length === 0 ? (
                <EmptyChart message="No workout activity types recorded yet." />
              ) : (
                <div className="analytics-distribution-list">
                  {activityDistribution.map((item) => {
                    const percentage =
                      activityDistribution.reduce(
                        (sum, value) => sum + Number(value.workout_count || 0),
                        0
                      ) > 0
                        ? (Number(item.workout_count || 0) /
                            activityDistribution.reduce(
                              (sum, value) => sum + Number(value.workout_count || 0),
                              0
                            )) *
                          100
                        : 0;

                    return (
                      <div
                        className="analytics-distribution-item"
                        key={item.activity_type}
                      >
                        <div className="analytics-distribution-top">
                          <strong>{item.activity_type}</strong>
                          <span>
                            {item.workout_count} workouts · {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="analytics-distribution-track">
                          <div
                            className="analytics-distribution-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <small>
                          {formatNumber(item.total_duration_minutes, 1)} min ·{" "}
                          {formatNumber(item.total_calories_burned, 1)} kcal
                        </small>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">BODY PROGRESS</span>
                <h2>Weight Progress</h2>
                <p>Review your recorded weight history over time.</p>
              </div>
              <div className="analytics-heading-icon green">
                <Scale size={22} />
              </div>
            </div>

            <article className="analytics-panel">
              <div className="analytics-weight-summary">
                <div>
                  <span>First recorded weight</span>
                  <strong>
                    {weightData?.first_weight_kg != null
                      ? `${formatNumber(weightData.first_weight_kg, 1)} kg`
                      : "--"}
                  </strong>
                </div>
                <div>
                  <span>Latest recorded weight</span>
                  <strong>
                    {weightData?.latest_weight_kg != null
                      ? `${formatNumber(weightData.latest_weight_kg, 1)} kg`
                      : "--"}
                  </strong>
                </div>
                <div>
                  <span>Weight change</span>
                  <strong>
                    {hasWeightChange
                      ? `${weightChange > 0 ? "+" : ""}${formatNumber(weightChange, 1)} kg`
                      : "--"}
                  </strong>
                </div>
                <div>
                  <span>Weight records</span>
                  <strong>{weightData?.total_weight_records || 0}</strong>
                </div>
              </div>

              <LineChart
                data={weightData?.weight_history || []}
                dateKey="date"
                valueKey="weight_kg"
                unit=" kg"
              />
            </article>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">GOAL TRACKING</span>
                <h2>Fitness Goal Performance</h2>
                <p>Monitor your active goals and completion progress.</p>
              </div>
              <div className="analytics-heading-icon orange">
                <Target size={22} />
              </div>
            </div>

            <div className="analytics-goal-summary-grid">
              <div className="analytics-goal-summary">
                <span>Total Goals</span>
                <strong>{goalStats.total_goals ?? goalSummary?.total_goals ?? 0}</strong>
              </div>
              <div className="analytics-goal-summary">
                <span>Active Goals</span>
                <strong>{goalStats.active_goals ?? goalSummary?.active_goals ?? 0}</strong>
              </div>
              <div className="analytics-goal-summary">
                <span>Completed Goals</span>
                <strong>{goalStats.completed_goals ?? goalSummary?.completed_goals ?? 0}</strong>
              </div>
              <div className="analytics-goal-summary">
                <span>Completion Rate</span>
                <strong>
                  {formatNumber(
                    goalStats.completion_rate_percentage ??
                      goalSummary?.completion_rate_percentage,
                    1
                  )}%
                </strong>
              </div>
            </div>

            <div className="analytics-goal-list">
              {(goalPerformance?.goal_performance || []).length === 0 ? (
                <EmptyChart message="Create a fitness goal to view its performance here." />
              ) : (
                goalPerformance.goal_performance.map((goal) => (
                  <article className="analytics-goal-card" key={goal.id}>
                    <div className="analytics-goal-card-top">
                      <div>
                        <h3>{goal.title}</h3>
                        <span>
                          {goal.goal_type} · {goal.status}
                        </span>
                      </div>
                      <strong>{formatNumber(goal.completion_percentage, 1)}%</strong>
                    </div>

                    <div className="analytics-goal-progress-track">
                      <div
                        className="analytics-goal-progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, Number(goal.completion_percentage || 0))
                          )}%`,
                        }}
                      />
                    </div>

                    <p>
                      {formatNumber(goal.current_value, 1)} /{" "}
                      {formatNumber(goal.target_value, 1)} {goal.unit || ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">PERSONALIZED FEEDBACK</span>
                <h2>Fitness Insights</h2>
                <p>Compare your latest seven days with the previous seven days.</p>
              </div>
              <div className="analytics-heading-icon purple">
                <Lightbulb size={22} />
              </div>
            </div>

            <div className="analytics-insights-grid">
              <article className="analytics-insight-card">
                <div className="analytics-insight-icon">
                  <Dumbbell size={20} />
                </div>
                <span>This week</span>
                <strong>{insights?.current_week?.workouts ?? 0} workouts</strong>
                <small>
                  {formatNumber(insights?.current_week?.duration_minutes, 1)} minutes
                </small>
              </article>

              <article className="analytics-insight-card">
                <div className="analytics-insight-icon blue">
                  <CalendarDays size={20} />
                </div>
                <span>Previous week</span>
                <strong>{insights?.previous_week?.workouts ?? 0} workouts</strong>
                <small>
                  {formatNumber(insights?.previous_week?.duration_minutes, 1)} minutes
                </small>
              </article>

              <article className="analytics-insight-card">
                <div className="analytics-insight-icon orange">
                  <Flame size={20} />
                </div>
                <span>Weekly calories</span>
                <strong>
                  {formatNumber(insights?.current_week?.calories_burned, 1)} kcal
                </strong>
                <small>
                  Previous: {formatNumber(insights?.previous_week?.calories_burned, 1)} kcal
                </small>
              </article>

              <article className="analytics-insight-card">
                <div className="analytics-insight-icon green">
                  <Award size={20} />
                </div>
                <span>Goals completed</span>
                <strong>{insights?.completed_goals ?? 0}</strong>
                <small>Completed fitness goals</small>
              </article>
            </div>

            <div className="analytics-insight-messages">
              {(insights?.insights || []).length === 0 ? (
                <p className="analytics-empty-message">
                  Your fitness insights will appear here as you record activities.
                </p>
              ) : (
                insights.insights.map((message, index) => (
                  <div className="analytics-insight-message" key={index}>
                    <Lightbulb size={17} />
                    <p>{message}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">EXISTING REPORTS</span>
                <h2>Daily Activity Report</h2>
                <p>Your existing daily workout, nutrition, water, and progress records.</p>
              </div>
              <div className="analytics-heading-icon blue">
                <CalendarDays size={22} />
              </div>
            </div>

            {daily.length === 0 ? (
              <div className="analytics-panel">
                <EmptyChart message="No daily activity records available." />
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="workout-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Workouts</th>
                      <th>Duration</th>
                      <th>Calories Burned</th>
                      <th>Calories Consumed</th>
                      <th>Water Intake</th>
                      <th>Exercise</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((item, index) => (
                      <tr key={item.date || index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.workout_count ?? 0}</td>
                        <td>{item.workout_duration_minutes ?? 0} min</td>
                        <td>{item.calories_burned ?? 0} kcal</td>
                        <td>{item.calories_consumed ?? 0} kcal</td>
                        <td>{item.water_intake_ml ?? 0} ml</td>
                        <td>{item.progress_exercise_minutes ?? 0} min</td>
                        <td>
                          {item.weight_kg != null ? `${item.weight_kg} kg` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="analytics-two-column analytics-section">
            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Existing Weekly Reports</h3>
                  <p>{weekly.length} weekly records</p>
                </div>
                <BarChart3 size={20} />
              </div>

              {weekly.length === 0 ? (
                <EmptyChart message="No weekly report records available." />
              ) : (
                <div className="analytics-existing-weekly">
                  {weekly.map((item, index) => (
                    <div className="analytics-existing-week-row" key={item.week || index}>
                      <div>
                        <strong>{item.week || `Week ${index + 1}`}</strong>
                        <span>
                          {formatDate(item.week_start)} – {formatDate(item.week_end)}
                        </span>
                      </div>
                      <strong>
                        {formatNumber(item.total_duration_minutes)} min
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Existing Goal Records</h3>
                  <p>{goals.length} goal records</p>
                </div>
                <Target size={20} />
              </div>

              {goals.length === 0 ? (
                <EmptyChart message="No goal records available." />
              ) : (
                <div className="analytics-existing-weekly">
                  {goals.map((goal) => (
                    <div className="analytics-existing-week-row" key={goal.id}>
                      <div>
                        <strong>{goal.title || goal.name || "Fitness Goal"}</strong>
                        <span>{goal.status || goal.goal_status || "Goal"}</span>
                      </div>
                      <strong>
                        {goal.target_value != null
                          ? `Target: ${goal.target_value}`
                          : ""}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <span className="analytics-section-kicker">PROGRESS HISTORY</span>
                <h2>Weight & Progress Records</h2>
                <p>Review your previously recorded daily progress entries.</p>
              </div>
              <div className="analytics-heading-icon green">
                <Scale size={22} />
              </div>
            </div>

            {progress.length === 0 ? (
              <div className="analytics-panel">
                <EmptyChart message="No progress history available." />
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="workout-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Weight</th>
                      <th>Calories Consumed</th>
                      <th>Water Intake</th>
                      <th>Exercise</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{formatDate(item.date)}</td>
                        <td>
                          {item.weight_kg != null ? `${item.weight_kg} kg` : "-"}
                        </td>
                        <td>{item.calories_consumed ?? 0} kcal</td>
                        <td>{item.water_intake_ml ?? 0} ml</td>
                        <td>{item.exercise_minutes ?? 0} min</td>
                        <td>{item.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Reports;
