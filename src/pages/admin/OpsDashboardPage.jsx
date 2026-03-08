import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

function metricTone(value, warn, danger, invert = false) {
  const n = Number(value || 0);
  if (!invert) {
    if (n >= danger) return "text-rose-700 bg-rose-50 border-rose-200";
    if (n >= warn) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
  if (n <= danger) return "text-rose-700 bg-rose-50 border-rose-200";
  if (n <= warn) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function Card({ title, value, tone, sub }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-80">{sub}</p> : null}
    </div>
  );
}

function computeOpsStatus(data) {
  const unbalanced = Number(data?.ledger?.unbalanced_journals || 0);
  const err5xx = Number(data?.api?.errors_5xx || 0);
  const errRate = Number(data?.api?.error_rate_percent || 0);
  const p95 = Number(data?.api?.latency_p95_ms || 0);
  const failedRetry = Number(data?.webhooks?.failed_retry || 0);
  const retryQueue = Number(data?.webhooks?.retry_queue_size || 0);

  if (unbalanced > 0 || err5xx >= 10 || errRate >= 10 || p95 >= 2000 || failedRetry > 0 || retryQueue >= 30) {
    return { level: "CRITICAL", tone: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (err5xx >= 1 || errRate >= 3 || p95 >= 1000 || retryQueue >= 10) {
    return { level: "WARN", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { level: "OK", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export default function OpsDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pathPrefix, setPathPrefix] = useState("");
  const [data, setData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ window_hours: "24" });
      if (pathPrefix.trim()) q.append("path_prefix", pathPrefix.trim());
      const res = await api.get(`/backoffice/monitoring/ops-metrics?${q.toString()}`);
      setData(res);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || "Impossible de charger le dashboard ops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, pathPrefix]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const q = new URLSearchParams({ window_hours: "24" });
      if (pathPrefix.trim()) q.append("path_prefix", pathPrefix.trim());
      const base = import.meta.env.VITE_API_URL || "";
      const url = `${base}/backoffice/monitoring/ops-metrics/export.csv?${q.toString()}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Export CSV impossible (${res.status}).`);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `ops_metrics_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err?.message || "Erreur export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "API erreurs 5xx",
        value: data?.api?.errors_5xx ?? "-",
        tone: metricTone(data?.api?.errors_5xx, 1, 5),
        sub: "Fenetre 24h",
      },
      {
        title: "Latence p95 (ms)",
        value: data?.api?.latency_p95_ms ? Number(data.api.latency_p95_ms).toFixed(1) : "-",
        tone: metricTone(data?.api?.latency_p95_ms, 800, 1500),
        sub: "Fenetre 24h",
      },
      {
        title: "Webhooks failed",
        value: data?.webhooks?.failed ?? "-",
        tone: metricTone(data?.webhooks?.failed, 1, 10),
        sub: "escrow.webhook_logs",
      },
      {
        title: "Retry queue size",
        value: data?.webhooks?.retry_queue_size ?? "-",
        tone: metricTone(data?.webhooks?.retry_queue_size, 5, 20),
        sub: "escrow.webhook_retries",
      },
      {
        title: "Unbalanced journals",
        value: data?.ledger?.unbalanced_journals ?? "-",
        tone: metricTone(data?.ledger?.unbalanced_journals, 1, 1),
        sub: "Doit rester a 0",
      },
      {
        title: "Idempotency pending",
        value: data?.idempotency?.pending_keys ?? "-",
        tone: metricTone(data?.idempotency?.pending_keys, 10, 50),
        sub: "cles sans reponse payload",
      },
    ];
  }, [data]);
  const globalStatus = useMemo(() => computeOpsStatus(data), [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ops Dashboard</h1>
          <p className="text-sm text-slate-500">Sante production en un coup d’oeil (24h).</p>
          <p className="text-xs text-slate-400 mt-1">
            Derniere mise a jour: {lastUpdatedAt ? lastUpdatedAt.toLocaleString() : "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            placeholder="/api/p2p"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {autoRefresh ? "Pause auto-refresh" : "Reprendre auto-refresh"}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting ? "Export..." : "Exporter CSV"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>
      </div>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Recharger les metriques" />

      <div className={`rounded-xl border p-4 ${globalStatus.tone}`}>
        <p className="text-xs uppercase tracking-wide opacity-80">Statut global</p>
        <p className="mt-2 text-2xl font-bold">{globalStatus.level}</p>
        <p className="mt-1 text-xs opacity-80">Base sur 5xx, latence, retries webhook et equilibre ledger.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.title} title={c.title} value={c.value} tone={c.tone} sub={c.sub} />
        ))}
      </div>

      {data?.api?.note ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {data.api.note}
        </div>
      ) : null}
    </div>
  );
}
