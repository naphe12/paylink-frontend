import { useEffect, useState } from "react";
import api from "@/services/api";

export default function IdempotencyScopesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [retentionHours, setRetentionHours] = useState(72);
  const [limit, setLimit] = useState(50);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getIdempotencyScopes({
        retention_hours: retentionHours,
        limit,
      });
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les scopes idempotence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = rows.reduce((acc, r) => acc + Number(r.total_keys || 0), 0);
  const pending = rows.reduce((acc, r) => acc + Number(r.pending_keys || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Idempotence par scope</h1>
          <p className="text-sm text-slate-500">Suivi des cles, replays et traitements en attente.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="2160"
            value={retentionHours}
            onChange={(e) => setRetentionHours(Number(e.target.value || 72))}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            title="Retention (h)"
          />
          <input
            type="number"
            min="1"
            max="200"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 50))}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            title="Limit"
          />
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Scopes</p>
          <p className="text-xl font-semibold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total cles</p>
          <p className="text-xl font-semibold text-slate-900">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Cles en attente</p>
          <p className={`text-xl font-semibold ${pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {pending.toLocaleString()}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Scope</th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-right px-3 py-2">Completed</th>
              <th className="text-right px-3 py-2">Pending</th>
              <th className="text-right px-3 py-2">Expired est.</th>
              <th className="text-right px-3 py-2">24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scope} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-800">{row.scope}</td>
                <td className="px-3 py-2 text-right">{Number(row.total_keys || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{Number(row.completed_keys || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-amber-700">{Number(row.pending_keys || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-slate-700">{Number(row.estimated_expired_keys || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-indigo-700">{Number(row.keys_24h || 0).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Aucun scope idempotence trouve.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
