import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const formatPaymentMethod = (m) => (m === "ECOCASH" ? "eNOTI" : m);

export default function P2PMarket() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [side, setSide] = useState("");
  const [meId, setMeId] = useState("");

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (token) params.append("token", token);
      if (side) params.append("side", side);
      const query = params.toString();
      const data = await api.get(`/api/p2p/offers${query ? `?${query}` : ""}`);
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de charger les offres");
    } finally {
      setLoading(false);
    }
  }, [side, token]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await api.get("/auth/me");
        if (me?.user_id) setMeId(me.user_id);
      } catch {
        // no-op
      }
    };
    loadMe();
  }, []);

  const emptyText = useMemo(() => {
    if (loading) return "Chargement des offres...";
    if (offers.length === 0) return "Aucune offre disponible.";
    return "";
  }, [loading, offers.length]);

  const createTrade = async (offer) => {
    const input = window.prompt(`Montant ${offer.token} a trader ?`);
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
      window.alert(err.message || "Erreur lors de la creation du trade.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Marche P2P</h1>
        <button
          className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => navigate("/app/p2p/offers/new")}
        >
          Creer une offre
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className="border border-slate-300 rounded-lg px-3 py-2"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        >
          <option value="">Tous les tokens</option>
          <option value="USDC">USDC</option>
          <option value="USDT">USDT</option>
        </select>

        <select
          className="border border-slate-300 rounded-lg px-3 py-2"
          value={side}
          onChange={(e) => setSide(e.target.value)}
        >
          <option value="">Tous les sens</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>

        <button
          className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          onClick={loadOffers}
          disabled={loading}
        >
          Rafraichir
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}
      {emptyText && <div className="p-4 bg-white rounded-xl border border-slate-200">{emptyText}</div>}

      {offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer.offer_id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  {offer.side} {offer.token}
                </span>
                <span className="text-sm px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {formatPaymentMethod(offer.payment_method)}
                </span>
              </div>
              <div className="text-sm text-slate-700">
                Prix: <b>{offer.price_bif_per_usd}</b> BIF/USD
              </div>
              <div className="text-sm text-slate-700">
                Limites: {offer.min_token_amount} - {offer.max_token_amount} {offer.token}
              </div>
              <div className="text-sm text-slate-700">
                Disponible: <b>{offer.available_amount}</b> {offer.token}
              </div>
              {offer.terms && <div className="text-sm text-slate-600">{offer.terms}</div>}
              <button
                className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => createTrade(offer)}
                disabled={offer.user_id === meId}
              >
                {offer.user_id === meId
                  ? "Votre propre offre"
                  : offer.side === "SELL"
                    ? "Acheter"
                    : "Vendre"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
