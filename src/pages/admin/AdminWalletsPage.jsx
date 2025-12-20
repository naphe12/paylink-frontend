import { useEffect, useState } from "react";
import api from "@/services/api";

const DEFAULT_HISTORY_FILTERS = { limit: 25, search: "" };

const alertBadge = (level) => {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  switch (level) {
    case "critical":
      return `${base} bg-red-100 text-red-700`;
    case "warning":
      return `${base} bg-yellow-100 text-yellow-700`;
    default:
      return `${base} bg-emerald-100 text-emerald-700`;
  }
};

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [threshold, setThreshold] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState(() => ({
    ...DEFAULT_HISTORY_FILTERS,
  }));
  const [historyForm, setHistoryForm] = useState(() => ({
    ...DEFAULT_HISTORY_FILTERS,
  }));
  const [historyReload, setHistoryReload] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, walletsData] = await Promise.all([
        api.get("/admin/wallets/summary"),
        api.get(
          threshold === "" ? "/admin/wallets" : `/admin/wallets?min_available=${threshold}`
        ),
      ]);
      setSummary(summaryData);
      setWallets(walletsData);
    } catch (err) {
      console.error("Erreur chargement wallets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [threshold]);

  useEffect(() => {
    if (!selectedWallet) return;
    let active = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = await api.getAdminWalletHistory(
          selectedWallet.wallet_id,
          historyFilters
        );
        if (active) {
          setHistory(data);
        }
      } catch (err) {
        console.error("Erreur chargement historique wallet:", err);
        if (active) {
          setHistory([]);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [selectedWallet, historyFilters, historyReload]);

  const handleSelectWallet = (wallet) => {
    setSelectedWallet(wallet);
    setHistory([]);
    setHistoryFilters({ ...DEFAULT_HISTORY_FILTERS });
    setHistoryForm({ ...DEFAULT_HISTORY_FILTERS });
  };

  const handleHistoryFilterSubmit = (e) => {
    e.preventDefault();
    setHistoryFilters({
      limit: Number(historyForm.limit) || DEFAULT_HISTORY_FILTERS.limit,
      search: historyForm.search.trim(),
    });
  };

  const handleRefreshHistory = () => setHistoryReload((n) => n + 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Portefeuilles sous surveillance
          </h1>
          <p className="text-sm text-slate-500">
            Suivi des soldes en-dessous des seuils définis et alertes critiques.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Seuil max. (≤ solde)</label>
          <input
            type="number"
            className="border rounded-lg px-3 py-2 w-32 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Vide = top 50"
          />
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Portefeuilles totaux"
            value={summary.total_wallets}
            accent="bg-indigo-100 text-indigo-700"
          />
          <StatCard
            label="Soldes négatifs"
            value={summary.negative_wallets}
            accent="bg-red-100 text-red-700"
          />
          <StatCard
            label="Solde < 10 000"
            value={summary.low_balance_wallets}
            accent="bg-yellow-100 text-yellow-700"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Utilisateur</th>
              <th className="p-3 text-left">Wallet</th>
              <th className="p-3 text-left">Disponible</th>
              <th className="p-3 text-left">En attente</th>
              <th className="p-3 text-left">Alerte</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : wallets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Aucun portefeuille sous ce seuil.
                </td>
              </tr>
            ) : (
              wallets.map((w) => {
                const isSelected =
                  selectedWallet && selectedWallet.wallet_id === w.wallet_id;
                return (
                  <tr
                    key={w.wallet_id}
                    className={`border-t hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {w.user_name || "Sans utilisateur"}
                      </div>
                      <div className="text-xs text-slate-500">{w.user_email}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-slate-800">{w.wallet_id.slice(0, 8)}…</div>
                      <div className="text-xs text-slate-500">
                        {w.type?.toUpperCase()} · {w.currency}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {Number(w.available).toLocaleString()} {w.currency}
                    </td>
                    <td className="p-3 text-slate-600">
                      {Number(w.pending).toLocaleString()} {w.currency}
                    </td>
                    <td className="p-3">
                      <span className={alertBadge(w.alert)}>
                        {w.alert === "critical"
                          ? "Critique"
                          : w.alert === "warning"
                          ? "Surveillance"
                          : "OK"}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        className="text-sm text-blue-600 underline"
                        onClick={() => handleSelectWallet(w)}
                      >
                        {isSelected ? "Historique affiché" : "Voir historique"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow border p-4">
        {selectedWallet ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Historique du wallet {selectedWallet.wallet_id.slice(0, 8)}…
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedWallet.user_name || "Sans utilisateur"} ·{" "}
                  {selectedWallet.user_email || "N/A"}
                </p>
              </div>
              <form
                onSubmit={handleHistoryFilterSubmit}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Recherche"
                  className="border rounded-lg px-3 py-1 text-sm"
                  value={historyForm.search}
                  onChange={(e) =>
                    setHistoryForm((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                />
                <select
                  className="border rounded-lg px-2 py-1 text-sm"
                  value={historyForm.limit}
                  onChange={(e) =>
                    setHistoryForm((prev) => ({
                      ...prev,
                      limit: e.target.value,
                    }))
                  }
                >
                  {[25, 50, 100, 200].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} lignes
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-slate-900 text-white text-sm"
                >
                  Filtrer
                </button>
                <button
                  type="button"
                  onClick={handleRefreshHistory}
                  className="px-3 py-1 rounded-lg border text-sm text-slate-600"
                >
                  Rafraîchir
                </button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Sens</th>
                    <th className="p-2 text-left">Montant</th>
                    <th className="p-2 text-left">Solde après</th>
                    <th className="p-2 text-left">Référence</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        Chargement de l&apos;historique...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        Aucun mouvement enregistré pour ce wallet.
                      </td>
                    </tr>
                  ) : (
                    history.map((entry) => {
                      const direction = (entry.direction || "").toLowerCase();
                      const operation = (entry.operation_type || "").toLowerCase();
                      const isDepositOp =
                        operation.includes("deposit") ||
                        operation.includes("cash_request") ||
                        operation.includes("wallet_cash_request");
                      const amountNum = Number(entry.amount);
                      const amountAbs = Math.abs(amountNum);
                      const isCredit =
                        direction === "credit" ||
                        (direction === "" && amountNum >= 0) ||
                        isDepositOp;

                      return (
                        <tr key={entry.transaction_id} className="border-t">
                          <td className="p-2 text-slate-600">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{entry.operation_type}</div>
                            <div className="text-xs text-slate-500">
                              {entry.description}
                            </div>
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isCredit
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {isCredit ? "Crédit" : "Débit"}
                            </span>
                          </td>
                          <td
                            className={`p-2 font-semibold ${
                              isCredit ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {amountAbs.toLocaleString()} {selectedWallet.currency}
                          </td>
                          <td className="p-2">
                            {Number(entry.balance_after).toLocaleString()}{" "}
                            {selectedWallet.currency}
                          </td>
                          <td className="p-2 text-slate-500">
                            {entry.reference || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Sélectionnez un wallet dans la liste pour afficher son historique.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${accent}`}>
      <p className="text-xs uppercase tracking-wide text-slate-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
