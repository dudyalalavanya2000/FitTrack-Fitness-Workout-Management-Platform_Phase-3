import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Apple,
  HeartPulse,
  Link2,
  Unlink,
  RefreshCw,
  Footprints,
  Flame,
  Clock,
  Route,
  Upload,
  LoaderCircle,
  CheckCircle2,
  Smartphone,
  CalendarDays,
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../services/api";
import "./HealthIntegrations.css";

const PROVIDERS = [
  {
    value: "health_connect",
    name: "Health Connect",
    description: "Manage Android health activity data.",
    icon: HeartPulse,
    className: "health-connect",
  },
  {
    value: "apple_health",
    name: "Apple Health",
    description: "Manage Apple Health activity data.",
    icon: Apple,
    className: "apple-health",
  },
];

const initialForm = {
  provider: "health_connect",
  external_id: "",
  activity_type: "walking",
  activity_name: "",
  started_at: "",
  ended_at: "",
  duration_minutes: "",
  steps: "0",
  calories_burned: "0",
  distance_meters: "0",
  source_name: "",
};

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HealthIntegrations() {
  const [integrations, setIntegrations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filterProvider, setFilterProvider] = useState("all");

  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState("");

  const [syncResult, setSyncResult] = useState(null);

  const loadIntegrations = useCallback(async () => {
    try {
      const response = await api.get("/health/integrations");
      setIntegrations(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load health integrations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);

    try {
      const params =
        filterProvider === "all" ? {} : { provider: filterProvider };

      const response = await api.get("/health/activities", { params });
      setActivities(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load imported activities."
      );
    } finally {
      setActivitiesLoading(false);
    }
  }, [filterProvider]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        loadIntegrations();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadIntegrations]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        loadActivities();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadActivities]);

  const getIntegration = (provider) =>
    integrations.find((item) => item.provider === provider);

  const isConnected = (provider) =>
    getIntegration(provider)?.is_connected === true;

  const handleConnect = async (provider) => {
    setConnectingProvider(provider);

    try {
      await api.post("/health/connect", { provider });
      toast.success("Provider registered successfully.");
      await loadIntegrations();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to connect provider."
      );
    } finally {
      setConnectingProvider("");
    }
  };

  const handleDisconnect = async (provider) => {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect this provider?"
    );

    if (!confirmed) return;

    setConnectingProvider(provider);

    try {
      await api.delete(`/health/disconnect/${provider}`);
      toast.success("Provider disconnected successfully.");
      await loadIntegrations();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to disconnect provider."
      );
    } finally {
      setConnectingProvider("");
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSync = async (event) => {
    event.preventDefault();

    if (!isConnected(form.provider)) {
      toast.error("Register this provider before importing activities.");
      return;
    }

    if (!form.external_id.trim()) {
      toast.error("External activity ID is required.");
      return;
    }

    if (!form.started_at) {
      toast.error("Please select the activity start date and time.");
      return;
    }

    if (
      form.ended_at &&
      new Date(form.ended_at) < new Date(form.started_at)
    ) {
      toast.error("End time cannot be earlier than start time.");
      return;
    }

    const activity = {
      external_id: form.external_id.trim(),
      activity_type: form.activity_type,
      activity_name: form.activity_name.trim() || null,
      started_at: new Date(form.started_at).toISOString(),
      ended_at: form.ended_at
        ? new Date(form.ended_at).toISOString()
        : null,
      duration_minutes: Number(form.duration_minutes || 0),
      steps: Number(form.steps || 0),
      calories_burned: Number(form.calories_burned || 0),
      distance_meters: Number(form.distance_meters || 0),
      source_name: form.source_name.trim() || null,
    };

    setSubmitting(true);
    setSyncResult(null);

    try {
      const response = await api.post(
        `/health/sync/${form.provider}`,
        [activity]
      );

      setSyncResult(response.data);

      if (response.data.imported_count > 0) {
        toast.success("Activity imported successfully!");
      } else {
        toast.info("Activity was skipped, possibly because it already exists.");
      }

      setForm((previous) => ({
        ...initialForm,
        provider: previous.provider,
      }));

      await loadActivities();
      await loadIntegrations();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to import health activity."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const connectedCount = integrations.filter(
    (item) => item.is_connected
  ).length;

  const totalSteps = activities.reduce(
    (total, item) => total + (item.steps || 0),
    0
  );

  const totalCalories = activities.reduce(
    (total, item) => total + (item.calories_burned || 0),
    0
  );

  const totalDuration = activities.reduce(
    (total, item) => total + (item.duration_minutes || 0),
    0
  );

  if (loading) {
    return (
      <div className="health-loading">
        <LoaderCircle className="health-spinner" size={30} />
        <p>Loading health integrations...</p>
      </div>
    );
  }

  return (
    <div className="health-page">
      <div className="health-page-heading">
        <div>
          <span className="health-eyebrow">FITNESS CONNECTIVITY</span>
          <h1>Health Integrations</h1>
          <p>
            Manage health providers and import your activity information
            into FitTrack.
          </p>
        </div>

        <div className="health-heading-icon">
          <HeartPulse size={28} />
        </div>
      </div>

      <section className="health-summary-grid">
        <div className="health-summary-card">
          <div className="health-summary-icon connected-icon">
            <Link2 size={21} />
          </div>
          <div>
            <strong>{connectedCount}</strong>
            <span>Connected providers</span>
          </div>
        </div>

        <div className="health-summary-card">
          <div className="health-summary-icon steps-icon">
            <Footprints size={21} />
          </div>
          <div>
            <strong>{totalSteps.toLocaleString()}</strong>
            <span>Imported steps</span>
          </div>
        </div>

        <div className="health-summary-card">
          <div className="health-summary-icon calories-icon">
            <Flame size={21} />
          </div>
          <div>
            <strong>{totalCalories.toFixed(1)}</strong>
            <span>Imported calories</span>
          </div>
        </div>

        <div className="health-summary-card">
          <div className="health-summary-icon duration-icon">
            <Clock size={21} />
          </div>
          <div>
            <strong>{totalDuration.toFixed(1)}</strong>
            <span>Activity minutes</span>
          </div>
        </div>
      </section>

      <section className="health-provider-section">
        <div className="health-section-heading">
          <div>
            <h2>Health Providers</h2>
            <p>Register or disconnect a supported provider.</p>
          </div>

          <button
            type="button"
            className="health-refresh-button"
            onClick={loadIntegrations}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="health-provider-grid">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const connected = isConnected(provider.value);
            const integration = getIntegration(provider.value);
            const isBusy = connectingProvider === provider.value;

            return (
              <article
                className={`health-provider-card ${provider.className}`}
                key={provider.value}
              >
                <div className="provider-card-top">
                  <div className="provider-icon">
                    <Icon size={27} />
                  </div>

                  <span
                    className={`provider-status ${
                      connected ? "provider-connected" : "provider-disconnected"
                    }`}
                  >
                    {connected ? "Registered" : "Not registered"}
                  </span>
                </div>

                <h3>{provider.name}</h3>
                <p>{provider.description}</p>

                <div className="provider-last-sync">
                  <CalendarDays size={15} />
                  <span>
                    Last import:{" "}
                    {integration?.last_synced_at
                      ? formatDate(integration.last_synced_at)
                      : "Never"}
                  </span>
                </div>

                {connected ? (
                  <button
                    type="button"
                    className="provider-action disconnect-action"
                    onClick={() => handleDisconnect(provider.value)}
                    disabled={isBusy}
                  >
                    <Unlink size={16} />
                    {isBusy ? "Please wait..." : "Disconnect"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="provider-action connect-action"
                    onClick={() => handleConnect(provider.value)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <LoaderCircle className="health-spinner" size={16} />
                    ) : (
                      <Link2 size={16} />
                    )}
                    {isBusy ? "Registering..." : "Register Provider"}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <div className="health-notice">
          <Smartphone size={19} />
          <p>
            Provider registration enables FitTrack to accept activity records.
            Direct synchronization with Android Health Connect or Apple
            HealthKit requires a separate native mobile integration and
            device permissions.
          </p>
        </div>
      </section>

      <section className="health-sync-card">
        <div className="health-section-heading">
          <div className="health-section-title">
            <div className="health-section-icon">
              <Upload size={21} />
            </div>
            <div>
              <h2>Import Activity Data</h2>
              <p>Submit an activity record to test the sync API.</p>
            </div>
          </div>
        </div>

        <form className="health-form" onSubmit={handleSync}>
          <div className="health-form-row">
            <div className="health-form-group">
              <label htmlFor="health-provider">Health Provider</label>
              <select
                id="health-provider"
                name="provider"
                value={form.provider}
                onChange={handleFormChange}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="health-form-group">
              <label htmlFor="external-id">External Activity ID</label>
              <input
                id="external-id"
                name="external_id"
                value={form.external_id}
                onChange={handleFormChange}
                placeholder="Example: activity-001"
                maxLength={150}
                required
              />
            </div>
          </div>

          <div className="health-form-row">
            <div className="health-form-group">
              <label htmlFor="activity-type">Activity Type</label>
              <select
                id="activity-type"
                name="activity_type"
                value={form.activity_type}
                onChange={handleFormChange}
              >
                <option value="walking">Walking</option>
                <option value="running">Running</option>
                <option value="cycling">Cycling</option>
                <option value="cardio">Cardio</option>
                <option value="strength">Strength</option>
                <option value="yoga">Yoga</option>
              </select>
            </div>

            <div className="health-form-group">
              <label htmlFor="activity-name">Activity Name</label>
              <input
                id="activity-name"
                name="activity_name"
                value={form.activity_name}
                onChange={handleFormChange}
                placeholder="Example: Morning Walk"
                maxLength={150}
              />
            </div>
          </div>

          <div className="health-form-row">
            <div className="health-form-group">
              <label htmlFor="started-at">Started At</label>
              <input
                id="started-at"
                type="datetime-local"
                name="started_at"
                value={form.started_at}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="health-form-group">
              <label htmlFor="ended-at">Ended At (Optional)</label>
              <input
                id="ended-at"
                type="datetime-local"
                name="ended_at"
                value={form.ended_at}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="health-form-row health-four-columns">
            <div className="health-form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <input
                id="duration"
                type="number"
                name="duration_minutes"
                value={form.duration_minutes}
                onChange={handleFormChange}
                min="0"
                step="0.1"
                placeholder="30"
              />
            </div>

            <div className="health-form-group">
              <label htmlFor="steps">Steps</label>
              <input
                id="steps"
                type="number"
                name="steps"
                value={form.steps}
                onChange={handleFormChange}
                min="0"
              />
            </div>

            <div className="health-form-group">
              <label htmlFor="calories">Calories</label>
              <input
                id="calories"
                type="number"
                name="calories_burned"
                value={form.calories_burned}
                onChange={handleFormChange}
                min="0"
                step="0.1"
              />
            </div>

            <div className="health-form-group">
              <label htmlFor="distance">Distance (meters)</label>
              <input
                id="distance"
                type="number"
                name="distance_meters"
                value={form.distance_meters}
                onChange={handleFormChange}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="health-form-group">
            <label htmlFor="source-name">Source Name (Optional)</label>
            <input
              id="source-name"
              name="source_name"
              value={form.source_name}
              onChange={handleFormChange}
              placeholder="Example: Android Health Connect"
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            className="health-submit-button"
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle className="health-spinner" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {submitting ? "Importing..." : "Import Activity"}
          </button>
        </form>

        {syncResult && (
          <div className="health-sync-result">
            <CheckCircle2 size={20} />
            <div>
              <strong>{syncResult.message}</strong>
              <p>
                Imported: {syncResult.imported_count} · Skipped:{" "}
                {syncResult.skipped_count}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="health-activities-card">
        <div className="health-section-heading">
          <div>
            <h2>Imported Activities</h2>
            <p>Review activities stored in your FitTrack account.</p>
          </div>

          <select
            className="health-filter"
            value={filterProvider}
            onChange={(event) => setFilterProvider(event.target.value)}
            aria-label="Filter activities by provider"
          >
            <option value="all">All Providers</option>
            <option value="health_connect">Health Connect</option>
            <option value="apple_health">Apple Health</option>
          </select>
        </div>

        {activitiesLoading ? (
          <div className="health-empty">
            <LoaderCircle className="health-spinner" size={25} />
            <p>Loading imported activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="health-empty">
            <Activity size={34} />
            <h3>No imported activities yet</h3>
            <p>Import an activity record to see it listed here.</p>
          </div>
        ) : (
          <div className="health-activity-list">
            {activities.map((activity) => (
              <article className="health-activity-item" key={activity.id}>
                <div className="health-activity-icon">
                  <Activity size={21} />
                </div>

                <div className="health-activity-main">
                  <h3>
                    {activity.activity_name ||
                      activity.activity_type}
                  </h3>
                  <p>
                    {activity.activity_type} ·{" "}
                    {activity.provider.replace("_", " ")}
                  </p>
                  <span>{formatDate(activity.started_at)}</span>
                </div>

                <div className="health-activity-metrics">
                  <span>
                    <Clock size={14} />
                    {Number(activity.duration_minutes || 0).toFixed(1)} min
                  </span>
                  <span>
                    <Footprints size={14} />
                    {Number(activity.steps || 0).toLocaleString()} steps
                  </span>
                  <span>
                    <Flame size={14} />
                    {Number(activity.calories_burned || 0).toFixed(1)} kcal
                  </span>
                  <span>
                    <Route size={14} />
                    {Number(activity.distance_meters || 0).toFixed(0)} m
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HealthIntegrations;