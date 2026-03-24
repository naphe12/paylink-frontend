import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug, RefreshCw, Search } from "lucide-react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

function KpiCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function prettyJson(value) {
  if (!value) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminErrorLogsPage() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    path: "",
    error_type: "",
    status_code: "",
    limit: 100,
  });
  const [form, setForm] = useState({
    q: "",
    path: "",
    error_type: "",
    status_code: "",
    limit: 100,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (activeFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminErrors(activeFilters);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setSelectedId((current) =>
        current && list.some((item) => item.error_id === current) ? current : list[0]?.error_id || ""
      );
    } catch (err) {
      setError(err?.message || "Impossible de charger les erreurs applicatives.");
      setRows([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRow = rows.find((row) => row.error_id === selectedId) || null;

  const stats = useMemo(() => {
    const total = rows.length;
    const errors500 = rows.filter((row) => Number(row.status_code) >= 500).length;
    const handled = rows.filter((row) => row.handled).length;
    const unhandled = rows.filter((row) => !row.handled).length;
    return { total, errors500, handled, unhandled };
  }, [rows]);

  const applyFilters = (event) => {
    event.preventDefault();
    const nextFilters = {
      q: form.q.trim(),
      path: form.path.trim(),
      error_type: form.error_type.trim(),
      status_code: form.status_code,
      limit: Number(form.limit) || 100,
    };
    setFilters(nextFilters);
    load(nextFilters);
  };

  const resetFilters = () => {
    const initial = {
      q: "",
      path: "",
      error_type: "",
      status_code: "",
      limit: 100,
    };
    setForm(initial);
    setFilters(initial);
    load(initial);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Observabilite</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Bug className="text-rose-600" /> Erreurs applicatives
          </h1>
          <p className="text-sm text-slate-500">
            Consultation centralisee des erreurs backend capturees dans `app_errors`.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={() => load()} retryLabel="Recharger les erreurs" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lignes chargees" value={stats.total} tone="bg-slate-100 text-slate-700" />
        <KpiCard label="Erreurs 5xx" value={stats.errors500} tone="bg-rose-100 text-rose-700" />
        <KpiCard label="Handled" value={stats.handled} tone="bg-emerald-100 text-emerald-700" />
        <KpiCard label="Unhandled" value={stats.unhandled} tone="bg-amber-100 text-amber-700" />
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="text-sm text-slate-600">Recherche</span>
            <div className="relative mt-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.q}
                onChange={(e) => setForm((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="message, request_id, stack trace"
                className="w-full rounded-xl border px-9 py-2"
              />
            </div>
          </label>
          <label>
            <span className="text-sm text-slate-600">Path</span>
            <input
              value={form.path}
              onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))}
              placeholder="/agent/external/pending"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-slate-600">Type</span>
            <input
              value={form.error_type}
              onChange={(e) => setForm((prev) => ({ ...prev, error_type: e.target.value }))}
              placeholder="ProgrammingError"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-slate-600">Status</span>
            <select
              value={form.status_code}
              onChange={(e) => setForm((prev) => ({ ...prev, status_code: e.target.value }))}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="">Tous</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="409">409</option>
              <option value="422">422</option>
              <option value="500">500</option>
            </select>
          </label>
          <label>
            <span className="text-sm text-slate-600">Limite</span>
            <input
              type="number"
              min="10"
              max="500"
              value={form.limit}
              onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2 xl:col-span-6">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Filtrer
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Reinitialiser
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-900">Journal des erreurs</h2>
            <p className="text-xs text-slate-400">{rows.length} ligne(s)</p>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Path</th>
                  <th className="px-3 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Aucune erreur trouvee.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelected = row.error_id === selectedId;
                    const status = Number(row.status_code || 0);
                    const tone =
                      status >= 500
                        ? "bg-rose-100 text-rose-700"
                        : status >= 400
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700";
                    return (
                      <tr
                        key={row.error_id}
                        className={`cursor-pointer border-t ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        onClick={() => setSelectedId(row.error_id)}
                      >
                        <td className="px-3 py-2 text-slate-600">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
                            {row.status_code}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.error_type}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.request_path}</td>
                        <td className="px-3 py-2 text-slate-600">
                          <div className="max-w-[380px] truncate">{row.message}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {selectedRow ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <AlertTriangle className="text-rose-600" size={18} />
                    Detail erreur
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 font-mono">{selectedRow.error_id}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    selectedRow.handled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedRow.handled ? "handled" : "unhandled"}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Date" value={selectedRow.created_at ? new Date(selectedRow.created_at).toLocaleString() : "-"} />
                <InfoBlock label="Request ID" value={selectedRow.request_id || "-"} mono />
                <InfoBlock label="Status" value={selectedRow.status_code || "-"} />
                <InfoBlock label="Type" value={selectedRow.error_type || "-"} />
                <InfoBlock label="Path" value={selectedRow.request_path || "-"} mono />
                <InfoBlock label="Method" value={selectedRow.request_method || "-"} />
                <InfoBlock label="User ID" value={selectedRow.user_id || "-"} mono />
                <InfoBlock label="IP" value={selectedRow.client_ip || "-"} mono />
              </div>

              <TextBlock label="Message" value={selectedRow.message || "-"} />
              <TextBlock label="Stack trace" value={selectedRow.stack_trace || "-"} copyable />
              <TextBlock label="Headers" value={prettyJson(selectedRow.headers)} />
              <TextBlock label="Query params" value={prettyJson(selectedRow.query_params)} />
              <TextBlock label="Request body" value={selectedRow.request_body || "-"} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Selectionnez une erreur dans la liste de gauche.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono break-all" : ""}`}>{value}</p>
    </div>
  );
}

function TextBlock({ label, value, copyable = false }) {
  const [copied, setCopied] = useState(false);
  const canCopy = copyable && typeof navigator !== "undefined" && navigator.clipboard;

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Copie" : "Copier"}
          </button>
        )}
      </div>
      <pre className="mt-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}
