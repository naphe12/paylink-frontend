import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { ShieldCheck, RefreshCw, Search, BookOpen, Briefcase } from "lucide-react";

export default function TransactionAuditPage() {
  const [walletId, setWalletId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(200);

  const [ledgerRows, setLedgerRows] = useState([]);
  const [walletRows, setWalletRows] = useState([]);
  const [agentRows, setAgentRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasFilters = useMemo(
    () => walletId.trim() !== "" || agentId.trim() !== "",
    [walletId, agentId]
  );

  const load = async () => {
    if (!hasFilters) {
      setError("Renseignez au moins un wallet ID ou un agent ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminTransactionsAudit({
        wallet_id: walletId.trim() || undefined,
        agent_id: agentId.trim() || undefined,
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: limit || undefined,
      });
      setLedgerRows(Array.isArray(data.ledger) ? data.ledger : []);
      setAgentRows(Array.isArray(data.agent_transactions) ? data.agent_transactions : []);
      setWalletRows(Array.isArray(data.wallet_transactions) ? data.wallet_transactions : []);
    } catch (err) {
      setError(err.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto load if an id is already present (eg deep link)
    if (hasFilters) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setWalletId("");
    setAgentId("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setLimit(200);
    setLedgerRows([]);
    setAgentRows([]);
    setError(null);
  };

  const ledgerStats = {
    total: ledgerRows.length,
    debit: ledgerRows.filter((r) => ["out", "debit"].includes((r.direction || "").toLowerCase())).length,
    credit: ledgerRows.filter((r) => ["in", "credit"].includes((r.direction || "").toLowerCase())).length,
  };
  const walletStats = {
    total: walletRows.length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contrôle</p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" /> Verification transactions
          </h1>
          <p className="text-sm text-slate-500">
            Croisez ledger wallet, historiques agents et references pour investiguer.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
          >
            <Search size={16} />
            Lancer la recherche
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={16} /> Réinitialiser
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Filtres</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-slate-600">Wallet ID</label>
              <input
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="wallet_123..."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Agent ID</label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="agent_abc..."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Reference / recherche</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="ref, montant, type..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Date de</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Date à</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Limite</label>
              <input
                type="number"
                min="10"
                max="500"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <_KpiCard
            label="Lignes ledger"
            value={ledgerStats.total}
            icon={<BookOpen size={18} />}
            color="bg-indigo-100 text-indigo-700"
          />
          <_KpiCard
            label="Tx wallet"
            value={walletStats.total}
            icon={<ShieldCheck size={18} />}
            color="bg-slate-100 text-slate-700"
          />
          <_KpiCard
            label="Credits"
            value={ledgerStats.credit}
            icon={<ShieldCheck size={18} />}
            color="bg-emerald-100 text-emerald-700"
          />
          <_KpiCard
            label="Debits"
            value={ledgerStats.debit}
            icon={<ShieldCheck size={18} />}
            color="bg-rose-100 text-rose-700"
          />
          <_KpiCard
            label="Ops agent"
            value={agentRows.length}
            icon={<Briefcase size={18} />}
            color="bg-sky-100 text-sky-700"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Ledger wallet</h2>
          <p className="text-xs text-slate-400">Source: ledger_* / wallets_transactions</p>
        </div>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : ledgerRows.length === 0 ? (
          <p className="text-slate-500">Aucune ligne trouvée pour ce wallet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Reference</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Montant</th>
                  <th className="px-2 py-1">Solde apres</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => (
                  <tr key={`${row.tx_id}-${row.created_at}`} className="border-b last:border-0">
                    <td className="px-2 py-2 text-slate-600">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-800">
                      {row.reference || row.operation_type || "Transaction"}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          (row.direction || "").toLowerCase() === "in"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {(row.direction || row.operation_type || "").toString().toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-semibold text-right">
                      {(row.direction || "").toLowerCase() === "in" ? "+" : "-"}{" "}
                      {Number(row.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {Number(row.balance_after || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Transactions wallet</h2>
          <p className="text-xs text-slate-400">Source: wallet_transactions</p>
        </div>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : walletRows.length === 0 ? (
          <p className="text-slate-500">Aucune transaction trouvée pour ce wallet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Montant</th>
                  <th className="px-2 py-1">Solde après</th>
                  <th className="px-2 py-1">Référence</th>
                </tr>
              </thead>
              <tbody>
                {walletRows.map((row) => (
                  <tr key={row.transaction_id} className="border-b last:border-0">
                    <td className="px-2 py-2 text-slate-600">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          (row.direction || "").toLowerCase() === "credit"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {(row.operation_type || row.direction || "").toString().toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-semibold text-right">
                      {(row.direction || "").toLowerCase() === "credit" ? "+" : "-"}{" "}
                      {Number(row.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {Number(row.balance_after || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {row.reference || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Operations agent</h2>
          <p className="text-xs text-slate-400">Source: agents_transaction</p>
        </div>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : agentRows.length === 0 ? (
          <p className="text-slate-500">Aucune operation agent trouvée.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Montant</th>
                  <th className="px-2 py-1">Statut</th>
                  <th className="px-2 py-1">Ref</th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((row) => (
                  <tr key={`${row.id || row.created_at}`} className="border-b last:border-0">
                    <td className="px-2 py-2 text-slate-600">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-800">
                      {row.operation_type || row.type || "-"}
                    </td>
                    <td className="px-2 py-2 font-semibold text-right">
                      {Number(row.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {(row.status || "unknown").toString().toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {row.reference || row.tx_id || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function _KpiCard({ label, value, icon, color }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
