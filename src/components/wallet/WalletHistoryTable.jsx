import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Filter, History, RefreshCw, Search } from "lucide-react";
import { formatWalletOperationLabel, inferWalletEntryIsCredit } from "@/utils/walletHistory";
import {
  TABLE_CELL_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_ROW_CLASS,
  TABLE_SHELL_CLASS,
} from "@/components/ui/tableStyles";

const DEFAULT_FILTERS = {
  limit: 20,
  search: "",
  direction: "all",
  dateFrom: "",
  dateTo: "",
};

function matchesDateRange(createdAt, dateFrom, dateTo) {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date) return false;
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function WalletHistoryTable({
  walletId,
  currency,
  tokenSymbol = null,
  title = "Historique du portefeuille",
}) {
  const effectiveCurrency = currency || "";
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
  const [formFilters, setFormFilters] = useState({ ...DEFAULT_FILTERS });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!walletId && !tokenSymbol) return;
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = tokenSymbol
          ? await api.getCryptoWalletHistory(tokenSymbol, {
              limit: appliedFilters.limit,
              search: appliedFilters.search,
            })
          : await api.getWalletLedger(walletId, {
              limit: appliedFilters.limit,
              search: appliedFilters.search,
            });
        if (active) setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur chargement historique wallet:", err);
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [walletId, tokenSymbol, appliedFilters, reloadToken]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const isCredit = inferWalletEntryIsCredit(entry);
      if (appliedFilters.direction === "credit" && !isCredit) return false;
      if (appliedFilters.direction === "debit" && isCredit) return false;
      if (appliedFilters.dateFrom || appliedFilters.dateTo) {
        return matchesDateRange(entry.created_at, appliedFilters.dateFrom, appliedFilters.dateTo);
      }
      return true;
    });
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.direction, entries]);

  const summary = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => {
        const amount = Math.abs(Number(entry.amount || 0));
        if (!Number.isFinite(amount)) return acc;
        if (inferWalletEntryIsCredit(entry)) acc.credit += amount;
        else acc.debit += amount;
        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [filteredEntries]);

  const hasActiveFilters =
    appliedFilters.search ||
    appliedFilters.direction !== "all" ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo ||
    Number(appliedFilters.limit) !== Number(DEFAULT_FILTERS.limit);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters({
      limit: Number(formFilters.limit) || DEFAULT_FILTERS.limit,
      search: formFilters.search.trim(),
      direction: formFilters.direction,
      dateFrom: formFilters.dateFrom,
      dateTo: formFilters.dateTo,
    });
  };

  const handleResetFilters = () => {
    setFormFilters({ ...DEFAULT_FILTERS });
    setAppliedFilters({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <History size={20} /> {title}
          </h3>
          <p className="text-xs text-slate-500">
            {filteredEntries.length > 0
              ? `${filteredEntries.length} operation(s) affichee(s)`
              : "Aucun mouvement sur la periode"}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          title="Rafraichir"
          onClick={() => setReloadToken((n) => n + 1)}
        >
          <RefreshCw size={16} />
          Rafraichir
        </button>
      </div>

      <form onSubmit={handleApplyFilters} className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="xl:col-span-2">
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Search size={12} />
              Recherche
            </span>
            <input
              type="text"
              value={formFilters.search}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Reference ou type"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]"
            />
          </label>

          <label>
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Filter size={12} />
              Sens
            </span>
            <select
              value={formFilters.direction}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, direction: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
          </label>

          <label>
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Lignes API
            </span>
            <select
              value={formFilters.limit}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, limit: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Date debut
            </span>
            <input
              type="date"
              value={formFilters.dateFrom}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label>
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Date fin
            </span>
            <input
              type="date"
              value={formFilters.dateTo}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-end gap-2 xl:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reinitialiser
            </button>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Credits</p>
            <p className="text-sm font-semibold text-emerald-700">
              {summary.credit.toLocaleString()} {effectiveCurrency}
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-rose-700">Debits</p>
            <p className="text-sm font-semibold text-rose-700">
              {summary.debit.toLocaleString()} {effectiveCurrency}
            </p>
          </div>
        </div>
      </form>

      <div className={TABLE_SHELL_CLASS}>
        <table className={TABLE_CLASS}>
          <thead className={TABLE_HEAD_CLASS}>
            <tr>
              <th className={TABLE_HEADER_CELL_CLASS}>Date</th>
              <th className={TABLE_HEADER_CELL_CLASS}>Type</th>
              <th className={TABLE_HEADER_CELL_CLASS}>Direction</th>
              <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Montant</th>
              <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Solde apres</th>
              <th className={TABLE_HEADER_CELL_CLASS}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Aucun mouvement enregistre pour ce portefeuille.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const amount = Number(entry.amount || 0);
                const isCredit = inferWalletEntryIsCredit(entry);
                return (
                  <tr key={entry.transaction_id || entry.tx_id} className={TABLE_ROW_CLASS}>
                    <td className={TABLE_CELL_CLASS}>{new Date(entry.created_at).toLocaleString()}</td>
                    <td className={TABLE_CELL_CLASS}>
                      <p className="font-medium text-slate-800">
                        {formatWalletOperationLabel(entry.operation_type)}
                      </p>
                      <p className="text-xs text-slate-500">{entry.description || "-"}</p>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isCredit ? "Credit" : "Debit"}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        isCredit ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"} {Math.abs(amount).toLocaleString()} {effectiveCurrency}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                      {Number(entry.balance_after).toLocaleString()} {effectiveCurrency}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-slate-600`}>{entry.reference || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
