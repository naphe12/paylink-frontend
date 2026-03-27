import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";

export default function AdminLegacyTransfersPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .getAdminBalanceEvents({ limit: 100, offset: 0, q: q.trim() || undefined, source: "legacy" })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Erreur inconnue"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Transactions à valider provenant uniquement de legacy</p>
          <h1 className="text-xl font-semibold text-slate-900">Transferts legacy à valider</h1>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche nom / email / téléphone"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-indigo-100"
          />
          <button
            onClick={load}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            Rechercher
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Filtre appliqué: <span className="font-semibold">source = legacy</span>
      </div>

      {loading && <div className="text-slate-600">Chargement...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Legacy ID</th>
                <th className="px-4 py-3 text-right">Balance avant</th>
                <th className="px-4 py-3 text-right">Delta</th>
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
                  <td className="px-4 py-3 text-slate-700">{r.legacy_id || "—"}</td>
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
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Voir historique
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Aucun transfert legacy trouvé.
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
