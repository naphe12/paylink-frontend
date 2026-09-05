import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "-";

export default function AdminScheduledTransferExecutionsPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ transfer_type: "", outcome: "failed" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (next = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminScheduledTransferExecutions({ ...next, limit: 250 });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setSelected((current) => list.find((row) => row.execution_id === current?.execution_id) || list[0] || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger l'historique des executions.");
      setRows([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: rows.length,
    failed: rows.filter((row) => row.outcome === "failed").length,
    succeeded: rows.filter((row) => row.outcome === "succeeded").length,
  }), [rows]);

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Observabilite</p>
        <h1 className="text-3xl font-bold text-slate-900">Exécutions des transferts programmés</h1>
        <p className="text-sm text-slate-500">Historique persistant des succès et causes d'échec internes et externes.</p>
      </div>
      <button type="button" onClick={() => load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-60">
        <RefreshCw size={16} /> {loading ? "Chargement..." : "Rafraîchir"}
      </button>
    </header>

    <ApiErrorAlert message={error} onRetry={() => load()} />

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-500">Tentatives affichées</p><p className="text-2xl font-bold">{stats.total}</p></div>
      <div className="rounded-xl bg-rose-50 p-4 text-rose-700"><p className="text-xs">Échecs</p><p className="text-2xl font-bold">{stats.failed}</p></div>
      <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700"><p className="text-xs">Succès</p><p className="text-2xl font-bold">{stats.succeeded}</p></div>
    </section>

    <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
      <select aria-label="Type de transfert" value={filters.transfer_type} onChange={(e) => changeFilter("transfer_type", e.target.value)} className="rounded-lg border px-3 py-2">
        <option value="">Interne et externe</option><option value="internal">Interne</option><option value="external">Externe</option>
      </select>
      <select aria-label="Résultat" value={filters.outcome} onChange={(e) => changeFilter("outcome", e.target.value)} className="rounded-lg border px-3 py-2">
        <option value="">Tous les résultats</option><option value="failed">Échecs uniquement</option><option value="succeeded">Succès uniquement</option>
      </select>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Montant</th><th className="p-3">Résultat</th><th className="p-3">Cause</th><th className="p-3">Durée</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.execution_id} onClick={() => setSelected(row)} className={`cursor-pointer border-t hover:bg-slate-50 ${selected?.execution_id === row.execution_id ? "bg-cyan-50" : ""}`}>
            <td className="whitespace-nowrap p-3">{formatDate(row.created_at)}</td><td className="p-3">{row.transfer_type === "external" ? "Externe" : "Interne"}</td><td className="whitespace-nowrap p-3">{row.amount} {row.currency_code}</td>
            <td className="p-3">{row.outcome === "failed" ? <span className="inline-flex items-center gap-1 text-rose-700"><AlertTriangle size={15}/> Échec</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={15}/> Succès</span>}</td>
            <td className="max-w-md p-3">{row.reason || "-"}</td><td className="p-3">{row.duration_ms} ms</td>
          </tr>)}</tbody>
        </table>
        {!loading && !rows.length ? <p className="p-8 text-center text-slate-500">Aucune exécution trouvée.</p> : null}
      </div>

      <aside className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold text-slate-900">Détail technique</h2>
        {selected ? <div className="mt-3 space-y-3 text-sm">
          <div><p className="text-xs text-slate-500">Programmation</p><p className="break-all font-mono text-xs">{selected.schedule_id}</p></div>
          <div><p className="text-xs text-slate-500">Utilisateur</p><p className="break-all font-mono text-xs">{selected.user_id}</p></div>
          <div><p className="text-xs text-slate-500">Type d'erreur</p><p>{selected.error_type || "Erreur métier"}</p></div>
          <div><p className="text-xs text-slate-500">Raison</p><p className="whitespace-pre-wrap text-rose-700">{selected.reason || "-"}</p></div>
          {selected.stack_trace ? <details><summary className="cursor-pointer font-medium">Afficher le traceback</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{selected.stack_trace}</pre></details> : null}
          {selected.details && Object.keys(selected.details).length ? <details><summary className="cursor-pointer font-medium">Données complémentaires</summary><pre className="mt-2 overflow-auto rounded-lg bg-slate-100 p-3 text-xs">{JSON.stringify(selected.details, null, 2)}</pre></details> : null}
        </div> : <p className="mt-3 text-sm text-slate-500">Sélectionnez une tentative.</p>}
      </aside>
    </div>
  </div>;
}
