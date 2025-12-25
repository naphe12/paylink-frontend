import { useEffect, useState } from "react";
import api from "@/services/api";
import { RefreshCcw } from "lucide-react";

export default function AdminPaymentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (status) params.status = status;
      const data = await api.getAdminPaymentRequests(params);
      setRequests(data);
    } catch (err) {
      setError("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Paiements clients</p>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de paiement</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="succeeded">Validees</option>
            <option value="cancelled">Refusees</option>
          </select>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCcw size={16} /> Actualiser
          </button>
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="text-slate-600">Chargement...</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Demandeur</th>
                <th className="px-4 py-3 text-left font-semibold">Destinataire</th>
                <th className="px-4 py-3 text-left font-semibold">Montant</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Creee le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                    Aucune demande.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.request_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.requester || "N/A"}</div>
                      <div className="text-xs text-slate-500">{r.requester_email || r.requester_paytag || r.requester_username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.recipient || "N/A"}</div>
                      <div className="text-xs text-slate-500">{r.recipient_email || r.recipient_paytag || r.recipient_username}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {Number(r.amount).toLocaleString()} {r.currency_code || ""}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
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
