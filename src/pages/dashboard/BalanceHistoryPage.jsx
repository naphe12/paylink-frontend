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

      {loading && <div className="text-slate-600">Chargement...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Balance avant</th>
                <th className="px-4 py-3 text-right">Delta</th>
                <th className="px-4 py-3 text-right">Balance apres</th>
                <th className="px-4 py-3 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.event_id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-800">
                    {row.occurred_at ? new Date(row.occurred_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.balance_before !== null && row.balance_before !== undefined
                      ? `${row.balance_before} ${row.currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      (row.amount_delta || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {row.amount_delta !== null && row.amount_delta !== undefined
                      ? `${row.amount_delta} ${row.currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.balance_after !== null && row.balance_after !== undefined
                      ? `${row.balance_after} ${row.currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.source || "-"}</td>
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
