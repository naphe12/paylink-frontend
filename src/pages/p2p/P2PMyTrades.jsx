import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const statusBadgeClass = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (["RELEASED", "RESOLVED"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  if (["DISPUTED"].includes(normalized)) {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }
  if (["EXPIRED", "CANCELLED"].includes(normalized)) {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  return "bg-amber-100 text-amber-800 border border-amber-200";
};

export default function P2PMyTrades() {
  const navigate = useNavigate();
  const [tradeId, setTradeId] = useState("");
  const [trades, setTrades] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTrades = async (nextFilter = filter) => {
    setLoading(true);
    setError("");
    try {
      const query = nextFilter ? `?status=${encodeURIComponent(nextFilter)}` : "";
      const data = await api.get(`/api/p2p/trades/mine${query}`);
      setTrades(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erreur chargement trades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades(filter);
  }, [filter]);

  const openTrade = () => {
    const id = tradeId.trim();
    if (!id) return;
    navigate(`/app/p2p/trades/${id}`);
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
          onClick={() => loadTrades(filter)}
          disabled={loading}
        >
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-3">
        <p className="text-slate-700">
          Entrez un identifiant de trade pour ouvrir directement la room, ou utilisez la liste synchronisee depuis l'API.
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
        <div className="flex flex-wrap gap-2">
          {[
            ["open", "Ouverts"],
            ["closed", "Termines"],
            ["", "Tous"],
          ].map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                filter === value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {trades.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-600">
          Aucun trade trouve pour ce filtre.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Mes trades</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {trades.map((trade) => (
              <div key={trade.trade_id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Trade ID</div>
                  <div className="font-mono text-sm text-slate-800 break-all">{trade.trade_id}</div>
                  <div className="text-sm text-slate-600">
                    {trade.token_amount} {trade.token} - {trade.bif_amount} BIF
                  </div>
                  <div className="text-xs text-slate-500">
                    Cree le {trade.created_at ? new Date(trade.created_at).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadgeClass(trade.status)}`}>
                    {trade.status}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm"
                    onClick={() => navigate(`/app/p2p/trades/${trade.trade_id}`)}
                  >
                    Ouvrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Les trades sont maintenant recuperes depuis l'API P2P et non plus depuis le stockage local du navigateur.
      </div>
    </div>
  );
}
