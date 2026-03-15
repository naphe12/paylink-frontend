import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpCircle } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const FEE_RATE = 0.0625;
const PROVIDERS = ["Lumicash", "Ecocash", "eNoti", "Eban(virement)"];

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [providerName, setProviderName] = useState(PROVIDERS[0]);
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const idemKeyRef = useRef(null);

  const numericAmount = useMemo(() => Number(amount || 0), [amount]);
  const feePreview = useMemo(() => numericAmount * FEE_RATE, [numericAmount]);
  const totalPreview = useMemo(() => numericAmount + feePreview, [numericAmount, feePreview]);

  const fetchRequests = async () => {
    try {
      setLoadError("");
      const data = await api.getCashRequests({ type: "withdraw" });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err?.message || "Impossible de charger les retraits.");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!amount || Number(amount) <= 0) {
      alert("Indiquez un montant valide.");
      return;
    }
    if (!mobileNumber || !providerName) {
      alert("Merci de preciser le numero mobile money et la plateforme.");
      return;
    }

    setLoading(true);
    try {
      if (!idemKeyRef.current) {
        idemKeyRef.current = api.newIdempotencyKey("wallet-cash-withdraw");
      }
      await api.requestCashWithdraw(
        {
          amount: Number(amount),
          mobile_number: mobileNumber,
          provider_name: providerName,
          note: note || null,
        },
        idemKeyRef.current
      );
      idemKeyRef.current = null;
      setAmount("");
      setMobileNumber("");
      setProviderName(PROVIDERS[0]);
      setNote("");
      await fetchRequests();
      alert("Demande de retrait enregistree.");
    } catch (err) {
      setSubmitError(err?.message || "Erreur retrait.");
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
          <p className="text-sm text-slate-500">
            Fournissez les details mobile money. Des frais de 6,25% sont appliques.
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow">
        <ApiErrorAlert message={submitError} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Montant demande (EUR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="Ex: 150"
            />
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-sm font-semibold text-rose-600">Simulation</p>
            <p className="mt-1 text-xs text-rose-500">Frais (6,25%) : EUR {feePreview.toFixed(2)}</p>
            <p className="text-xs text-rose-500">Debit total : EUR {totalPreview.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Numero Mobile Money</label>
            <input
              type="text"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="+257 79 00 00 00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Plateforme / Fournisseur</label>
            <select
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Note (optionnelle)</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
            placeholder="Ex: Retrait pour approvisionnement commerce"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-rose-600 py-2.5 font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Envoyer la demande"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <ApiErrorAlert
          message={loadError}
          onRetry={fetchRequests}
          retryLabel="Recharger l'historique"
          className="mb-4"
        />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Retraits recents</h3>
          <button onClick={fetchRequests} className="text-sm text-rose-600 hover:underline">
            Rafraichir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Montant</th>
                <th className="px-3 py-2 text-left">Frais</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Mobile</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-left">Creee le</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="border-t">
                  <td className="px-3 py-2 font-medium text-slate-700">EUR {Number(req.amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">EUR {Number(req.fee_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">EUR {Number(req.total_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {req.provider_name} - {req.mobile_number}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
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
                  <td className="px-3 py-2 text-slate-500">{new Date(req.created_at).toLocaleString()}</td>
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
