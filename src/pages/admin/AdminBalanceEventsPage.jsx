import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";

export default function AdminBalanceEventsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (q.trim()) params.set("q", q.trim());

    api
      .get(`/admin/transfers/balance-events?${params.toString()}`)
      .then(setRows)
      .catch((err) => setError(err.message || "Erreur inconnue"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Vue globale des mouvements de balance clients</p>
          <h1 className="text-xl font-semibold text-slate-900">Balances clients</h1>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche nom / email / téléphone"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-indigo-100"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700"
          >
            Rechercher
          </button>
        </div>
      </header>

      {loading && <div className="text-slate-600">Chargement…</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">Balance avant</th>
                <th className="px-4 py-3 text-right">Δ</th>
                <th className="px-4 py-3 text-right">Balance après</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.event_id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-800">
                    <div className="font-medium">{r.full_name || "—"}</div>
                    <div className="text-xs text-slate-500">{r.email || r.phone || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.balance_before !== null && r.balance_before !== undefined
                      ? `${r.balance_before} ${r.currency || ""}`.trim()
                      : "–"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      (r.amount_delta || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {r.amount_delta !== null && r.amount_delta !== undefined
                      ? `${r.amount_delta} ${r.currency || ""}`.trim()
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.balance_after !== null && r.balance_after !== undefined
                      ? `${r.balance_after} ${r.currency || ""}`.trim()
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.occurred_at ? new Date(r.occurred_at).toLocaleString() : "–"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/admin/users/${r.user_id}/balance-events`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
                    >
                      Voir historique
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Aucun mouvement enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
