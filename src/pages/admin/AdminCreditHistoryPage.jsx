import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
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
      setEntries(data);
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
      <div className="flex items-center justify-between bg-white rounded-2xl shadow p-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Historique ligne de crédit
          </h1>
          <p className="text-slate-500 text-sm">
            Vue globale des utilisations de crédit clients.
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
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {[50, 100, 200, 500].map((value) => (
              <option key={value} value={value}>
                {value} lignes
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium"
          >
            <Search size={16} /> Filtrer
          </button>
          <button
            type="button"
            onClick={loadHistory}
            className="p-2 rounded-xl border text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-left">Montant utilisé</th>
              <th className="px-4 py-3 text-left">Disponible avant</th>
              <th className="px-4 py-3 text-left">Disponible après</th>
              <th className="px-4 py-3 text-left">Transaction</th>
              <th className="px-4 py-3 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  Aucune donnée
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.entry_id} className="border-t">
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{entry.user_id}</td>
                  <td className="px-4 py-2 font-semibold text-rose-600">
                    - {Number(entry.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {Number(entry.credit_available_before).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {Number(entry.credit_available_after).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {entry.transaction_id || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {entry.description || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
