import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
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
      amount,
      description: tx.description || "",
      status: tx.status || "",
    };
  });
}

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/wallet/transactions");
      setTransactions(normalizeTransactions(Array.isArray(data) ? data : []).slice(0, 5));
    } catch (err) {
      setTransactions([]);
      setError(err?.message || "Impossible de charger les transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) return <p>Chargement des transactions...</p>;

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0b3b64]">
        <Clock size={20} /> Historique des transactions
      </h3>

      <ApiErrorAlert
        message={error}
        onRetry={fetchTransactions}
        retryLabel="Recharger"
        className="mb-4"
      />

      {!error && transactions.length === 0 ? (
        <p>Aucune transaction recente.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {transactions.map((tx) => (
            <li key={tx.transaction_id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-gray-800">{tx.description || "Operation wallet"}</p>
                <p className="text-sm text-gray-500">{tx.status || "-"}</p>
              </div>
              <div className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toFixed(2)} EUR
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
