import { useEffect, useState } from "react";
import api from "@/services/api";
import { History, RefreshCw } from "lucide-react";

const DEFAULT_FILTERS = { limit: 20, search: "" };

export default function WalletHistoryTable({ walletId, currency }) {
  const effectiveCurrency = currency || "";
  const [entries, setEntries] = useState([]);
  const [creditSummary, setCreditSummary] = useState(null);
  const [creditEvents, setCreditEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [formFilters, setFormFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
  }));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!walletId) return;
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getWalletLedger(walletId, appliedFilters);
        if (active) {
          setEntries(data);
        }
      } catch (err) {
        console.error("Erreur chargement historique wallet:", err);
        if (active) {
          setEntries([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const loadCredit = async () => {
      try {
        const data = await api.getCreditLineEvents({ limit: 50 });
        if (!active) return;
        setCreditSummary(data.summary);
        setCreditEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        console.error("Erreur chargement credit line:", err);
        if (active) {
          setCreditSummary(null);
          setCreditEvents([]);
        }
      }
    };

    loadHistory();
    loadCredit();
    return () => {
      active = false;
    };
  }, [walletId, appliedFilters, reloadToken]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters({
      limit: Number(formFilters.limit) || DEFAULT_FILTERS.limit,
      search: formFilters.search.trim(),
    });
  };

  const badge =
    entries.length > 0
      ? `${entries.length} operations`
      : "Aucun mouvement sur la periode";

  const formatAmount = (value) => {
    const num = Number(value || 0);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white rounded-xl shadow border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <History size={20} /> Historique du portefeuille
          </h3>
          <p className="text-xs text-slate-500">{badge}</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={formFilters.search}
              onChange={(e) =>
                setFormFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Reference ou type"
              className="border rounded-lg px-3 py-1 text-sm"
            />
            <select
              value={formFilters.limit}
              onChange={(e) =>
                setFormFilters((prev) => ({ ...prev, limit: e.target.value }))
              }
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option} lignes
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-slate-900 text-white text-sm"
            >
              Filtrer
            </button>
          </form>
          <button
            className="p-2 rounded-lg border text-slate-600 hover:bg-slate-50"
            title="Rafraichir"
            onClick={() => setReloadToken((n) => n + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {creditSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard
            label="Montant initial"
            value={formatAmount(creditSummary.initial_amount)}
            currency={creditSummary.currency_code}
          />
          <SummaryCard
            label="Utilisé"
            value={formatAmount(creditSummary.used_amount)}
            currency={creditSummary.currency_code}
          />
          <SummaryCard
            label="Restant"
            value={formatAmount(creditSummary.outstanding_amount)}
            currency={creditSummary.currency_code}
          />
        </div>
      )}

      {creditEvents.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Historique ligne de crédit</h4>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Δ Montant</th>
                  <th className="p-2 text-left">Ancien plafond</th>
                  <th className="p-2 text-left">Nouveau plafond</th>
                  <th className="p-2 text-left">Statut</th>
                  <th className="p-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {creditEvents.map((ev) => {
                  const delta = Number(ev.amount_delta || 0);
                  const isCredit = delta > 0;
                  return (
                    <tr key={ev.event_id} className="border-t">
                      <td className="p-2 text-slate-600">
                        {ev.occurred_at
                          ? new Date(ev.occurred_at).toLocaleString()
                          : ev.created_at
                          ? new Date(ev.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td
                        className={`p-2 font-semibold ${
                          isCredit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"} {formatAmount(Math.abs(delta))} {ev.currency_code}
                      </td>
                      <td className="p-2 text-slate-700">
                        {ev.old_limit != null ? formatAmount(ev.old_limit) : "-"}
                      </td>
                      <td className="p-2 text-slate-700">
                        {ev.new_limit != null ? formatAmount(ev.new_limit) : "-"}
                      </td>
                      <td className="p-2 text-slate-600">{ev.status || "-"}</td>
                      <td className="p-2 text-slate-600">{ev.source || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Direction</th>
              <th className="p-2 text-left">Montant</th>
              <th className="p-2 text-left">Solde apres</th>
              <th className="p-2 text-left">Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Aucun mouvement enregistre pour ce portefeuille.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.transaction_id} className="border-t">
                  <td className="p-2 text-slate-600">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 font-medium">
                    {entry.operation_type || "-"}
                    <p className="text-xs text-slate-400">
                      {entry.description}
                    </p>
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        entry.direction === "credit"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.direction === "credit" ? "Credit" : "Debit"}
                    </span>
                  </td>
                  <td
                    className={`p-2 font-semibold ${
                      entry.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {entry.direction === "credit" ? "+" : " "}
                    {Number(entry.amount).toLocaleString()} {effectiveCurrency}
                  </td>
                  <td className="p-2 text-slate-700">
                    {Number(entry.balance_after).toLocaleString()} {effectiveCurrency}
                  </td>
                  <td className="p-2 text-slate-500">{entry.reference || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
