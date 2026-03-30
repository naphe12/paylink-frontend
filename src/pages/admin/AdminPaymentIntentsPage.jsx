import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCcw } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import AdminOperatorWorkflowPanel from "@/components/admin/AdminOperatorWorkflowPanel";
import AdminStepUpBadge from "@/components/admin/AdminStepUpBadge";
import AdminStepUpDialog from "@/components/admin/AdminStepUpDialog";
import useAdminStepUp from "@/hooks/useAdminStepUp";
import api from "@/services/api";
import { getCurrentUser } from "@/services/authStore";
import { formatAgeShort, isOlderThanHours } from "@/utils/opsSla";

function fmtDate(value) {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
}

function statusClass(status) {
  if (status === "credited" || status === "settled") return "bg-green-100 text-green-700";
  if (status === "failed" || status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function AdminPaymentIntentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    stepUpOpen,
    stepUpLoading,
    stepUpError,
    stepUpActionLabel,
    closeStepUp,
    confirmStepUp,
    runWithStepUp,
    stepUpStatus,
    loadStepUpStatus,
  } = useAdminStepUp();
  const [rows, setRows] = useState([]);
  const [queueView, setQueueView] = useState(() => {
    const initial = searchParams.get("queue");
    return initial || "all";
  });
  const [selectedIntentId, setSelectedIntentId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [query, setQuery] = useState("");
  const [operatorStatusFilter, setOperatorStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [opsView, setOpsView] = useState("all");

  const filteredRows = rows.filter((row) => {
    const me = getCurrentUser();
    const myUserId = String(me?.user_id || "");
    const myName = String(me?.full_name || me?.email || "").toLowerCase();
    const normalizedStatus = String(row.status || "").toLowerCase();
    const workflow = row.operator_workflow || {};
    const operatorStatus =
      workflow.operator_status ||
      (["pending_provider", "settled", "failed"].includes(normalizedStatus) ? "needs_follow_up" : "watching");
    const ownerLabel =
      workflow.owner_name || workflow.owner_user_id || row.provider_channel || row.provider_code || "";
    const ownerUserId = String(workflow.owner_user_id || "");
    const hasOwner = Boolean(ownerLabel || ownerUserId);
    if (operatorStatusFilter !== "all" && operatorStatus !== operatorStatusFilter) return false;
    if (ownerFilter.trim() && !String(ownerLabel).toLowerCase().includes(ownerFilter.trim().toLowerCase())) {
      return false;
    }
    if (opsView === "mine") {
      const matchesMine =
        (myUserId && ownerUserId === myUserId) ||
        (myName && String(ownerLabel).toLowerCase() === myName);
      if (!matchesMine) return false;
    }
    if (opsView === "unassigned" && hasOwner) return false;
    if (opsView === "blocked_only" && operatorStatus !== "blocked") return false;
    if (queueView === "actionable") return !["credited", "cancelled"].includes(normalizedStatus);
    if (queueView === "attention") return ["pending_provider", "failed", "settled"].includes(normalizedStatus);
    if (queueView === "credited") return normalizedStatus === "credited";
    if (queueView === "failed") return normalizedStatus === "failed";
    if (
      queueView === "stale" &&
      !(
        ["pending_provider", "settled", "failed"].includes(normalizedStatus) &&
        isOlderThanHours(row.updated_at || row.created_at, 2)
      )
    ) {
      return false;
    }
    return true;
  });

  const queueCounts = rows.reduce(
    (acc, row) => {
      const normalizedStatus = String(row.status || "").toLowerCase();
      acc.all += 1;
      if (!["credited", "cancelled"].includes(normalizedStatus)) acc.actionable += 1;
      if (["pending_provider", "failed", "settled"].includes(normalizedStatus)) acc.attention += 1;
      if (normalizedStatus === "credited") acc.credited += 1;
      if (normalizedStatus === "failed") acc.failed += 1;
      if (
        ["pending_provider", "settled", "failed"].includes(normalizedStatus) &&
        isOlderThanHours(row.updated_at || row.created_at, 2)
      ) {
        acc.stale += 1;
      }
      return acc;
    },
    { all: 0, actionable: 0, attention: 0, credited: 0, failed: 0, stale: 0 }
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminPaymentIntents({
        status,
        provider_code: providerCode,
        q: query.trim(),
        limit: 100,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Erreur chargement intents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const requestedQueue = searchParams.get("queue") || "all";
    if (requestedQueue !== queueView) {
      setQueueView(requestedQueue);
    }
  }, [searchParams, queueView]);

  useEffect(() => {
    loadStepUpStatus();
  }, []);

  const loadDetail = async (intentId) => {
    if (!intentId) {
      setSelectedIntentId("");
      setDetail(null);
      return;
    }
    setSelectedIntentId(intentId);
    setDetailLoading(true);
    try {
      const data = await api.getAdminPaymentIntentDetail(intentId);
      setDetail(data || null);
    } catch (err) {
      setError(err?.message || "Erreur chargement detail intent.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleManualReconcile = async () => {
    if (!selectedIntentId) return;
    const providerReference = (window.prompt("Reference provider (optionnel)") || "").trim();
    const note = (window.prompt("Note de reconciliation manuelle (optionnel)") || "").trim();
    setReconciling(true);
    setError("");
    try {
      const payload = {
        provider_reference: providerReference || null,
        note: note || null,
      };
      const data = await runWithStepUp({
        action: "payment_manual_reconcile",
        actionLabel: "Confirmer la reconciliation manuelle du paiement",
        execute: (stepUpToken) =>
          api.manualReconcileAdminPaymentIntent(selectedIntentId, payload, stepUpToken),
      });
      if (!data) return;
      setDetail(data || null);
      await load();
    } catch (err) {
      setError(err?.message || "Reconciliation manuelle impossible.");
    } finally {
      setReconciling(false);
    }
  };

  const handleStatusAction = async (action) => {
    if (!selectedIntentId) return;
    const note = (window.prompt("Note admin (optionnel)") || "").trim();
    setStatusUpdating(true);
    setError("");
    try {
      const payload = {
        action,
        note: note || null,
      };
      const data = await runWithStepUp({
        action: "payment_status_action",
        actionLabel: "Confirmer la modification de statut du paiement",
        execute: (stepUpToken) =>
          api.adminPaymentIntentStatusAction(selectedIntentId, payload, stepUpToken),
      });
      if (!data) return;
      setDetail(data || null);
      await load();
    } catch (err) {
      setError(err?.message || "Action de statut impossible.");
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminStepUpDialog
        open={stepUpOpen}
        loading={stepUpLoading}
        error={stepUpError}
        actionLabel={stepUpActionLabel}
        onClose={closeStepUp}
        onConfirm={confirmStepUp}
      />
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Depots mobile money BIF</h1>
          <p className="text-sm text-slate-500">
            Suivi des intents de paiement mobile money locaux Burundi, distincts des depots bancaires EUR.
          </p>
          <div className="mt-3">
            <AdminStepUpBadge
              enabled={stepUpStatus?.enabled}
              expiresInSeconds={stepUpStatus?.token_expires_in_seconds}
              headerFallbackEnabled={stepUpStatus?.header_fallback_enabled}
            />
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RefreshCcw size={16} /> Rafraichir
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Recharger" />

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Recherche</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference, client, phone"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Provider</label>
          <select
            value={providerCode}
            onChange={(e) => setProviderCode(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="lumicash_aggregator">Lumicash</option>
            <option value="ecocash_aggregator">Ecocash</option>
            <option value="enoti_aggregator">eNoti</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="created">Created</option>
            <option value="pending_provider">Pending provider</option>
            <option value="settled">Settled</option>
            <option value="credited">Credited</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Workflow operateur</label>
          <select
            value={operatorStatusFilter}
            onChange={(e) => setOperatorStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="needs_follow_up">Needs follow-up</option>
            <option value="blocked">Blocked</option>
            <option value="watching">Watching</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Owner operateur</label>
          <input
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            placeholder="Filtrer par owner..."
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Appliquer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "Tous OPS"],
          ["mine", "Mes dossiers"],
          ["unassigned", "Non assignes"],
          ["blocked_only", "Blocked only"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setOpsView(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
              opsView === value
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
        {[
          ["all", "Tous"],
          ["actionable", "Actionnables"],
          ["attention", "Attention"],
          ["stale", "Stale"],
          ["credited", "Credites"],
          ["failed", "Failed"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setQueueView(value);
              const next = new URLSearchParams(searchParams);
              if (value === "all") next.delete("queue");
              else next.set("queue", value);
              setSearchParams(next, { replace: true });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
              queueView === value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label} ({queueCounts[value] || 0})
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Montant</th>
                <th className="px-4 py-3 text-left">Canal</th>
                <th className="px-4 py-3 text-left">Payeur</th>
                <th className="px-4 py-3 text-left">Age</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Cree le</th>
                <th className="px-4 py-3 text-left">Credite le</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.intent_id}
                  className={`border-t cursor-pointer hover:bg-slate-50 ${
                    selectedIntentId === row.intent_id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => loadDetail(row.intent_id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.user?.full_name || "-"}</div>
                    <div className="text-xs text-slate-500">{row.user?.email || "-"}</div>
                    <div className="text-xs text-slate-400">{row.user?.phone_e164 || "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.merchant_reference}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.currency_code} {Number(row.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.provider_channel || row.provider_code}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.payer_identifier || row.target_instructions?.merchant_number || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{formatAgeShort(row.updated_at || row.created_at)}</span>
                      {["pending_provider", "settled", "failed"].includes(String(row.status || "").toLowerCase()) &&
                      isOlderThanHours(row.updated_at || row.created_at, 2) ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          SLA
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {row.operator_workflow?.operator_status ||
                          (["pending_provider", "settled", "failed"].includes(String(row.status || "").toLowerCase())
                            ? "needs_follow_up"
                            : "watching")}
                      </span>
                      {row.operator_workflow?.owner_name || row.operator_workflow?.owner_user_id ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {row.operator_workflow?.owner_name || row.operator_workflow?.owner_user_id}
                        </span>
                      ) : null}
                      {row.operator_workflow?.follow_up_at ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Follow-up
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(row.credited_at)}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Chargement..." : "Aucun intent de depot mobile money pour ce filtre."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Detail intent</h2>
              <p className="text-xs text-slate-500">Evenements provider et instructions de paiement.</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedIntentId ? (
                <button
                  onClick={() => loadDetail(selectedIntentId)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Recharger
                </button>
              ) : null}
              {selectedIntentId && detail?.intent && !["credited", "failed", "cancelled"].includes(detail.intent.status) ? (
                <button
                  onClick={handleManualReconcile}
                  disabled={reconciling || statusUpdating}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {reconciling ? "Credit en cours..." : "Crediter manuellement"}
                </button>
              ) : null}
              {selectedIntentId && detail?.intent?.status === "failed" ? (
                <button
                  onClick={() => handleStatusAction("reopen_failed")}
                  disabled={reconciling || statusUpdating}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {statusUpdating ? "Traitement..." : "Reouvrir"}
                </button>
              ) : null}
              {selectedIntentId && detail?.intent && !["credited", "failed", "cancelled"].includes(detail.intent.status) ? (
                <button
                  onClick={() => handleStatusAction("retry_waiting")}
                  disabled={reconciling || statusUpdating}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {statusUpdating ? "Traitement..." : "Remettre en attente"}
                </button>
              ) : null}
            </div>
          </div>

          {!selectedIntentId ? (
            <div className="mt-6 text-sm text-slate-500">
              Selectionnez un intent dans la liste pour voir son detail.
            </div>
          ) : detailLoading ? (
            <div className="mt-6 text-sm text-slate-500">Chargement du detail...</div>
          ) : !detail?.intent ? (
            <div className="mt-6 text-sm text-slate-500">Aucun detail disponible.</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-mono text-slate-800">{detail.intent.merchant_reference}</div>
                <div className="mt-2 text-slate-600">
                  {detail.intent.currency_code} {Number(detail.intent.amount).toFixed(2)}
                </div>
                <div className="mt-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(detail.intent.status)}`}>
                    {detail.intent.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-slate-700">Client:</span> {detail.intent.user?.full_name || "-"}</div>
                <div><span className="font-medium text-slate-700">Email:</span> {detail.intent.user?.email || "-"}</div>
                <div><span className="font-medium text-slate-700">Telephone:</span> {detail.intent.user?.phone_e164 || "-"}</div>
                <div><span className="font-medium text-slate-700">Payeur:</span> {detail.intent.payer_identifier || "-"}</div>
                <div><span className="font-medium text-slate-700">Provider ref:</span> {detail.intent.provider_reference || "-"}</div>
                <div><span className="font-medium text-slate-700">Reason code:</span> {detail.intent.metadata?.last_provider_reason_code || detail.intent.metadata?.collection_init?.reason_code || "-"}</div>
                <div><span className="font-medium text-slate-700">Cree le:</span> {fmtDate(detail.intent.created_at)}</div>
                <div><span className="font-medium text-slate-700">Credite le:</span> {fmtDate(detail.intent.credited_at)}</div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">Instructions</h3>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {JSON.stringify(detail.intent.target_instructions || {}, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">Evenements provider</h3>
                <div className="mt-2 space-y-3">
                  {(detail.events || []).map((event) => (
                    <div key={event.event_id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-800">
                          {event.provider_event_type || "payment_update"}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(event.status || "")}`}>
                          {event.status || "-"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {fmtDate(event.created_at)} | external_event_id: {event.external_event_id || "-"} | reason: {event.reason_code || "-"}
                      </div>
                      {event.payload?.step_up_method ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Validation admin: {event.payload.step_up_method === "token" ? "Step-up token" : "Header fallback"}
                        </div>
                      ) : null}
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                        {JSON.stringify(event.payload || {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                  {(!detail.events || detail.events.length === 0) && (
                    <div className="text-sm text-slate-500">Aucun evenement provider pour cet intent.</div>
                  )}
                </div>
              </div>

              <AdminOperatorWorkflowPanel
                title="Workflow operateur paiement"
                entityType="payment_intent"
                entityId={detail.intent?.intent_id}
                workflow={detail.intent?.operator_workflow || null}
                fallbackStatus={
                  ["failed", "pending_provider", "settled"].includes(String(detail.intent?.status || "").toLowerCase())
                    ? "needs_follow_up"
                    : "watching"
                }
                fallbackOwnerLabel={
                  detail.intent?.provider_channel || detail.intent?.provider_code || "Payments"
                }
                onSaved={async () => {
                  await load();
                  await loadDetail(detail.intent.intent_id);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
