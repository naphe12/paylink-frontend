import { useEffect, useState } from "react";
import api from "@/services/api";
import { RefreshCcw, Send } from "lucide-react";

export default function AdminPaymentRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("credit");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

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

  const createRequest = async () => {
    if (!identifier || !amount) {
      setCreateMsg("Renseignez le client et le montant.");
      return;
    }
    setCreating(true);
    setCreateMsg("");
    try {
      await api.createAdminPaymentRequest({
        user_identifier: identifier,
        amount: Number(amount),
        reason,
      });
      setCreateMsg("Demande envoyee.");
      setIdentifier("");
      setAmount("");
      fetchData();
    } catch (err) {
      setCreateMsg("Erreur: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Paiements clients (dettes credit / ligne)</p>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de paiement (admin)</h1>
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

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Send size={16} /> Envoyer une demande
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Client (email/username/paytag/tel)"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="credit">Credit</option>
            <option value="credit_line">Ligne de credit</option>
            <option value="other">Autre</option>
          </select>
          <button
            onClick={createRequest}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-70"
          >
            {creating ? "Envoi..." : "Envoyer"}
          </button>
        </div>
        {createMsg && <p className="text-sm text-slate-600">{createMsg}</p>}
      </div>

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
