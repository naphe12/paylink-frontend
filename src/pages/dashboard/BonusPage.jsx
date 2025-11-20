import { useState, useEffect } from "react";
import api from "@/services/api";

import { Gift, Send } from "lucide-react";

export default function BonusPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/wallet/bonus").then((d) => setBalance(d.bonus_balance));
    api.get("/wallet/bonus/history").then(setHistory);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Gift size={26}/> Bonus
      </h2>

      <div className="text-4xl font-bold text-blue-600 mb-6">
        {balance} BIF 🎁
      </div>

      <button className="bg-blue-600 text-white rounde-lg px-4 py-2 flex gap-2">
        <Send size={18}/> Envoyer bonus
      </button>

      <h3 className="text-xl font-semibold mt-8 mb-3">Historique</h3>
      <ul className="space-y-2">
        {history.map(h => (
          <li key={h.id} className="border-b py-2 flex justify-between">
            <span>{h.source === "earned" ? "✅ Gagné" : "📤 Utilisé"}</span>
            <span>{h.amount_bif} BIF</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
