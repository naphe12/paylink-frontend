import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const paymentLabel = (method) => {
  const normalized = String(method || "").toUpperCase();
  if (normalized === "LUMICASH") return "Payer via Lumicash";
  if (normalized === "ENOTI" || normalized === "ECOCASH") return "Payer via eNoti";
  if (!normalized) return "Paiement non precise";
  return `Payer via ${normalized}`;
};
const sideLabel = (side) => (side === "SELL" ? "Vente" : "Achat");
const sideBadgeClass = (side) =>
  side === "SELL"
    ? "bg-amber-100 text-amber-800 border border-amber-200"
    : "bg-sky-100 text-sky-800 border border-sky-200";
const tokenBadgeClass = (token) =>
  token === "USDT"
    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
    : "bg-indigo-100 text-indigo-800 border border-indigo-200";
const statusBadgeClass = (isActive) =>
  isActive
    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
    : "bg-slate-100 text-slate-700 border border-slate-200";

export default function P2PMyOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const mine = await api.get("/api/p2p/offers/mine");
      setOffers(Array.isArray(mine) ? mine : []);
    } catch (err) {
      setError(err.message || "Erreur chargement offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleOffer = async (offer) => {
    setActionId(offer.offer_id);
    setError("");
    try {
      const path = offer.is_active
        ? `/api/p2p/offers/${offer.offer_id}/deactivate`
        : `/api/p2p/offers/${offer.offer_id}/activate`;
      await api.post(path, {});
      await load();
    } catch (err) {
      setError(err.message || "Erreur mise a jour offre");
    } finally {
      setActionId("");
    }
  };

  const deleteOffer = async (offer) => {
    if (!window.confirm("Supprimer cette offre ?")) return;
    setActionId(offer.offer_id);
    setError("");
    try {
      await api.del(`/api/p2p/offers/${offer.offer_id}`);
      await load();
    } catch (err) {
      setError(err.message || "Erreur suppression offre");
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mes Offres</h1>
          <p className="text-sm text-slate-600 mt-1">Gerez vos offres USDC/USDT avec une vue claire.</p>
        </div>
        <button
          className="px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-sm"
          onClick={() => navigate("/app/p2p/offers/new")}
        >
          Nouvelle offre
        </button>
      </div>

      {loading && <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">Chargement...</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {!loading && !error && offers.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">Aucune offre trouvee.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <div key={offer.offer_id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sideBadgeClass(offer.side)}`}>
                  {sideLabel(offer.side)}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tokenBadgeClass(offer.token)}`}>
                  {offer.token}
                </span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadgeClass(offer.is_active)}`}>
                {offer.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
              <div className="text-sm text-slate-700">
                Prix: <b>{offer.price_bif_per_usd}</b> BIF/USD
              </div>
              <div className="text-sm text-slate-700">
                Limites: {offer.min_token_amount} - {offer.max_token_amount}
              </div>
              <div className="text-sm text-slate-700">
                Disponible: <b>{offer.available_amount}</b>
              </div>
            </div>

            <div className="text-sm text-slate-700">{paymentLabel(offer.payment_method)}</div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-sm"
                onClick={() => navigate("/app/p2p")}
              >
                Voir le marche P2P
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-sm"
                onClick={() => navigate(`/app/p2p/offers/${offer.offer_id}/edit`)}
              >
                Modifier
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm"
                onClick={() => navigate("/app/p2p/offers/new", { state: { prefillOffer: offer } })}
              >
                Dupliquer
              </button>
              <button
                type="button"
                disabled={actionId === offer.offer_id}
                className="px-3 py-2 rounded-lg font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => toggleOffer(offer)}
              >
                {offer.is_active ? "Mettre en pause" : "Reprendre"}
              </button>
              <button
                type="button"
                disabled={actionId === offer.offer_id}
                className="px-3 py-2 rounded-lg font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                onClick={() => deleteOffer(offer)}
              >
                Supprimer
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Une offre personnelle ne peut pas etre acceptee par son proprietaire.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
