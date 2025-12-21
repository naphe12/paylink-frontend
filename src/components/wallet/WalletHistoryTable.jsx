import { useEffect, useState } from "react";
import api from "@/services/api";
import { History, RefreshCw } from "lucide-react";

const DEFAULT_FILTERS = { limit: 20, search: "" };

export default function WalletHistoryTable({ walletId, currency }) {
  const effectiveCurrency = currency || "";
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [formFilters, setFormFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!walletId) return;
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getWalletLedger(walletId, appliedFilters);
        if (active) {
          setEntries(data);
        }
      } catch (err) {
        console.error("Erreur chargement historique wallet:", err);
        if (active) {
          setEntries([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [walletId, appliedFilters, reloadToken]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters({
      limit: Number(formFilters.limit) || DEFAULT_FILTERS.limit,
      search: formFilters.search.trim(),
    });
  };

  const badge =
    entries.length > 0
      ? `${entries.length} operations`
      : "Aucun mouvement sur la periode";

  return (
    <div className="bg-white rounded-xl shadow border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <History size={20} /> Historique du portefeuille
          </h3>
          <p className="text-xs text-slate-500">{badge}</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={formFilters.search}
              onChange={(e) =>
                setFormFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Reference ou type"
              className="border rounded-lg px-3 py-1 text-sm"
            />
            <select
              value={formFilters.limit}
              onChange={(e) =>
                setFormFilters((prev) => ({ ...prev, limit: e.target.value }))
              }
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option} lignes
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-slate-900 text-white text-sm"
            >
              Filtrer
            </button>
          </form>
          <button
            className="p-2 rounded-lg border text-slate-600 hover:bg-slate-50"
            title="Rafraichir"
            onClick={() => setReloadToken((n) => n + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Direction</th>
              <th className="p-2 text-left">Montant</th>
              <th className="p-2 text-left">Solde apres</th>
              <th className="p-2 text-left">Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Aucun mouvement enregistre pour ce portefeuille.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.transaction_id} className="border-t">
                  <td className="p-2 text-slate-600">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 font-medium">
                    {entry.operation_type || "-"}
                    <p className="text-xs text-slate-400">
                      {entry.description}
                    </p>
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        entry.direction === "credit"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.direction === "credit" ? "Credit" : "Debit"}
                    </span>
                  </td>
                  <td
                    className={`p-2 font-semibold ${
                      entry.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {entry.direction === "credit" ? "+" : " "}
                    {Number(entry.amount).toLocaleString()} {effectiveCurrency}
                  </td>
                  <td className="p-2 text-slate-700">
                    {Number(entry.balance_after).toLocaleString()} {effectiveCurrency}
                  </td>
                  <td className="p-2 text-slate-500">{entry.reference || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
