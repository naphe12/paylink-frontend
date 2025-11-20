import { useEffect, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import api from "@/services/api";

export default function CreditHistoryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getCreditHistory();
      setEntries(data);
    } catch (err) {
      console.error("Erreur chargement historique credit:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard /> Historique ligne de crédit
          </h2>
          <p className="text-slate-500 text-sm">
            Suivez toutes les utilisations de votre ligne de crédit.
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <RefreshCw size={16} /> Rafraîchir
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Montant utilisé</th>
              <th className="text-left px-4 py-3">Crédit disponible avant</th>
              <th className="text-left px-4 py-3">Crédit disponible après</th>
              <th className="text-left px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-6">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-6">
                  Aucune utilisation enregistrée.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.entry_id} className="border-t">
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
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
