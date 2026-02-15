import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const initialState = {
  side: "SELL",
  token: "USDC",
  price_bif_per_usd: "",
  min_token_amount: "",
  max_token_amount: "",
  available_amount: "",
  payment_method: "LUMICASH",
  terms: "",
};

export default function CreateOffer() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/p2p/offers", {
        side: form.side,
        token: form.token,
        price_bif_per_usd: Number(form.price_bif_per_usd),
        min_token_amount: Number(form.min_token_amount),
        max_token_amount: Number(form.max_token_amount),
        available_amount: Number(form.available_amount),
        payment_method: form.payment_method,
        payment_details: {},
        terms: form.terms || null,
      });
      navigate("/app/p2p");
    } catch (err) {
      setError(err.message || "Echec creation offre");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Creer une offre P2P</h1>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-slate-700 space-y-1">
          <span>Side</span>
          <select name="side" value={form.side} onChange={onChange} className="w-full border border-slate-300 rounded-lg px-3 py-2">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Token</span>
          <select name="token" value={form.token} onChange={onChange} className="w-full border border-slate-300 rounded-lg px-3 py-2">
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Prix (BIF par USD)</span>
          <input name="price_bif_per_usd" type="number" step="0.000001" min="0" value={form.price_bif_per_usd} onChange={onChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Montant min token</span>
          <input name="min_token_amount" type="number" step="0.00000001" min="0" value={form.min_token_amount} onChange={onChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Montant max token</span>
          <input name="max_token_amount" type="number" step="0.00000001" min="0" value={form.max_token_amount} onChange={onChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Montant disponible</span>
          <input name="available_amount" type="number" step="0.00000001" min="0" value={form.available_amount} onChange={onChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700 space-y-1">
          <span>Methode paiement</span>
          <select name="payment_method" value={form.payment_method} onChange={onChange} className="w-full border border-slate-300 rounded-lg px-3 py-2">
            <option value="LUMICASH">LUMICASH</option>
            <option value="ECOCASH">ECOCASH</option>
            <option value="BANK">BANK</option>
            <option value="CASH">CASH</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 space-y-1 md:col-span-2">
          <span>Conditions (optionnel)</span>
          <textarea name="terms" value={form.terms} onChange={onChange} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </label>

        {error && <div className="md:col-span-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60">
            {loading ? "Creation..." : "Publier l'offre"}
          </button>
          <button type="button" onClick={() => navigate("/app/p2p")} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
