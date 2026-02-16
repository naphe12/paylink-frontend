import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

export default function P2PMyOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const payOffer = async (offer) => {
    const input = window.prompt(`Montant ${offer.token} a payer ?`);
    if (!input) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Montant invalide.");
      return;
    }

    try {
      const trade = await api.post("/api/p2p/trades", {
        offer_id: offer.offer_id,
        token_amount: amount,
      });
      navigate(`/app/p2p/trades/${trade.trade_id}`);
    } catch (err) {
      window.alert(err.message || "Erreur creation trade.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const me = await api.get("/auth/me");
        const all = await api.get("/api/p2p/offers");
        const mine = (Array.isArray(all) ? all : []).filter((o) => o.user_id === me.user_id);
        setOffers(mine);
      } catch (err) {
        setError(err.message || "Erreur chargement offres");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mes Offres</h1>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={() => navigate("/app/p2p/offers/new")}>
          Nouvelle offre
        </button>
      </div>

      {loading && <div className="bg-white border border-slate-200 rounded-xl p-4">Chargement...</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {!loading && !error && offers.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">Aucune offre trouvee.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <div key={offer.offer_id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="font-semibold">
              {offer.side} {offer.token}
            </div>
            <div className="text-sm text-slate-700">Prix: {offer.price_bif_per_usd} BIF/USD</div>
            <div className="text-sm text-slate-700">
              Limites: {offer.min_token_amount} - {offer.max_token_amount}
            </div>
            <div className="text-sm text-slate-700">Disponible: {offer.available_amount}</div>
            <div className="text-sm text-slate-700">Paiement BIF: {offer.payment_method === "ECOCASH" ? "eNOTI" : offer.payment_method}</div>
            <div className="text-sm text-slate-500">Status: {offer.is_active ? "ACTIVE" : "INACTIVE"}</div>
            <button
              onClick={() => payOffer(offer)}
              disabled={!offer.is_active}
              className="mt-2 w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Payer l'offre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
