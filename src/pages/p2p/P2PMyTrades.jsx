import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const RECENT_TRADES_KEY = "p2p_recent_trade_ids";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const loadRecentTradeIds = () => {
  try {
    const raw = localStorage.getItem(RECENT_TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return safeArray(parsed).map((id) => String(id).trim()).filter(Boolean);
  } catch {
    return [];
  }
};

const persistRecentTradeIds = (ids) => {
  localStorage.setItem(RECENT_TRADES_KEY, JSON.stringify(ids));
};

export default function P2PMyTrades() {
  const navigate = useNavigate();
  const [tradeId, setTradeId] = useState("");
  const [recentIds, setRecentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meId, setMeId] = useState("");

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await api.get("/auth/me");
        if (me?.user_id) setMeId(String(me.user_id));
      } catch {
        // no-op
      }
    };
    loadMe();
    setRecentIds(loadRecentTradeIds());
  }, []);

  const trades = useMemo(() => {
    return recentIds.map((id) => ({ trade_id: id }));
  }, [recentIds]);

  const addRecentId = (id) => {
    const next = [id, ...recentIds.filter((x) => x !== id)].slice(0, 20);
    setRecentIds(next);
    persistRecentTradeIds(next);
  };

  const removeRecentId = (id) => {
    const next = recentIds.filter((x) => x !== id);
    setRecentIds(next);
    persistRecentTradeIds(next);
  };

  const openTrade = () => {
    const id = tradeId.trim();
    if (!id) return;
    addRecentId(id);
    navigate(`/app/p2p/trades/${id}`);
  };

  const refreshRecent = async () => {
    setLoading(true);
    setError("");
    try {
      // Keep only IDs still accessible to the current user.
      const checks = await Promise.all(
        recentIds.map(async (id) => {
          try {
            const trade = await api.get(`/api/p2p/trades/${id}`);
            if (!trade) return null;
            if (!meId) return id;
            const isMine = String(trade.buyer_id) === meId || String(trade.seller_id) === meId;
            return isMine ? id : null;
          } catch {
            return null;
          }
        }),
      );
      const valid = checks.filter(Boolean);
      setRecentIds(valid);
      persistRecentTradeIds(valid);
    } catch (err) {
      setError(err.message || "Erreur de verification des trades recents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mes Trades</h1>
          <p className="text-sm text-slate-600 mt-1">Vue professionnelle de vos trades recents.</p>
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 shadow-sm"
          onClick={refreshRecent}
          disabled={loading}
        >
          {loading ? "Verification..." : "Verifier les trades"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-3">
        <p className="text-slate-700">
          Entrez un identifiant de trade pour ouvrir la room. Les IDs recents sont conserves automatiquement.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Trade ID"
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
          />
          <button
            className="px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-sm"
            onClick={openTrade}
          >
            Ouvrir room
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {trades.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-600">
          Aucun trade recent enregistre sur cet appareil.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Trades recents</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {trades.map((trade) => (
              <div key={trade.trade_id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Trade ID</div>
                  <div className="font-mono text-sm text-slate-800 break-all">{trade.trade_id}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm"
                    onClick={() => navigate(`/app/p2p/trades/${trade.trade_id}`)}
                  >
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50"
                    onClick={() => removeRecentId(trade.trade_id)}
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Liste complete via API non disponible actuellement. Cette vue affiche les trades recents ouverts depuis ce navigateur.
      </div>
    </div>
  );
}
