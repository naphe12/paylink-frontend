import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";

import api from "@/services/api";
import {
  TABLE_CELL_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_ROW_CLASS,
  TABLE_SHELL_CLASS,
} from "@/components/ui/tableStyles";

function formatAmount(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })} ${currency || ""}`.trim();
}

export default function BalanceHistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    source: "all",
    direction: "all",
    currency: "all",
    dateFrom: "",
    dateTo: "",
    limit: 100,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .get(`/wallet/balance-events?limit=${Number(filters.limit) || 100}&offset=0`)
      .then((data) => {
        if (mounted) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Erreur inconnue");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters.limit, reloadToken]);

  const sourceOptions = useMemo(() => {
    const set = new Set(rows.map((row) => String(row.source || "").trim()).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const currencyOptions = useMemo(() => {
    const set = new Set(rows.map((row) => String(row.currency || "").trim()).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = String(filters.search || "").trim().toLowerCase();
    const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

    return rows.filter((row) => {
      const source = String(row.source || "").trim();
      const currency = String(row.currency || "").trim();
      const delta = Number(row.amount_delta || 0);
      const occurredAt = row.occurred_at ? new Date(row.occurred_at) : null;

      if (filters.source !== "all" && source !== filters.source) return false;
      if (filters.currency !== "all" && currency !== filters.currency) return false;
      if (filters.direction === "credit" && !(delta >= 0)) return false;
      if (filters.direction === "debit" && !(delta < 0)) return false;
      if (dateFrom && (!occurredAt || occurredAt < dateFrom)) return false;
      if (dateTo && (!occurredAt || occurredAt > dateTo)) return false;

      if (!needle) return true;
      const haystack = [
        source,
        currency,
        row.event_id,
        row.reference_id,
        row.source_context ? JSON.stringify(row.source_context) : "",
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(needle);
    });
  }, [filters, rows]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        const delta = Number(row.amount_delta || 0);
        if (!Number.isFinite(delta)) return acc;
        if (delta >= 0) acc.credit += delta;
        else acc.debit += Math.abs(delta);
        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [filteredRows]);

  const hasActiveFilters =
    filters.search ||
    filters.source !== "all" ||
    filters.direction !== "all" ||
    filters.currency !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Suivi de vos mouvements de balance</p>
          <h1 className="text-xl font-semibold text-slate-900">Historique de balance</h1>
        </div>
        <button
          type="button"
          onClick={() => setReloadToken((token) => token + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Rafraichir
        </button>
      </header>

      {loading && <div className="text-slate-600">Chargement...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2">
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Search size={12} />
                Recherche
              </span>
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Source, event_id, reference..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]"
              />
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Filter size={12} />
                Sens
              </span>
              <select
                value={filters.direction}
                onChange={(event) => setFilters((prev) => ({ ...prev, direction: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="credit">Credits</option>
                <option value="debit">Debits</option>
              </select>
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Source
              </span>
              <select
                value={filters.source}
                onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Toutes</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Devise
              </span>
              <select
                value={filters.currency}
                onChange={(event) => setFilters((prev) => ({ ...prev, currency: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Toutes</option>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Lignes API
              </span>
              <select
                value={filters.limit}
                onChange={(event) => setFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 100 }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {[20, 50, 100, 200].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Date debut
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Date fin
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    search: "",
                    source: "all",
                    direction: "all",
                    currency: "all",
                    dateFrom: "",
                    dateTo: "",
                  }))
                }
                disabled={!hasActiveFilters}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reinitialiser filtres
              </button>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Total credits</p>
              <p className="text-sm font-semibold text-emerald-700">{summary.credit.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-rose-700">Total debits</p>
              <p className="text-sm font-semibold text-rose-700">{summary.debit.toLocaleString()}</p>
            </div>
          </div>

          <div className={TABLE_SHELL_CLASS}>
            <table className={TABLE_CLASS}>
              <thead className={TABLE_HEAD_CLASS}>
                <tr>
                  <th className={TABLE_HEADER_CELL_CLASS}>Date</th>
                  <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Balance avant</th>
                  <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Delta</th>
                  <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Balance apres</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.event_id} className={TABLE_ROW_CLASS}>
                    <td className="px-4 py-3 text-slate-800">
                      {row.occurred_at ? new Date(row.occurred_at).toLocaleString() : "-"}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                      {formatAmount(row.balance_before, row.currency)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        Number(row.amount_delta || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatAmount(row.amount_delta, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {formatAmount(row.balance_after, row.currency)}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                        {row.source || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Aucun mouvement de balance correspondant aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
