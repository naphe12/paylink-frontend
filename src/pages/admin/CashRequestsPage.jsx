import { useEffect, useState } from "react";
import { Check, RefreshCcw, X } from "lucide-react";

import api from "@/services/api";

const statusOptions = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvées" },
  { value: "rejected", label: "Rejetées" },
];

const typeOptions = [
  { value: "withdraw", label: "Retraits" },
  { value: "deposit", label: "Dépôts" },
];

export default function CashRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [requestType, setRequestType] = useState("withdraw");
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminCashRequests({
        status,
        type: requestType,
      });
      setRequests(data);
    } catch (err) {
      alert("Erreur chargement demandes : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status, requestType]);

  const handleDecision = async (requestId, action) => {
    const note = window.prompt("Ajouter une note (optionnel)") || undefined;
    try {
      if (action === "approve") {
        await api.approveCashRequest(requestId, { note });
      } else {
        await api.rejectCashRequest(requestId, { note });
      }
      fetchRequests();
    } catch (err) {
      alert(`Action impossible : ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Validation cash in/out</h1>
          <p className="text-slate-500 text-sm">
            Suivez les demandes des clients et appliquez les décisions d'encaissement.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          <RefreshCcw size={16} /> Rafraîchir
        </button>
      </header>

      <div className="flex flex-wrap gap-4 bg-white rounded-2xl shadow p-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-sm"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Type</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="mt-1 border rounded-lg px-3 py-2 text-sm"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left py-3 px-4">Client</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Montant</th>
              <th className="text-left py-3 px-4">Frais</th>
              <th className="text-left py-3 px-4">Total</th>
              <th className="text-left py-3 px-4">Référence</th>
              <th className="text-left py-3 px-4">Statut</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.request_id} className="border-t">
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-800">{req.user?.full_name || "—"}</p>
                  <p className="text-xs text-slate-500">{req.user?.email}</p>
                </td>
                <td className="py-3 px-4 capitalize">{req.type}</td>
                <td className="py-3 px-4">€ {Number(req.amount).toFixed(2)}</td>
                <td className="py-3 px-4">€ {Number(req.fee_amount).toFixed(2)}</td>
                <td className="py-3 px-4">€ {Number(req.total_amount).toFixed(2)}</td>
                <td className="py-3 px-4 text-slate-600">
                  {req.provider_name || "—"} {req.mobile_number ? `• ${req.mobile_number}` : ""}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      req.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : req.status === "rejected"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {req.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(req.request_id, "approve")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700"
                      >
                        <Check size={14} /> Valider
                      </button>
                      <button
                        onClick={() => handleDecision(req.request_id, "reject")}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-600"
                      >
                        <X size={14} /> Rejeter
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Traité le {new Date(req.processed_at || req.created_at).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="py-6 text-center text-slate-500" colSpan={8}>
                  {loading ? "Chargement..." : "Aucune demande pour ce filtre."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
