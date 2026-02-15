import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function P2PMyTrades() {
  const navigate = useNavigate();
  const [tradeId, setTradeId] = useState("");

  const openTrade = () => {
    const id = tradeId.trim();
    if (!id) return;
    navigate(`/app/p2p/trades/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Mes Trades</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-slate-700">
          Liste complete des trades: endpoint backend de listing personnel non expose pour l'instant.
        </p>
        <p className="text-slate-700">
          Tu peux ouvrir une room si tu as deja un ID de trade.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Trade ID"
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={openTrade}>
            Ouvrir
          </button>
        </div>
      </div>
    </div>
  );
}
