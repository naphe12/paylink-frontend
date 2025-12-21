import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import { Sparklines, SparklinesLine } from "react-sparklines";

export default function WalletLedgerPage() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);

  const loadData = () => {
    api.get(`/wallet/ledger/${id}`).then(setEntries);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const applyFilter = (days) => {
    const to = new Date().toISOString();
    const from = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    api
      .get(`/wallet/ledger/${id}?from_date=${from}&to_date=${to}`)
      .then(setEntries);
  };

  const search = (value) => {
    value = value.trim();
    if (value.length === 0) return loadData();
    api.get(`/wallet/ledger/${id}?search=${value}`).then(setEntries);
  };

  const exportPDF = () => {
    window.open(
      `${import.meta.env.VITE_API_URL}/wallet/ledger/${id}/pdf`,
      "_blank"
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-[#0b3b64] mb-4">
        Historique du Wallet
      </h2>

      {/* Graph Sparkline */}
      {entries.length > 0 && (
        <div className="bg-white border rounded p-4 mb-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Évolution du solde</p>
          <Sparklines
            data={entries.map((e) => Number(e.balance_after))}
            height={50}
          >
            <SparklinesLine />
          </Sparklines>
        </div>
      )}

      {/* Recherche */}
      <input
        type="text"
        placeholder="Rechercher (montant, référence...)"
        className="border px-3 py-2 rounded w-full mb-3"
        onChange={(e) => search(e.target.value)}
      />

      {/* Filtres période */}
      <div className="flex gap-2 mb-4">
        <button className="btn-light" onClick={() => applyFilter(1)}>
          Aujourd’hui
        </button>
        <button className="btn-light" onClick={() => applyFilter(7)}>
          7 jours
        </button>
        <button className="btn-light" onClick={() => applyFilter(30)}>
          30 jours
        </button>
        <button className="btn-light" onClick={loadData}>
          Tout
        </button>
      </div>

      {/* Export PDF */}
      <button
        onClick={exportPDF}
        className="px-3 py-2 bg-[#0b3b64] text-white rounded mb-4"
      >
        📄 Export PDF
      </button>

      {/* Liste transactions */}
      <div className="space-y-3">
        {entries.map((e) => {
          const amt = Number(e.amount || 0);
          const isCredit = amt > 0;
          const display = Math.abs(amt).toFixed(2);
          return (
            <div
              key={e.transaction_id || e.tx_id}
              className="p-3 bg-white border rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-gray-600">
                  {new Date(e.created_at).toLocaleString()}
                </p>
                <p className="font-medium">{e.reference || "Transaction"}</p>
              </div>

              <div className="text-right">
                <p
                  className={
                    isCredit ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                  }
                >
                  {isCredit ? "+" : "-"} {display}
                </p>
                <p className="text-xs text-gray-500">
                  Solde: {Number(e.balance_after).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-gray-500 mt-6">
          Aucune transaction trouvée
        </p>
      )}
    </div>
  );
}
