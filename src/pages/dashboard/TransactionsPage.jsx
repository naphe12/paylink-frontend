// src/pages/TransactionsPage.jsx
import { useEffect, useState } from "react";
import api from "@/services/api";

import { RefreshCcw } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const data = await api.get("/wallet/transactions");
      // Adapter au shape renvoyé par l'API /wallet/transactions
      const normalized = data.map((t) => ({
        transaction_id: t.tx_id || t.transaction_id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        created_at: t.created_at,
        type: t.direction === "in" ? "entrante" : "sortante",
        amount: t.direction === "in" ? t.amount : -t.amount,
        status: t.status || "",
      }));
      setTransactions(normalized);
    } catch (err) {
      console.warn("API /wallet/transactions indisponible, tentative /transactions/ :", err);
      try {
        const fallback = await api.get("/transactions/");
        setTransactions(
          fallback.map((t) => ({
            transaction_id: t.transaction_id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            created_at: t.created_at,
            type: t.type || "",
            amount: t.amount,
            status: t.status || "",
          }))
        );
      } catch (err2) {
        console.error("Erreur chargement transactions (fallback) :", err2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-6 flex items-center gap-2">
        <RefreshCcw /> Historique des transactions
      </h2>

      <div className="bg-white p-5 rounded-2xl shadow">
        {loading ? (
          <p>Chargement...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500">Aucune transaction disponible.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Montant</th>
                <th className="p-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.transaction_id} className="border-t">
                  <td className="p-2">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="p-2 capitalize">{t.type}</td>
                  <td
                    className={`p-2 font-semibold ${
                      t.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {Number(t.amount).toFixed(2)} €
                  </td>
                  <td className="p-2">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

