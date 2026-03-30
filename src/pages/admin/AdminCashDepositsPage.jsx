import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCcw, Search } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function formatAmount(value, currency) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return `0 ${currency || ""}`.trim();
  return `${amount.toLocaleString()} ${currency || ""}`.trim();
}

export default function AdminCashDepositsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (search = q) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminCashDeposits({
        q: search.trim() || undefined,
        limit: 100,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || "Erreur de chargement des depots admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Recherche sur les depots admin directs et valides via demandes cash</p>
          <h1 className="text-xl font-semibold text-slate-900">Depots admin</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Client, admin, email ou reference"
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={() => load(q)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            Rechercher
          </button>
          <button
            onClick={() => load(q)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Rafraichir
          </button>
        </div>
      </header>

      <ApiErrorAlert message={error} />

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Les lignes affichees proviennent de `wallet_transactions` avec `cash_deposit_admin_direct` ou `cash_deposit_admin`.
      </div>

      {loading ? (
        <div className="text-slate-600">Chargement...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Mode</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">Nouveau solde</th>
                <th className="px-4 py-3 text-left">Admin</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.movement_id || row.cash_request_id || `${row.user_id}-${row.deposit_created_at}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-700">
                    {row.deposit_created_at ? new Date(row.deposit_created_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    <div className="font-medium">{row.user_full_name || "-"}</div>
                    <div className="text-xs text-slate-500">{row.user_email || ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.deposit_mode === "depot_admin_direct"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {row.deposit_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatAmount(row.amount, row.currency_code)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatAmount(row.new_balance, row.currency_code)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{row.admin_full_name || "-"}</div>
                    <div className="text-xs text-slate-500">{row.admin_email || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-mono text-xs">{row.reference || "-"}</div>
                    <div className="text-xs text-slate-500">{row.cash_request_id || row.movement_id || ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/admin/users/${row.user_id}/balance-events`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Voir historique
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Aucun depot admin trouve.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
