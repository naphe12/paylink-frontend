import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

const buildInitialState = (offer) => {
  if (!offer) return initialState;
  return {
    side: offer.side || initialState.side,
    token: offer.token || initialState.token,
    price_bif_per_usd: offer.price_bif_per_usd ?? "",
    min_token_amount: offer.min_token_amount ?? "",
    max_token_amount: offer.max_token_amount ?? "",
    available_amount: offer.available_amount ?? "",
    payment_method: offer.payment_method || initialState.payment_method,
    terms: offer.terms || "",
  };
};

export default function CreateOffer() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => buildInitialState(location.state?.prefillOffer));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);

  const isEditMode = Boolean(id);
  const isDuplicateMode = !isEditMode && Boolean(location.state?.prefillOffer);

  useEffect(() => {
    if (!id) return;
    const loadOffer = async () => {
      setBootstrapping(true);
      setError("");
      try {
        const offer = await api.get(`/api/p2p/offers/${id}`);
        setForm(buildInitialState(offer));
      } catch (err) {
        setError(err.message || "Impossible de charger l'offre");
      } finally {
        setBootstrapping(false);
      }
    };
    loadOffer();
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        side: form.side,
        token: form.token,
        price_bif_per_usd: Number(form.price_bif_per_usd),
        min_token_amount: Number(form.min_token_amount),
        max_token_amount: Number(form.max_token_amount),
        available_amount: Number(form.available_amount),
        payment_method: form.payment_method,
        payment_details: {},
        terms: form.terms || null,
      };
      if (isEditMode) {
        await api.patch(`/api/p2p/offers/${id}`, payload);
      } else {
        await api.post("/api/p2p/offers", payload);
      }
      navigate("/app/p2p/my-offers");
    } catch (err) {
      setError(err.message || (isEditMode ? "Echec modification offre" : "Echec creation offre"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        {isEditMode ? "Modifier l'offre P2P" : isDuplicateMode ? "Dupliquer une offre P2P" : "Creer une offre P2P"}
      </h1>
      {bootstrapping && <div className="rounded-xl border border-slate-200 bg-white p-4">Chargement de l'offre...</div>}
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
            <option value="ENOTI">eNOTI</option>
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
            {loading ? (isEditMode ? "Modification..." : "Creation...") : isEditMode ? "Enregistrer" : "Publier l'offre"}
          </button>
          <button type="button" onClick={() => navigate("/app/p2p/my-offers")} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
