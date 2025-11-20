// src/components/TransactionsList.jsx
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const data = await api.get("/wallet/transactions");
      setTransactions(data);
    } catch (err) {
      console.error("Erreur transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) return <p>Chargement des transactions...</p>;
  if (transactions.length === 0) return <p>Aucune transaction récente.</p>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border w-full max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-[#0b3b64] mb-4 flex items-center gap-2">
        <Clock size={20}/> Historique des transactions
      </h3>

      <ul className="divide-y divide-gray-200">
        {transactions.map((tx) => (
          <li key={tx.transaction_id} className="py-3 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-800">
                {tx.type === "transfer" && tx.amount < 0 ? "Transfert envoyé" :
                 tx.type === "transfer" && tx.amount > 0 ? "Transfert reçu" :
                 tx.type === "topup" ? "Rechargement" :
                 tx.type === "payment_request" ? "Demande de paiement" : tx.type}
              </p>
              <p className="text-sm text-gray-500">
                {tx.details?.to ? `→ ${tx.details.to}` : tx.details?.from ? `← ${tx.details.from}` : ""}
              </p>
            </div>
            <div className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
              {tx.amount > 0 ? "+" : ""}{tx.amount} €
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
