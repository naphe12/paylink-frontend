import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const statusTone = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  paused: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

export default function AdminScheduledTransfersPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ transfer_type: "", status: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (next = filters) => {
    setLoading(true);
    setError("");
    try {
      setRows(await api.getAdminScheduledTransfers({ ...next, limit: 250 }));
    } catch (err) {
      setError(err?.message || "Impossible de charger les transferts programmes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    total: rows.length,
    succeeded: rows.filter((row) => row.status === "completed" || (row.last_run_at && row.status === "active")).length,
    failed: rows.filter((row) => row.status === "failed" || row.status === "paused").length,
  }), [rows]);

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Operations</p>
          <h1 className="text-3xl font-bold text-slate-900">Transferts programmés</h1>
          <p className="text-sm text-slate-500">Suivi des exécutions internes et externes.</p>
        </div>
        <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm">
          <RefreshCw size={16} /> {loading ? "Chargement..." : "Rafraîchir"}
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={() => load()} />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-500">Affichés</p><p className="text-2xl font-bold">{counts.total}</p></div>
        <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700"><p className="text-xs">Exécutés</p><p className="text-2xl font-bold">{counts.succeeded}</p></div>
        <div className="rounded-xl bg-rose-50 p-4 text-rose-700"><p className="text-xs">Échec / pause</p><p className="text-2xl font-bold">{counts.failed}</p></div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <select value={filters.transfer_type} onChange={(e) => changeFilter("transfer_type", e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">Interne et externe</option><option value="internal">Interne</option><option value="external">Externe</option>
        </select>
        <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">Tous les statuts</option><option value="active">Actif</option><option value="completed">Terminé</option><option value="failed">Échec</option><option value="paused">En pause</option><option value="cancelled">Annulé</option>
        </select>
      </section>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3">Utilisateur / cible</th><th className="p-3">Montant</th><th className="p-3">Statut</th><th className="p-3">Dernier résultat</th><th className="p-3">Dernière exécution</th><th className="p-3">Prochaine</th></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.schedule_id} className="border-t align-top">
              <td className="p-3 font-medium">{row.transfer_type === "external" ? "Externe" : "Interne"}</td>
              <td className="p-3"><div>{row.user_id}</div><div className="text-xs text-slate-500">{row.receiver_identifier}</div></td>
              <td className="p-3">{row.amount} {row.currency_code}</td>
              <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${statusTone[row.status] || "bg-slate-100"}`}>{row.status}</span>{row.failure_count ? <div className="mt-1 text-xs text-rose-600">{row.failure_count} échec(s)</div> : null}</td>
              <td className="max-w-sm p-3">{row.last_result || "Aucune exécution"}</td>
              <td className="p-3 whitespace-nowrap">{formatDate(row.last_run_at)}</td><td className="p-3 whitespace-nowrap">{formatDate(row.next_run_at)}</td>
            </tr>)}
            {!loading && rows.length === 0 ? <tr><td colSpan="7" className="p-8 text-center text-slate-500">Aucun transfert programmé trouvé.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
