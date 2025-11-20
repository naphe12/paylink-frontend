import { useEffect, useState } from "react";
import { ArrowDownCircle } from "lucide-react";

import api from "@/services/api";

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await api.getCashRequests({ type: "deposit" });
      setRequests(data);
    } catch (err) {
      console.error("Impossible de charger les demandes", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      return alert("Indiquez un montant valide.");
    }
    setLoading(true);
    try {
      await api.requestCashDeposit({
        amount: Number(amount),
        note: note || null,
      });
      setAmount("");
      setNote("");
      await fetchRequests();
      alert("Demande de dépôt enregistrée.");
    } catch (err) {
      alert(`Erreur dépôt : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownCircle className="text-blue-600" size={32} />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Demande de dépôt cash</h2>
          <p className="text-slate-500 text-sm">
            Encodez un dépôt qui sera validé par un administrateur PayLink.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Montant (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ex: 250"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Note (optionnelle)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ex: Dépôt effectué via agent PayLink"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Soumettre la demande"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Historique des dépôts</h3>
          <button
            onClick={fetchRequests}
            className="text-sm text-blue-600 hover:underline"
          >
            Rafraîchir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">Montant</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Note</th>
                <th className="text-left py-2 px-3">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="border-t">
                  <td className="py-2 px-3 font-medium text-slate-700">
                    € {Number(req.amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3">
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
                  <td className="py-2 px-3 text-slate-600">
                    {req.note || "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    {new Date(req.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={4}>
                    Aucune demande pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
