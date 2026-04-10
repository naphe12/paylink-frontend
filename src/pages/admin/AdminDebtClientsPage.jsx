import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import api from "@/services/api";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatAmount(value, currency = "") {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();
}

export default function AdminDebtClientsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const load = async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listAdminDebtBreakdown(q ? { q } : {});
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || "Erreur de chargement des dettes clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients endettes</h1>
          <p className="text-sm text-slate-500">
            Pour chaque client en dette: montant, date et operation, avec acces au detail.
          </p>
        </div>
        <button
          onClick={() => load(search)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer nom, email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => {
              const trimmed = query.trim();
              setSearch(trimmed);
              load(trimmed);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filtrer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} />
          Chargement...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Aucun client en dette pour ce filtre.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <section key={row.user_id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {row.full_name || row.email || row.paytag || row.username || row.user_id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.email || row.paytag || row.username || row.user_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total dette</p>
                  <p className="font-semibold text-rose-700">
                    {formatAmount(row.total_debt_amount, row.wallet_currency)}
                  </p>
                  <p className="text-xs text-slate-500">{row.debt_entries_count} ligne(s)</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Montant</th>
                      <th className="px-3 py-2 text-left font-semibold">Date</th>
                      <th className="px-3 py-2 text-left font-semibold">Operation</th>
                      <th className="px-3 py-2 text-left font-semibold">Source</th>
                      <th className="px-3 py-2 text-left font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(row.debt_entries || []).map((entry) => (
                      <tr key={entry.entry_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {formatAmount(entry.amount, entry.currency_code)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{formatDateTime(entry.occurred_at)}</td>
                        <td className="px-3 py-2 text-slate-700">{entry.operation || "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{entry.source || "-"}</td>
                        <td className="px-3 py-2">
                          <Link
                            to={entry.detail_path || row.detail_path || `/dashboard/admin/users/${row.user_id}`}
                            className="text-indigo-600 hover:underline"
                          >
                            Voir detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
