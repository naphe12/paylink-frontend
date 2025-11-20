import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import api from "@/services/api";

const TOPICS = [
  { id: "all", label: "Tout" },
  { id: "agent_created", label: "Agents" },
  { id: "aml_high", label: "AML" },
  { id: "mobilemoney_failed", label: "Mobile money" },
  { id: "kyc_reset", label: "KYC" },
];

const TOPIC_LABELS = {
  agent_created: "Nouveaux agents",
  aml_high: "Alertes AML",
  mobilemoney_failed: "Mobile money",
  kyc_reset: "KYC",
};

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL || "ws://127.0.0.1:8000";

const SEVERITY_STYLE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SecurityDashboard() {
  const [events, setEvents] = useState([]);
  const [activeTopic, setActiveTopic] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await api.getAdminNotifications();
      setEvents(data);
    } catch (err) {
      setHistoryError(err.message || "Chargement impossible");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setConnectionStatus("unauthorized");
      return;
    }

    const params = new URLSearchParams({
      token,
      topics: TOPICS.filter((t) => t.id !== "all")
        .map((t) => t.id)
        .join(","),
    });

    const ws = new WebSocket(`${WS_BASE}/ws/admin?${params.toString()}`);
    ws.onopen = () => setConnectionStatus("connected");
    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setEvents((prev) => {
          const withoutDuplicate = prev.filter((ev) => ev.id !== payload.id);
          return [payload, ...withoutDuplicate].slice(0, 200);
        });
      } catch (err) {
        console.error("WS admin parse error", err);
      }
    };

    return () => ws.close();
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeTopic === "all") return events;
    return events.filter((evt) => evt.topic === activeTopic);
  }, [events, activeTopic]);

  const stats = useMemo(() => {
    const base = {
      total: events.length,
      agent_created: 0,
      aml_high: 0,
      mobilemoney_failed: 0,
      kyc_reset: 0,
    };
    events.forEach((evt) => {
      if (evt.topic && base[evt.topic] !== undefined) {
        base[evt.topic] += 1;
      }
    });
    return base;
  }, [events]);

  const statusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "error":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "disconnected":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "unauthorized":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Supervision
          </p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-rose-600" />
            Centre alertes admin
          </h1>
          <p className="text-sm text-slate-500">
            Flux temps reel : agents, AML, mobile money et KYC.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusBadge()}`}
          >
            {connectionStatus === "connected"
              ? "Connecte"
              : connectionStatus === "connecting"
              ? "Connexion..."
              : connectionStatus === "unauthorized"
              ? "Token requis"
              : connectionStatus === "error"
              ? "Erreur socket"
              : "Deconnecte"}
          </span>
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={16} className={historyLoading ? "animate-spin" : ""} />
            Historique
          </button>
        </div>
      </div>

      {historyError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {historyError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Alertes totales</p>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        {TOPICS.filter((t) => t.id !== "all").map((topic) => (
          <div key={topic.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{TOPIC_LABELS[topic.id]}</p>
            <p className="text-3xl font-bold text-slate-900">
              {stats[topic.id] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                activeTopic === topic.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
            {connectionStatus === "connected" ? (
              <>
                <Activity />
                <p>Aucune notification pour ce filtre.</p>
              </>
            ) : (
              <>
                <WifiOff />
                <p>En attente de la Connexion WebSocket...</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span>
                      {TOPIC_LABELS[event.topic] || event.topic || "Notification"}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${
                      SEVERITY_STYLE[event.severity] || SEVERITY_STYLE.default
                    }`}
                  >
                    {(event.severity || "info").toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {event.created_at
                      ? new Date(event.created_at).toLocaleString()
                      : "-"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {event.title || "Notification"}
                </h3>
                {event.message && (
                  <p className="text-sm text-slate-600">{event.message}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {event.user_id && (
                    <span className="rounded-full bg-white px-2 py-0.5">
                      Utilisateur {event.user_id}
                    </span>
                  )}
                  {event.metadata &&
                    Object.entries(event.metadata)
                      .filter(([key]) => !["topic", "severity"].includes(key))
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full bg-white px-2 py-0.5"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

