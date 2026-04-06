import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const STATUS_TONE = {
  draft: "bg-slate-100 text-slate-700",
  queued: "bg-amber-100 text-amber-700",
  syncing: "bg-cyan-100 text-cyan-700",
  synced: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function formatAmount(value, currency) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ""}`.trim();
}

export default function AgentOfflineOpsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    operation_type: "cash_in",
    amount: "",
    note: "",
  });

  const loadOperations = async () => {
    try {
      setLoading(true);
      const rows = await api.listAgentOfflineOperations();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les operations offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const handleSearch = async () => {
    try {
      setSearching(true);
      setError("");
      const rows = await api.searchAgentCashUsers(query, 10);
      setResults(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Recherche client impossible.");
    } finally {
      setSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedClient || !form.amount) {
      setError("Choisis un client et un montant.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.createAgentOfflineOperation({
        client_user_id: selectedClient.user_id,
        operation_type: form.operation_type,
        amount: Number(form.amount),
        note: form.note || null,
      });
      setSuccess("Operation offline enregistree.");
      setForm({ operation_type: "cash_in", amount: "", note: "" });
      await loadOperations();
    } catch (err) {
      setError(err?.message || "Creation impossible.");
    }
  };

  const handleSyncOne = async (operationId) => {
    try {
      setError("");
      setSuccess("");
      await api.syncAgentOfflineOperation(operationId, {});
      setSuccess("Operation synchronisee.");
      await loadOperations();
    } catch (err) {
      setError(err?.message || "Synchronisation impossible.");
    }
  };

  const handleSyncPending = async () => {
    try {
      setError("");
      setSuccess("");
      const summary = await api.syncPendingAgentOfflineOperations({});
      setSuccess(`${summary?.synced || 0} operation(s) synchronisee(s), ${summary?.failed || 0} en echec.`);
      await loadOperations();
    } catch (err) {
      setError(err?.message || "Synchronisation batch impossible.");
    }
  };

  const handleCancel = async (operationId) => {
    try {
      setError("");
      setSuccess("");
      await api.cancelAgentOfflineOperation(operationId, {});
      setSuccess("Operation offline annulee.");
      await loadOperations();
    } catch (err) {
      setError(err?.message || "Annulation impossible.");
    }
  };

  const metrics = useMemo(() => {
    const queued = items.filter((item) => item.status === "queued").length;
    const failed = items.filter((item) => item.status === "failed").length;
    const synced = items.filter((item) => item.status === "synced").length;
    return { queued, failed, synced };
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Mode hors ligne agent</h1>
            <p className="text-sm text-slate-500">
              Prepare les cash-in/out hors connexion logique, puis synchronise-les une fois le reseau revenu.
            </p>
          </div>
          <button
            onClick={handleSyncPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Synchroniser la file
          </button>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="En attente" value={metrics.queued} tone="amber" />
          <StatCard label="En echec" value={metrics.failed} tone="rose" />
          <StatCard label="Synchronisees" value={metrics.synced} tone="emerald" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr,1.3fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Preparer une operation</h2>
            <p className="text-sm text-slate-500">Recherche le client, choisis le type d'operation puis ajoute-la a la file.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr,auto]">
            <input
              aria-label="Recherche client offline"
              type="text"
              placeholder="Nom, email ou telephone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {searching ? "Recherche..." : "Rechercher"}
            </button>
          </div>
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={result.user_id}
                onClick={() => setSelectedClient(result)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selectedClient?.user_id === result.user_id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{result.full_name || result.email || result.phone_e164}</p>
                <p className="text-xs text-slate-500">{result.phone_e164 || result.email || result.user_id}</p>
              </button>
            ))}
            {!searching && query && results.length === 0 ? <p className="text-sm text-slate-500">Aucun client trouve.</p> : null}
          </div>
          {selectedClient ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Client selectionne: <span className="font-semibold text-slate-900">{selectedClient.full_name || selectedClient.email}</span>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select
              aria-label="Type operation offline"
              value={form.operation_type}
              onChange={(e) => setForm((prev) => ({ ...prev, operation_type: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="cash_in">Cash-in</option>
              <option value="cash_out">Cash-out</option>
            </select>
            <input
              aria-label="Montant offline"
              type="number"
              min="0"
              step="0.01"
              placeholder="Montant"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            aria-label="Note offline"
            placeholder="Note terrain"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            className="min-h-[90px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Ajouter a la file offline
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">File de synchronisation</h2>
              <p className="text-sm text-slate-500">Les operations sont rejouees sur le vrai moteur cash quand tu synchronises.</p>
            </div>
            <button
              onClick={loadOperations}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune operation offline.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.operation_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.client_label}</p>
                      <p className="text-sm text-slate-500">
                        {item.operation_type === "cash_in" ? "Cash-in" : "Cash-out"} | {formatAmount(item.amount, item.currency_code)}
                      </p>
                      <p className="text-xs font-mono text-slate-500">{item.offline_reference}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${STATUS_TONE[item.status] || STATUS_TONE.draft}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.note ? <p className="text-sm text-slate-600">{item.note}</p> : null}
                  {item.failure_reason ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{item.failure_reason}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {["queued", "failed", "draft"].includes(item.status) ? (
                      <button
                        onClick={() => handleSyncOne(item.operation_id)}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                      >
                        Synchroniser
                      </button>
                    ) : null}
                    {item.status !== "synced" && item.status !== "cancelled" ? (
                      <button
                        onClick={() => handleCancel(item.operation_id)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
