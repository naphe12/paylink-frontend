import { useEffect, useMemo, useState } from "react";
import { ArrowUpCircle } from "lucide-react";

import api from "@/services/api";

const FEE_RATE = 0.0625;

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [providerName, setProviderName] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const numericAmount = useMemo(() => Number(amount || 0), [amount]);
  const feePreview = useMemo(() => numericAmount * FEE_RATE, [numericAmount]);
  const totalPreview = useMemo(() => numericAmount + feePreview, [numericAmount, feePreview]);

  const fetchRequests = async () => {
    try {
      const data = await api.getCashRequests({ type: "withdraw" });
      setRequests(data);
    } catch (err) {
      console.error("Impossible de charger les retraits", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      return alert("Indiquez un montant valide.");
    }
    if (!mobileNumber || !providerName) {
      return alert("Merci de préciser le numéro mobile money et la plateforme.");
    }
    setLoading(true);
    try {
      await api.requestCashWithdraw({
        amount: Number(amount),
        mobile_number: mobileNumber,
        provider_name: providerName,
        note: note || null,
      });
      setAmount("");
      setMobileNumber("");
      setProviderName("");
      setNote("");
      await fetchRequests();
      alert("Demande de retrait enregistrée.");
    } catch (err) {
      alert(`Erreur retrait : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="text-rose-500" size={32} />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Demande de retrait cash</h2>
          <p className="text-slate-500 text-sm">
            Fournissez les détails mobile money. Des frais de 6,25% sont appliqués.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-2xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Montant demandé (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="Ex: 150"
            />
          </div>
          <div className="bg-rose-50 rounded-xl p-3">
            <p className="text-sm text-rose-600 font-semibold">Simulation</p>
            <p className="text-xs text-rose-500 mt-1">Frais (6,25%) : € {feePreview.toFixed(2)}</p>
            <p className="text-xs text-rose-500">Débit total : € {totalPreview.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Numéro Mobile Money
            </label>
            <input
              type="text"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="+257 79 00 00 00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Plateforme / Fournisseur
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="Ex: Lumicash, EcoCash..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Note (optionnelle)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
            placeholder="Ex: Retrait pour approvisionnement commerce"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-rose-600 text-white rounded-xl py-2.5 font-medium hover:bg-rose-700 transition disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Envoyer la demande"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Retraits récents</h3>
          <button
            onClick={fetchRequests}
            className="text-sm text-rose-600 hover:underline"
          >
            Rafraîchir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">Montant</th>
                <th className="text-left py-2 px-3">Frais</th>
                <th className="text-left py-2 px-3">Total</th>
                <th className="text-left py-2 px-3">Mobile</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-left py-2 px-3">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="border-t">
                  <td className="py-2 px-3 font-medium text-slate-700">
                    € {Number(req.amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    € {Number(req.fee_amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    € {Number(req.total_amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {req.provider_name} • {req.mobile_number}
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
                  <td className="py-2 px-3 text-slate-500">
                    {new Date(req.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={6}>
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
