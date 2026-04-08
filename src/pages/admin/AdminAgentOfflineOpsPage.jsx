import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

function formatAmount(value, currency = "") {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();
}

function formatSignedAmount(value, currency = "") {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value || 0);
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatAmount(amount, currency)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function badgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "queued") return "border-amber-200 bg-amber-100 text-amber-700";
  if (normalized === "syncing") return "border-cyan-200 bg-cyan-100 text-cyan-700";
  if (normalized === "synced") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (normalized === "failed") return "border-rose-200 bg-rose-100 text-rose-700";
  if (normalized === "cancelled") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function AdminAgentOfflineOpsPage() {
  const [items, setItems] = useState([]);
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [success, setSuccess] = useState("");
  const [forceRetry, setForceRetry] = useState(false);

  const loadOperations = async (preserveSelection = true) => {
    try {
      setLoading(true);
      setError("");
      const rows = await api.getAdminAgentOfflineOperations({
        status: status || undefined,
        q: query.trim() || undefined,
      });
      const normalized = Array.isArray(rows) ? rows : [];
      setItems(normalized);
      if (!preserveSelection || !normalized.some((item) => item.operation_id === selectedOperationId)) {
        setSelectedOperationId(normalized[0]?.operation_id || "");
      }
    } catch (err) {
      setItems([]);
      setError(err?.message || "Impossible de charger les operations offline agent.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations(false);
  }, [status]);

  useEffect(() => {
    const loadDetail = async () => {
      setForceRetry(false);
      if (!selectedOperationId) {
        setSelectedOperation(null);
        setDetailError("");
        return;
      }
      try {
        setDetailLoading(true);
        setDetailError("");
        const detail = await api.getAdminAgentOfflineOperationDetail(selectedOperationId);
        setSelectedOperation(detail || null);
      } catch (err) {
        setSelectedOperation(null);
        setDetailError(err?.message || "Impossible de charger le detail de l'operation.");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedOperationId]);

  const stats = useMemo(
    () => ({
      queued: items.filter((item) => item.status === "queued").length,
      failed: items.filter((item) => item.status === "failed").length,
      synced: items.filter((item) => item.status === "synced").length,
      review: items.filter((item) => item.requires_review).length,
    }),
    [items]
  );

  const handleApplyFilters = async () => {
    await loadOperations(false);
  };

  const handleRetry = async () => {
    if (!selectedOperation?.operation_id) return;
    try {
      setError("");
      setDetailError("");
      setSuccess("");
      const updated = await api.retryAdminAgentOfflineOperation(selectedOperation.operation_id, {
        force: Boolean(forceRetry),
      });
      setSelectedOperation(updated);
      setSuccess("Operation offline relancee.");
      await loadOperations(true);
    } catch (err) {
      setDetailError(err?.message || "Relance impossible.");
    }
  };

  const handleCancel = async () => {
    if (!selectedOperation?.operation_id) return;
    try {
      setError("");
      setDetailError("");
      setSuccess("");
      const updated = await api.cancelAdminAgentOfflineOperation(selectedOperation.operation_id);
      setSelectedOperation(updated);
      setSuccess("Operation offline annulee.");
      await loadOperations(true);
    } catch (err) {
      setDetailError(err?.message || "Annulation impossible.");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Supervision terrain et synchronisation</p>
          <h1 className="text-2xl font-bold text-slate-900">Mode hors ligne agent</h1>
        </div>
        <button
          onClick={() => loadOperations(true)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Actualiser
        </button>
      </header>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="En attente" value={stats.queued} tone="amber" />
        <StatCard label="En echec" value={stats.failed} tone="rose" />
        <StatCard label="Synchronisees" value={stats.synced} tone="emerald" />
        <StatCard label="A verifier" value={stats.review} tone="sky" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <h2 className="font-semibold text-slate-900">Filtres</h2>
              <p className="text-sm text-slate-500">Recherche par agent, client, paytag, email ou reference offline.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
              <input
                type="text"
                placeholder="Chercher agent, client ou reference"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Tous statuts</option>
                <option value="queued">queued</option>
                <option value="syncing">syncing</option>
                <option value="synced">synced</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button
                onClick={handleApplyFilters}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Filtrer
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <h2 className="font-semibold text-slate-900">File offline globale</h2>
              <p className="text-sm text-slate-500">Vue backoffice de toutes les operations preparees par les agents.</p>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Chargement des operations...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune operation pour ces filtres.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <button
                    key={item.operation_id}
                    type="button"
                    onClick={() => setSelectedOperationId(item.operation_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedOperationId === item.operation_id
                        ? "border-[#0b3b64] bg-sky-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.client_label}</p>
                        <p className="text-xs text-slate-500">
                          {item.agent_label} | {item.offline_reference}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.operation_type === "cash_in" ? "Cash-in" : "Cash-out"} |{" "}
                      {formatAmount(item.amount, item.currency_code)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Queue: {formatDateTime(item.queued_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.requires_review ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">A verifier</span>
                      ) : null}
                      {item.is_stale ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">Ancienne file</span>
                      ) : null}
                      {item.conflict_reason_label ? (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700">
                          {item.conflict_reason_label}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Detail operation</h2>
            <p className="text-sm text-slate-500">Suivi de l'agent, du client et de l'etat de synchronisation.</p>
          </div>

          {detailError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{detailError}</p> : null}

          {detailLoading ? (
            <p className="text-sm text-slate-500">Chargement du detail...</p>
          ) : !selectedOperation ? (
            <p className="text-sm text-slate-500">Selectionne une operation offline.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Reference</p>
                  <p className="font-semibold text-slate-900">{selectedOperation.offline_reference}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass(selectedOperation.status)}`}>
                  {selectedOperation.status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailCard
                  label="Agent"
                  value={selectedOperation.agent_label}
                  helper={selectedOperation.agent_email || selectedOperation.agent_phone_e164 || "-"}
                />
                <DetailCard
                  label="Client"
                  value={selectedOperation.client_label}
                  helper={
                    selectedOperation.client_paytag ||
                    selectedOperation.client_email ||
                    selectedOperation.client_phone_e164 ||
                    "-"
                  }
                />
                <DetailCard
                  label="Operation"
                  value={selectedOperation.operation_type === "cash_in" ? "Cash-in" : "Cash-out"}
                  helper={formatAmount(selectedOperation.amount, selectedOperation.currency_code)}
                />
                <DetailCard
                  label="Timeline"
                  value={`Queue: ${formatDateTime(selectedOperation.queued_at)}`}
                  helper={`Sync: ${formatDateTime(selectedOperation.synced_at)}`}
                />
                <DetailCard
                  label="Age / supervision"
                  value={`${selectedOperation.queued_age_minutes || 0} min en file`}
                  helper={selectedOperation.requires_review ? "Revue recommandee" : "Pas d'alerte majeure"}
                />
                <DetailCard
                  label="Capture wallet"
                  value={
                    selectedOperation.snapshot_available !== null && selectedOperation.snapshot_available !== undefined
                      ? formatAmount(selectedOperation.snapshot_available, selectedOperation.currency_code)
                      : "-"
                  }
                  helper={selectedOperation.conflict_reason_label || "Aucune divergence detectee"}
                />
                <DetailCard
                  label="Actuel / ecart"
                  value={
                    selectedOperation.current_available !== null && selectedOperation.current_available !== undefined
                      ? formatAmount(selectedOperation.current_available, selectedOperation.currency_code)
                      : "-"
                  }
                  helper={formatSignedAmount(selectedOperation.balance_delta, selectedOperation.currency_code)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedOperation.requires_review ? (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">A verifier</span>
                ) : null}
                {selectedOperation.is_stale ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">Ancienne file</span>
                ) : null}
                {selectedOperation.conflict_reason_label ? (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700">
                    {selectedOperation.conflict_reason_label}
                  </span>
                ) : null}
              </div>

              {selectedOperation.note ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Note terrain</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedOperation.note}</p>
                </div>
              ) : null}

              {selectedOperation.failure_reason ? (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-medium">Motif d'echec</p>
                  <p className="mt-1">{selectedOperation.failure_reason}</p>
                </div>
              ) : null}

              {selectedOperation.synced_response ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Reponse de sync</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                    {JSON.stringify(selectedOperation.synced_response, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {selectedOperation.requires_review || selectedOperation.conflict_reason || selectedOperation.is_stale ? (
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={forceRetry}
                      onChange={(event) => setForceRetry(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Forcer la relance
                  </label>
                ) : null}
                {["queued", "failed", "draft"].includes(selectedOperation.status) ? (
                  <button
                    onClick={handleRetry}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Relancer
                  </button>
                ) : null}
                {!["synced", "cancelled"].includes(selectedOperation.status) ? (
                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DetailCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
      <p className="mt-1 text-xs text-slate-500">{helper || "-"}</p>
    </div>
  );
}
