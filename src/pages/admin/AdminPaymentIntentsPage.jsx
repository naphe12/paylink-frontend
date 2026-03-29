import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

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
  const [rows, setRows] = useState([]);
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
      const data = await api.manualReconcileAdminPaymentIntent(selectedIntentId, {
        provider_reference: providerReference || null,
        note: note || null,
      });
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
      const data = await api.adminPaymentIntentStatusAction(selectedIntentId, {
        action,
        note: note || null,
      });
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
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Depots mobile money BIF</h1>
          <p className="text-sm text-slate-500">
            Suivi des intents de paiement mobile money locaux Burundi, distincts des depots bancaires EUR.
          </p>
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
        <div className="flex items-end">
          <button
            onClick={load}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Appliquer
          </button>
        </div>
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
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Cree le</th>
                <th className="px-4 py-3 text-left">Credite le</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(row.credited_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
