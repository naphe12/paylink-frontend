import { useEffect, useState } from "react";
import {
  ToggleLeft,
  ToggleRight,
  Edit2,
  History,
  Loader2,
  Search,
} from "lucide-react";
import api from "@/services/api";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [commissionModal, setCommissionModal] = useState(null);
  const [commissionValue, setCommissionValue] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgents(search ? { search } : undefined);
      setAgents(res);
    } catch (err) {
      setError(err.message || "Erreur chargement agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAgent = async (agent) => {
    await api.toggleAgent(agent.agent_id);
    load();
  };

  const openCommissionModal = (agent) => {
    setCommissionModal(agent);
    setCommissionValue(agent.commission_rate.toString());
  };

  const saveCommission = async () => {
    if (!commissionModal) return;
    await api.updateAgentCommission(commissionModal.agent_id, {
      commission_rate: Number(commissionValue),
    });
    setCommissionModal(null);
    load();
  };

  const openHistory = async (agent) => {
    setSelected(agent);
    const res = await api.getAgentAdminHistory(agent.agent_id);
    setHistory(res);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion des agents
          </h1>
          <p className="text-sm text-slate-500">
            Active/désactive des agents, ajuste leur commission et consulte leur
            historique.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center border rounded-xl px-3">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              className="input border-0 focus:ring-0"
              placeholder="Recherche nom ou téléphone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" /> Chargement des agents…
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Agent</th>
                <th className="p-3 text-left">Utilisateur</th>
                <th className="p-3 text-left">Commission</th>
                <th className="p-3 text-left">Solde</th>
                <th className="p-3 text-left">Total commissions</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agent_id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">
                      {agent.display_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {agent.country_code}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{agent.user.full_name}</div>
                    <div className="text-xs text-slate-500">
                      {agent.user.phone}
                    </div>
                  </td>
                  <td className="p-3">
                    {(agent.commission_rate * 100).toFixed(2)} %
                  </td>
                  <td className="p-3">
                    {agent.balance.toLocaleString()} BIF
                  </td>
                  <td className="p-3">
                    {agent.total_commission.toLocaleString()} BIF
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        agent.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {agent.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleAgent(agent)}
                        className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
                      >
                        {agent.active ? (
                          <>
                            <ToggleLeft size={16} /> Désactiver
                          </>
                        ) : (
                          <>
                            <ToggleRight size={16} /> Activer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openCommissionModal(agent)}
                        className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
                      >
                        <Edit2 size={14} /> Commission
                      </button>
                      <button
                        onClick={() => openHistory(agent)}
                        className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
                      >
                        <History size={16} /> Historique
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {commissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Modifier commission – {commissionModal.display_name}
            </h2>
            <p className="text-sm text-slate-500">
              Taux actuel : {(commissionModal.commission_rate * 100).toFixed(2)}%
            </p>
            <input
              type="number"
              step="0.001"
              min="0.001"
              max="1"
              className="input w-full"
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border"
                onClick={() => setCommissionModal(null)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white"
                onClick={saveCommission}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && history && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Historique – {selected.display_name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.user.full_name} • {selected.user.phone}
                </p>
              </div>
              <button
                className="px-4 py-2 rounded-lg border"
                onClick={() => {
                  setSelected(null);
                  setHistory(null);
                }}
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Opérations
                </h3>
                <div className="space-y-2 max-h-64 overflow-auto text-sm">
                  {history.transactions.map((tx) => (
                    <div
                      key={tx.transaction_id}
                      className="p-2 border rounded-lg bg-white"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">
                          {tx.direction}
                        </span>
                        <span>{tx.amount.toLocaleString()} BIF</span>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between">
                        <span>{tx.client_name || "Client"}</span>
                        <span>{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-emerald-600">
                        Commission: {tx.commission.toLocaleString()} BIF
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Commissions versées
                </h3>
                <div className="space-y-2 max-h-64 overflow-auto text-sm">
                  {history.commissions.map((c, idx) => (
                    <div
                      key={`${c.created_at}-${idx}`}
                      className="p-2 border rounded-lg bg-white flex justify-between"
                    >
                      <div>
                        <div className="font-medium capitalize">{c.type}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-emerald-600 font-semibold">
                        {c.amount.toLocaleString()} BIF
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
