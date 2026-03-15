import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import api from "@/services/api";

export default function AdminCreditHistoryPage() {
  const [entries, setEntries] = useState([]);
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(200);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminCreditHistory({
        user_id: userId || undefined,
        limit,
      });
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement admin credit history", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Historique ligne de credit</h1>
          <p className="text-sm text-slate-500">
            Vue globale des utilisations et ajustements de credit clients.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadHistory();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (optionnel)"
            className="w-64 rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {[50, 100, 200, 500].map((value) => (
              <option key={value} value={value}>
                {value} lignes
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Search size={16} /> Filtrer
          </button>
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-left">Montant</th>
              <th className="px-4 py-3 text-left">Disponible avant</th>
              <th className="px-4 py-3 text-left">Disponible apres</th>
              <th className="px-4 py-3 text-left">Transaction</th>
              <th className="px-4 py-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Aucune donnee
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const amount = Number(entry.amount || 0);
                return (
                  <tr key={entry.entry_id} className="border-t">
                    <td className="px-4 py-2 text-slate-600">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-600">{entry.user_id}</td>
                    <td className={`px-4 py-2 font-semibold ${amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {amount >= 0 ? "+" : "-"} {Math.abs(amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{Number(entry.credit_available_before).toLocaleString()}</td>
                    <td className="px-4 py-2">{Number(entry.credit_available_after).toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-500">{entry.transaction_id || "-"}</td>
                    <td className="px-4 py-2 text-slate-500">{entry.description || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
