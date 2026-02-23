import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function WebhookLogs() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/backoffice/webhooks?limit=${limit}`);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setError("");
      if (selected) {
        const refreshed = list.find((r) => r.id === selected.id);
        setSelected(refreshed || selected);
      }
    } catch (e) {
      setError(e?.message || "Impossible de charger les logs webhook");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [autoRefresh, limit, selected]);

  const statuses = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.status || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const events = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.event_type || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && String(r.status || "-") !== statusFilter) return false;
      if (eventFilter !== "all" && String(r.event_type || "-") !== eventFilter) return false;
      if (!q) return true;
      const hay = [r.id, r.event_type, r.tx_hash, r.status, r.error]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter, eventFilter]);

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  const statusClass = (s) => {
    const v = String(s || "").toUpperCase();
    if (v === "OK" || v === "SUCCESS") return "bg-emerald-100 text-emerald-700";
    if (v === "PENDING" || v === "QUEUED") return "bg-amber-100 text-amber-700";
    if (v === "FAILED" || v === "ERROR") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
  };

  const retryLog = async (logId) => {
    setRetryingId(logId);
    try {
      await api.post(`/backoffice/webhooks/${logId}/retry`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Retry impossible");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Webhook Logs</h1>
            <p className="text-sm text-slate-500 mt-1">
              Suivi des webhooks escrow, statuts de livraison et retries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh 10s
            </label>
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              {loading ? "Chargement..." : "Rafraichir"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Rechercher id, tx hash, event, erreur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous statuts</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">Tous events</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value="50">50 lignes</option>
            <option value="100">100 lignes</option>
            <option value="200">200 lignes</option>
            <option value="500">500 lignes</option>
          </select>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Event</th>
                  <th className="text-left px-3 py-2 font-medium">Tx Hash</th>
                  <th className="text-left px-3 py-2 font-medium">Statut</th>
                  <th className="text-left px-3 py-2 font-medium">Tentatives</th>
                  <th className="text-left px-3 py-2 font-medium">Erreur</th>
                  <th className="text-left px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {r.event_type || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs max-w-[320px] truncate">
                      {r.tx_hash || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}>
                        {r.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.attempts ?? 0}</td>
                    <td className="px-3 py-2 text-xs text-rose-700 max-w-[280px] truncate">
                      {r.error || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryLog(r.id);
                        }}
                        disabled={retryingId === r.id}
                        className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-100 disabled:opacity-50"
                      >
                        {retryingId === r.id ? "Retry..." : "Retry"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Aucun webhook log trouve.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Detail event</h2>
        {!selected ? (
          <p className="text-sm text-slate-500 mt-2">Clique une ligne pour voir le payload complet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>ID:</b> {selected.id}</p>
                <p><b>Date:</b> {fmtDate(selected.created_at)}</p>
                <p><b>Event:</b> {selected.event_type || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>Statut:</b> {selected.status || "-"}</p>
                <p><b>Tentatives:</b> {selected.attempts ?? 0}</p>
                <p><b>Tx hash:</b> {selected.tx_hash || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>Erreur:</b> {selected.error || "-"}</p>
              </div>
            </div>
            <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 overflow-auto text-xs">
              {JSON.stringify(selected.payload ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
