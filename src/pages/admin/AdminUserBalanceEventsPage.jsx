import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function AdminUserBalanceEventsPage() {
  const { user_id } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user_id) return;
    setLoading(true);
    setError("");
    fetch(`/admin/transfers/users/${user_id}/balance-events?limit=100&offset=0`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger l'historique de ce client");
        return res.json();
      })
      .then(setRows)
      .catch((err) => setError(err.message || "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [user_id]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-slate-500">Historique de balance pour le client</p>
        <h1 className="text-xl font-semibold text-slate-900">Balance client #{user_id}</h1>
      </header>

      {loading && <div className="text-slate-600">Chargement…</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Balance avant</th>
                <th className="px-4 py-3 text-right">Δ</th>
                <th className="px-4 py-3 text-right">Balance après</th>
                <th className="px-4 py-3 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.event_id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-800">
                    {r.occurred_at ? new Date(r.occurred_at).toLocaleString() : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.balance_before !== null && r.balance_before !== undefined ? r.balance_before : "–"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      (r.amount_delta || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {r.amount_delta !== null && r.amount_delta !== undefined ? r.amount_delta : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.balance_after !== null && r.balance_after !== undefined ? r.balance_after : "–"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.source || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
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
