import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import DirectionBadge, { isCreditDirection } from "@/components/DirectionBadge";
import api from "@/services/api";

function normalizeTransactions(rows = []) {
  return rows.map((tx) => {
    const rawAmount = Number(tx.amount || 0);
    const amount =
      tx.direction === "out" && rawAmount > 0
        ? -rawAmount
        : tx.direction === "in" && rawAmount < 0
        ? Math.abs(rawAmount)
        : rawAmount;

    return {
      transaction_id:
        tx.tx_id || tx.transaction_id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      created_at: tx.created_at,
      type: tx.direction || tx.type || "",
      amount,
      status: tx.status || "",
      description: tx.description || "",
    };
  });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/wallet/transactions");
      setTransactions(normalizeTransactions(Array.isArray(data) ? data : []));
    } catch (err) {
      setTransactions([]);
      setError(err?.message || "Impossible de charger l'historique des transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div>
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-[#0b3b64]">
        <RefreshCcw /> Historique des transactions
      </h2>

      <div className="rounded-2xl bg-white p-5 shadow">
        <ApiErrorAlert
          message={error}
          onRetry={fetchTransactions}
          retryLabel="Recharger l'historique"
          className="mb-4"
        />
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
                <th className="p-2">Operation</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transaction_id} className="border-t">
                  <td className="p-2">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="p-2"><DirectionBadge value={tx.type} /></td>
                  <td className={`p-2 font-semibold ${isCreditDirection(tx.type) ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount > 0 ? "+" : ""}
                    {Number(tx.amount).toFixed(2)} EUR
                  </td>
                  <td className="p-2">{tx.status || "-"}</td>
                  <td className="p-2">{tx.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
