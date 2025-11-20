import { useEffect, useState } from "react";
import api from "@/services/api";
import { Loader2, Bell, ShieldOff } from "lucide-react";

export default function TontineArrearsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTontineArrears();
      setRows(res);
    } catch (err) {
      setError(err.message || "Erreur de chargement des impayés");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const notify = async (tontineId) => {
    setActionLoading(true);
    await api.notifyTontineArrears(tontineId);
    setActionLoading(false);
  };

  const block = async (tontineId) => {
    setActionLoading(true);
    await api.blockTontine(tontineId);
    setActionLoading(false);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Contrôle des impayés
          </h1>
          <p className="text-sm text-slate-500">
            Liste des membres en retard de paiement et actions de suivi.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" /> Chargement...
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Tontine</th>
                <th className="p-3 text-left">Membre</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Due</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Aucun impayé actuellement.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.contribution_id} className="border-t">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">
                        {row.tontine_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.tontine_status}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{row.member_name}</div>
                      <div className="text-xs text-slate-500">
                        {row.email} / {row.phone}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">
                      {row.amount.toLocaleString()} BIF
                    </td>
                    <td className="p-3 capitalize">{row.status}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(row.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded-lg border text-xs flex items-center gap-1"
                          onClick={() => notify(row.tontine_id)}
                          disabled={actionLoading}
                        >
                          <Bell size={14} /> Notifier
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg border text-xs flex items-center gap-1 text-red-600 border-red-200"
                          onClick={() => block(row.tontine_id)}
                          disabled={actionLoading}
                        >
                          <ShieldOff size={14} /> Bloquer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
