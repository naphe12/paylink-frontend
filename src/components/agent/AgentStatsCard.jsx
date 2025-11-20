import { useEffect, useState } from "react";
import api from "@/services/api";
import { Wallet, PiggyBank, History } from "lucide-react";

export default function AgentStatsCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/agent/dashboard").then(setData);
  }, []);

  if (!data) return <p className="p-4">Chargement...</p>;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
      <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
        <PiggyBank size={20} /> Statistiques Agent
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border rounded-lg text-center">
          <p className="text-xs text-gray-500">Solde Agent</p>
          <p className="text-2xl font-bold text-green-600">
            {data.balance.toLocaleString()} BIF
          </p>
        </div>

        <div className="p-3 border rounded-lg text-center">
          <p className="text-xs text-gray-500">Commissions totales</p>
          <p className="text-2xl font-bold text-purple-600">
            {data.total_commissions.toLocaleString()} BIF
          </p>
        </div>
      </div>

      <h3 className="pt-2 text-md font-semibold flex items-center gap-2">
        <History size={18} /> Historique récent
      </h3>

      <ul className="space-y-2 max-h-40 overflow-auto">
        {data.recent.map((r, i) => (
          <li key={i} className="flex justify-between border-b pb-1">
            <span>{r.type}</span>
            <span className="font-medium">{r.amount} BIF</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
