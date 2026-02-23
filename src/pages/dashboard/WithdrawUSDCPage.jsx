import { useMemo, useState } from "react";
import { ArrowUpCircle } from "lucide-react";

import api from "@/services/api";

export default function WithdrawUSDCPage() {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const numericAmount = useMemo(() => Number(amount || 0), [amount]);
  const disabled = loading || numericAmount <= 0 || address.trim().length < 8;

  const handleWithdraw = async () => {
    setMessage("");
    setError("");

    if (numericAmount <= 0) {
      setError("Indiquez un montant valide.");
      return;
    }
    if (address.trim().length < 8) {
      setError("Adresse externe invalide.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.requestUsdcWithdraw({
        amount: numericAmount,
        to_address: address.trim(),
      });
      setMessage(`Retrait en cours. ID: ${response.withdrawal_id}`);
      setAmount("");
      setAddress("");
    } catch (err) {
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="text-indigo-600" size={32} />
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Retirer USDC</h2>
          <p className="text-slate-500 text-sm">
            Le retrait passe en statut PENDING avant execution on-chain.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-600">
            Montant USDC
          </label>
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Ex: 5"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-600">
            Adresse externe USDC
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="0x..."
          />
        </div>

        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          onClick={handleWithdraw}
          disabled={disabled}
          className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Confirmer retrait"}
        </button>
      </div>
    </div>
  );
}
