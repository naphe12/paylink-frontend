import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import api from "@/services/api";
import { getAccessToken } from "@/services/authStore";
import useSessionStorageState from "@/hooks/useSessionStorageState";

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

const API_BASE = import.meta.env.VITE_API_URL || "";

function resolveAdminWsUrl() {
  if (API_BASE) {
    try {
      const u = new URL(API_BASE);
      u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
      u.pathname = "/ws/admin";
      u.search = "";
      return u.toString();
    } catch {
      // fallback below
    }
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/admin`;
}

const SEVERITY_STYLE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SecurityDashboard() {
  const [events, setEvents] = useState([]);
  const [stepUpEvents, setStepUpEvents] = useState([]);
  const [stepUpSummary, setStepUpSummary] = useState(null);
  const [stepUpTotal, setStepUpTotal] = useState(0);
  const [stepUpOffset, setStepUpOffset] = useState(0);
  const [activePanel, setActivePanel] = useSessionStorageState("admin_security_active_panel", "notifications");
  const [activeTopic, setActiveTopic] = useSessionStorageState("admin_security_active_topic", "all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpError, setStepUpError] = useState(null);
  const [exportingStepUp, setExportingStepUp] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [stepUpOutcome, setStepUpOutcome] = useSessionStorageState("admin_security_step_up_outcome", "");
  const [stepUpRequestedAction, setStepUpRequestedAction] = useSessionStorageState("admin_security_step_up_action", "");
  const [stepUpQuery, setStepUpQuery] = useSessionStorageState("admin_security_step_up_query", "");
  const stepUpLimit = 20;

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await api.getAdminNotifications();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(err.message || "Chargement impossible");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStepUpEvents = async () => {
    setStepUpLoading(true);
    setStepUpError(null);
    try {
      const payload = await api.getAdminStepUpEvents({
        limit: stepUpLimit,
        offset: stepUpOffset,
        outcome: stepUpOutcome,
        requested_action: stepUpRequestedAction,
        q: stepUpQuery,
      });
      setStepUpEvents(Array.isArray(payload?.items) ? payload.items : []);
      setStepUpTotal(Number(payload?.total || 0));
    } catch (err) {
      setStepUpError(err?.message || "Chargement step-up impossible");
    } finally {
      setStepUpLoading(false);
    }
  };

  const fetchStepUpSummary = async () => {
    try {
      const payload = await api.getAdminStepUpSummary({ window_hours: 24 });
      setStepUpSummary(payload || null);
    } catch {
      setStepUpSummary(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    fetchStepUpEvents();
  }, [stepUpOutcome, stepUpRequestedAction, stepUpQuery, stepUpOffset]);

  useEffect(() => {
    fetchStepUpSummary();
  }, []);

  useEffect(() => {
    setStepUpOffset(0);
  }, [stepUpOutcome, stepUpRequestedAction, stepUpQuery]);

  useEffect(() => {
    const token = getAccessToken();
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

    const ws = new WebSocket(`${resolveAdminWsUrl()}?${params.toString()}`);
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

  const notificationStats = useMemo(() => {
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

  const stepUpStats = useMemo(() => {
    return stepUpEvents.reduce(
      (acc, item) => {
        const outcome = String(item.outcome || "").toLowerCase();
        if (outcome === "issued") acc.issued += 1;
        if (outcome === "verified") acc.verified += 1;
        if (outcome === "denied") acc.denied += 1;
        if (outcome === "required") acc.required += 1;
        return acc;
      },
      { issued: 0, verified: 0, denied: 0, required: 0 }
    );
  }, [stepUpEvents]);

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

  const exportStepUpCsv = async () => {
    setExportingStepUp(true);
    setStepUpError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        setConnectionStatus("unauthorized");
        return;
      }
      const query = new URLSearchParams(
        Object.entries({
          limit: 5000,
          outcome: stepUpOutcome,
          requested_action: stepUpRequestedAction,
          q: stepUpQuery,
        }).filter(([, value]) => value !== undefined && value !== null && value !== "")
      ).toString();
      const response = await fetch(`${API_BASE}/admin/risk/step-up-events/export.csv?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Export step-up impossible (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `admin_step_up_events_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStepUpError(err?.message || "Export CSV step-up impossible");
    } finally {
      setExportingStepUp(false);
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
            Notifications temps reel et controles step-up admin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/admin/audit-search"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Audit global
          </Link>
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
            onClick={activePanel === "notifications" ? fetchHistory : fetchStepUpEvents}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={16} className={historyLoading || stepUpLoading ? "animate-spin" : ""} />
            Rafraichir
          </button>
        </div>
      </div>

      {historyError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {historyError}
        </div>
      ) : null}
      {stepUpError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {stepUpError}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["notifications", "Notifications"],
            ["step_up", "Step-up admin"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActivePanel(value)}
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                activePanel === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activePanel === "notifications" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Alertes totales</p>
              <p className="text-3xl font-bold text-slate-900">{notificationStats.total}</p>
            </div>
            {TOPICS.filter((t) => t.id !== "all").map((topic) => (
              <div key={topic.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{TOPIC_LABELS[topic.id]}</p>
                <p className="text-3xl font-bold text-slate-900">
                  {notificationStats[topic.id] || 0}
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
                    <p>En attente de la connexion WebSocket...</p>
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
                    {event.message ? (
                      <p className="text-sm text-slate-600">{event.message}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {event.user_id ? (
                        <span className="rounded-full bg-white px-2 py-0.5">
                          Utilisateur {event.user_id}
                        </span>
                      ) : null}
                      {event.metadata
                        ? Object.entries(event.metadata)
                            .filter(([key]) => !["topic", "severity"].includes(key))
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded-full bg-white px-2 py-0.5"
                              >
                                {key}: {String(value)}
                              </span>
                            ))
                        : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Emission", stepUpStats.issued],
              ["Valides", stepUpStats.verified],
              ["Refuses", stepUpStats.denied],
              ["Requis", stepUpStats.required],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {stepUpSummary ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Synthese step-up 24h</h2>
                    <p className="text-xs text-slate-500">Refus et actions protegees les plus sensibles.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {stepUpSummary?.totals?.total || 0} evt
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Issued", stepUpSummary?.totals?.issued || 0],
                    ["Verified", stepUpSummary?.totals?.verified || 0],
                    ["Denied", stepUpSummary?.totals?.denied || 0],
                    ["Required", stepUpSummary?.totals?.required || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
                      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Codes de refus
                  </div>
                  {!stepUpSummary?.denied_codes?.length ? (
                    <p className="text-sm text-slate-500">Aucun refus sur la fenetre.</p>
                  ) : (
                    <div className="space-y-2">
                      {stepUpSummary.denied_codes.map((item) => (
                        <div
                          key={item.code}
                          className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                        >
                          <span>{item.code}</span>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Actions protegees</h2>
                <p className="text-xs text-slate-500">Volume et refus par action step-up.</p>
                {!stepUpSummary?.by_action?.length ? (
                  <p className="mt-4 text-sm text-slate-500">Aucune action protegee sur la fenetre.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-2 pr-4 font-medium">Action</th>
                          <th className="pb-2 pr-4 font-medium">Total</th>
                          <th className="pb-2 pr-4 font-medium">Denied</th>
                          <th className="pb-2 pr-4 font-medium">Verified</th>
                          <th className="pb-2 pr-4 font-medium">Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stepUpSummary.by_action.map((row) => (
                          <tr key={row.requested_action} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 text-slate-700">{row.requested_action || "*"}</td>
                            <td className="py-2 pr-4 text-slate-700">{row.total || 0}</td>
                            <td className="py-2 pr-4 text-rose-700">{row.denied || 0}</td>
                            <td className="py-2 pr-4 text-emerald-700">{row.verified || 0}</td>
                            <td className="py-2 pr-4 text-amber-700">{row.required || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={stepUpOutcome}
                onChange={(e) => setStepUpOutcome(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Tous resultats</option>
                <option value="issued">Emission</option>
                <option value="verified">Valide</option>
                <option value="denied">Refuse</option>
                <option value="required">Requis</option>
              </select>
              <select
                value={stepUpRequestedAction}
                onChange={(e) => setStepUpRequestedAction(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Toutes actions</option>
                <option value="p2p_dispute_resolve">P2P dispute resolve</option>
                <option value="escrow_refund_request">Escrow refund request</option>
                <option value="escrow_refund_confirm">Escrow refund confirm</option>
                <option value="payment_manual_reconcile">Payment manual reconcile</option>
                <option value="payment_status_action">Payment status action</option>
              </select>
              <input
                value={stepUpQuery}
                onChange={(e) => setStepUpQuery(e.target.value)}
                placeholder="Rechercher admin, code ou action"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setStepUpOutcome("");
                  setStepUpRequestedAction("");
                  setStepUpQuery("");
                  setStepUpOffset(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {stepUpTotal ? `${stepUpOffset + 1}-${Math.min(stepUpOffset + stepUpEvents.length, stepUpTotal)} sur ${stepUpTotal}` : "0 resultat"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportStepUpCsv}
                  disabled={exportingStepUp}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {exportingStepUp ? "Export..." : "Exporter CSV"}
                </button>
                <button
                  type="button"
                  onClick={() => setStepUpOffset((current) => Math.max(0, current - stepUpLimit))}
                  disabled={stepUpOffset === 0 || stepUpLoading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Prec.
                </button>
                <button
                  type="button"
                  onClick={() => setStepUpOffset((current) => current + stepUpLimit)}
                  disabled={stepUpOffset + stepUpEvents.length >= stepUpTotal || stepUpLoading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Suiv.
                </button>
              </div>
            </div>
            {stepUpLoading ? (
              <div className="py-8 text-sm text-slate-500">Chargement step-up...</div>
            ) : !stepUpEvents.length ? (
              <div className="py-8 text-sm text-slate-500">Aucun evenement step-up pour ce filtre.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Admin</th>
                      <th className="pb-2 pr-4 font-medium">Action</th>
                      <th className="pb-2 pr-4 font-medium">Cible</th>
                      <th className="pb-2 pr-4 font-medium">Resultat</th>
                      <th className="pb-2 pr-4 font-medium">Methode</th>
                      <th className="pb-2 pr-4 font-medium">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepUpEvents.map((row) => {
                      const outcome = String(row.outcome || "").toLowerCase();
                      const tone =
                        outcome === "verified"
                          ? "text-emerald-700 bg-emerald-50"
                          : outcome === "denied"
                            ? "text-rose-700 bg-rose-50"
                            : "text-amber-700 bg-amber-50";
                      return (
                        <tr key={`${row.id}-${row.created_at}`} className="border-b last:border-b-0 align-top">
                          <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                            {formatDateTime(row.created_at)}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            <div className="font-medium">{row.actor_full_name || row.actor_email || "-"}</div>
                            <div className="text-xs text-slate-500">{row.actor_role || ""}</div>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{row.requested_action || "-"}</td>
                          <td className="py-3 pr-4 text-slate-700">
                            {resolveStepUpTargetLink(row) ? (
                              <Link
                                to={resolveStepUpTargetLink(row)}
                                className="inline-flex flex-col text-blue-700 hover:text-blue-800 hover:underline"
                              >
                                <span>{row.target_type || "-"}</span>
                                <span className="text-xs text-slate-500">{row.target_id || row.request_id || ""}</span>
                              </Link>
                            ) : (
                              <>
                                <div>{row.target_type || "-"}</div>
                                <div className="text-xs text-slate-500">{row.target_id || row.request_id || ""}</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
                              {row.outcome || row.action || "-"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{row.method || (row.session_bound ? "session" : "-")}</td>
                          <td className="py-3 pr-4 text-slate-500">{row.code || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function resolveStepUpTargetLink(row) {
  const targetType = String(row?.target_type || "").trim().toLowerCase();
  const targetId = encodeURIComponent(String(row?.target_id || "").trim());
  if (targetType === "p2p_trade") {
    return targetId ? `/dashboard/admin/p2p/disputes?target_id=${targetId}` : "/dashboard/admin/p2p/disputes";
  }
  if (targetType === "escrow_order") {
    return targetId ? `/dashboard/admin/escrow?target_id=${targetId}` : "/dashboard/admin/escrow";
  }
  if (targetType === "payment_intent") {
    return targetId ? `/dashboard/admin/payment-intents?target_id=${targetId}` : "/dashboard/admin/payment-intents";
  }
  return "";
}
