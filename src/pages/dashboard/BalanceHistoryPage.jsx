import { useEffect, useState } from "react";
import api from "@/services/api";

export default function BalanceHistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/wallet/balance-events?limit=100&offset=0")
      .then((data) => {
        if (mounted) setRows(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Erreur inconnue");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Suivi de vos mouvements de balance</p>
          <h1 className="text-xl font-semibold text-slate-900">Historique de balance</h1>
        </div>
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
                  <td className="px-4 py-3 text-slate-700">{r.source || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    Aucun mouvement de balance pour le moment.
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
