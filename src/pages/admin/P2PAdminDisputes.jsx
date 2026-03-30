import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import AdminOperatorWorkflowPanel from "@/components/admin/AdminOperatorWorkflowPanel";
import AdminStepUpBadge from "@/components/admin/AdminStepUpBadge";
import AdminStepUpDialog from "@/components/admin/AdminStepUpDialog";
import {
  P2P_DISPUTE_RESOLUTION_CODE_OPTIONS,
  PROOF_TYPE_OPTIONS,
  buildOptionLabelMap,
  prependBlankOption,
} from "@/constants/disputeCodes";
import api from "@/services/api";
import { getConfiguredApiUrl } from "@/services/api";
import { getAccessToken, getCurrentUser, suspendForAuthRedirect } from "@/services/authStore";
import useAdminStepUp from "@/hooks/useAdminStepUp";
import { formatAgeShort, isOlderThanHours } from "@/utils/opsSla";

function fmtDate(value) {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
}

function fmtAmount(value, code, maxFraction = 2) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFraction,
  })}${code ? ` ${code}` : ""}`;
}

function badgeClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (["RESOLVED_BUYER", "CLOSED"].includes(normalized)) return "bg-emerald-100 text-emerald-700";
  if (["RESOLVED_SELLER"].includes(normalized)) return "bg-amber-100 text-amber-800";
  if (["OPEN", "UNDER_REVIEW"].includes(normalized)) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

const DISPUTE_QUEUE_VIEWS = {
  all: "Tous",
  to_review: "A traiter",
  resolved: "Resolus",
  legacy: "Legacy",
  p2p_only: "P2P",
  stale: "Stale",
};


export default function P2PAdminDisputes() {
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
  const [disputes, setDisputes] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [queueView, setQueueView] = useState(() => {
    const initial = searchParams.get("queue");
    return initial && initial in DISPUTE_QUEUE_VIEWS ? initial : "all";
  });
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [operatorStatusFilter, setOperatorStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [opsView, setOpsView] = useState("all");
  const [resolutionCode, setResolutionCode] = useState("");
  const [proofType, setProofType] = useState("");
  const [proofRef, setProofRef] = useState("");
  const [resolutionCodeOptions, setResolutionCodeOptions] = useState(P2P_DISPUTE_RESOLUTION_CODE_OPTIONS);
  const [proofTypeOptions, setProofTypeOptions] = useState(PROOF_TYPE_OPTIONS);

  const exportDisputes = async (format) => {
    try {
      const token = getAccessToken();
      if (!token) return suspendForAuthRedirect("expired");
      const search = new URLSearchParams();
      if (status) search.append("status", status);
      search.append("format", format);
      const res = await fetch(`${getConfiguredApiUrl()}/api/admin/p2p/disputes/export?${search.toString()}`, {
        headers: {
          Accept: format === "csv" ? "text/csv" : "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 403) return suspendForAuthRedirect("expired");
      if (!res.ok) throw new Error(`Export ${format.toUpperCase()} impossible`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `p2p_disputes_${status || "all"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Impossible d'exporter les litiges.");
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.get(`/api/admin/p2p/disputes${status ? `?status=${encodeURIComponent(status)}` : ""}`);
      if (Array.isArray(data)) {
        setDisputes(data);
      } else {
        setDisputes([]);
        setError("Format de reponse inattendu pour /api/admin/p2p/disputes");
      }
    } catch (e) {
      setDisputes([]);
      setError(e?.message || "Impossible de charger les disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    const requestedQueue = searchParams.get("queue");
    if (requestedQueue && requestedQueue in DISPUTE_QUEUE_VIEWS && requestedQueue !== queueView) {
      setQueueView(requestedQueue);
      return;
    }
    if (!requestedQueue && queueView !== "all") {
      setQueueView("all");
    }
  }, [searchParams, queueView]);

  useEffect(() => {
    loadStepUpStatus();
  }, []);

  useEffect(() => {
    let active = true;
    const loadCodes = async () => {
      try {
        const payload = await api.getAdminDisputeCodes();
        if (!active || !payload || typeof payload !== "object") return;
        if (Array.isArray(payload.p2p_dispute_resolution_codes)) {
          setResolutionCodeOptions(
            prependBlankOption(
              payload.p2p_dispute_resolution_codes,
              "Code resolution admin (optionnel)"
            )
          );
        }
        if (Array.isArray(payload.proof_types)) {
          setProofTypeOptions(prependBlankOption(payload.proof_types, "Type de preuve (optionnel)"));
        }
      } catch {
        // Keep local fallback constants.
      }
    };
    loadCodes();
    return () => {
      active = false;
    };
  }, []);

  const statuses = useMemo(() => {
    return Array.from(new Set(disputes.map((item) => String(item.status || "").trim()).filter(Boolean))).sort();
  }, [disputes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ownerQ = ownerFilter.trim().toLowerCase();
    const me = getCurrentUser();
    const myUserId = String(me?.user_id || "");
    const myName = String(me?.full_name || me?.email || "").toLowerCase();
    return disputes.filter((item) => {
      const normalizedStatus = String(item.status || "").toUpperCase();
      const normalizedSource = String(item.source || "").toLowerCase();
      const workflow = item.operator_workflow || {};
      const operatorStatus =
        workflow.operator_status ||
        (["OPEN", "UNDER_REVIEW"].includes(normalizedStatus) ? "needs_follow_up" : "resolved");
      const ownerLabel =
        workflow.owner_name ||
        workflow.owner_user_id ||
        item.resolved_by_name ||
        item.opened_by_name ||
        "";
      const ownerUserId = String(workflow.owner_user_id || "");
      const hasOwner = Boolean(ownerLabel || ownerUserId);
      if (source !== "all" && normalizedSource !== source) return false;
      if (operatorStatusFilter !== "all" && operatorStatus !== operatorStatusFilter) return false;
      if (ownerQ && !String(ownerLabel).toLowerCase().includes(ownerQ)) return false;
      if (opsView === "mine") {
        const matchesMine =
          (myUserId && ownerUserId === myUserId) ||
          (myName && String(ownerLabel).toLowerCase() === myName);
        if (!matchesMine) return false;
      }
      if (opsView === "unassigned" && hasOwner) return false;
      if (opsView === "blocked_only" && operatorStatus !== "blocked") return false;
      if (queueView === "to_review" && !["OPEN", "UNDER_REVIEW"].includes(normalizedStatus)) return false;
      if (
        queueView === "resolved" &&
        !["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(normalizedStatus)
      ) {
        return false;
      }
      if (queueView === "legacy" && normalizedSource !== "paylink") return false;
      if (queueView === "p2p_only" && normalizedSource !== "p2p") return false;
      if (
        queueView === "stale" &&
        (!["OPEN", "UNDER_REVIEW"].includes(normalizedStatus) ||
          !isOlderThanHours(item.updated_at || item.created_at, 12))
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        item.dispute_id,
        item.trade_id,
        item.tx_id,
        item.status,
        item.trade_status,
        item.reason,
        item.resolution,
        item.buyer_name,
        item.seller_name,
        item.opened_by_name,
        item.resolved_by_name,
      ]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [disputes, source, query, queueView, operatorStatusFilter, ownerFilter, opsView]);

  const queueCounts = useMemo(() => {
    const counts = {
      all: disputes.length,
      to_review: 0,
      resolved: 0,
      legacy: 0,
      p2p_only: 0,
      stale: 0,
    };
    for (const item of disputes) {
      const normalizedStatus = String(item.status || "").toUpperCase();
      const normalizedSource = String(item.source || "").toLowerCase();
      if (["OPEN", "UNDER_REVIEW"].includes(normalizedStatus)) counts.to_review += 1;
      if (["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(normalizedStatus)) counts.resolved += 1;
      if (normalizedSource === "paylink") counts.legacy += 1;
      if (normalizedSource === "p2p") counts.p2p_only += 1;
      if (
        ["OPEN", "UNDER_REVIEW"].includes(normalizedStatus) &&
        isOlderThanHours(item.updated_at || item.created_at, 12)
      ) counts.stale += 1;
    }
    return counts;
  }, [disputes]);

  const resolutionCodeLabels = useMemo(
    () => buildOptionLabelMap(resolutionCodeOptions),
    [resolutionCodeOptions]
  );
  const proofTypeLabels = useMemo(
    () => buildOptionLabelMap(proofTypeOptions),
    [proofTypeOptions]
  );

  const reasonCodeLabels = useMemo(
    () => ({
      payment_not_received: "Payment not received",
      wrong_amount: "Wrong amount",
      fraud_suspected: "Fraud suspected",
      timeout: "Timeout",
      other: "Other",
    }),
    []
  );

  const renderLabeledCode = (value, labelMap, explicitLabel = null) => {
    if (!value) return "-";
    const label = explicitLabel || labelMap?.[value] || value;
    return label === value ? value : `${label} (${value})`;
  };

  const handleResolve = async (dispute, outcome) => {
    if (!dispute?.trade_id || String(dispute.source || "").toLowerCase() !== "p2p") return;
    const resolution = (window.prompt(
      outcome === "buyer_wins"
        ? "Resolution admin si l'acheteur gagne"
        : "Resolution admin si le vendeur gagne"
    ) || "").trim();
    if (!resolution) return;
    setActionLoadingId(dispute.dispute_id);
    setError("");
    try {
      const payload = {
        outcome,
        resolution,
        ...(resolutionCode ? { resolution_code: resolutionCode } : {}),
        ...(proofType ? { proof_type: proofType } : {}),
        ...(proofRef.trim() ? { proof_ref: proofRef.trim() } : {}),
      };
      const result = await runWithStepUp({
        action: "p2p_dispute_resolve",
        actionLabel:
          outcome === "buyer_wins"
            ? "Confirmer la resolution du litige en faveur de l'acheteur"
            : "Confirmer la resolution du litige en faveur du vendeur",
        execute: (stepUpToken) =>
          api.resolveP2PDispute(dispute.trade_id, payload, stepUpToken),
      });
      if (!result) return;
      await load();
      if (selectedDetail?.dispute?.dispute_id === dispute.dispute_id) {
        const refreshed = await api.getAdminP2PDisputeDetail(dispute.dispute_id);
        setSelectedDetail(refreshed);
      }
    } catch (e) {
      setError(e?.message || "Impossible de resoudre le litige.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleSelectDispute = async (dispute) => {
    if (!dispute?.dispute_id) return;
    setDetailLoading(true);
    setError("");
    try {
      const detail = await api.getAdminP2PDisputeDetail(dispute.dispute_id);
      setSelectedDetail(detail);
    } catch (e) {
      setError(e?.message || "Impossible de charger le detail du litige.");
    } finally {
      setDetailLoading(false);
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
          <h1 className="text-2xl font-semibold text-slate-900">Litiges P2P</h1>
          <p className="text-sm text-slate-500">
            Vue admin des disputes ouvertes et resolues, avec issue acheteur/vendeur et contexte trade.
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
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDisputes("csv")}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportDisputes("json")}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export JSON
          </button>
        </div>
      </header>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Recharger" />

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-5">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Recherche</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID, acteur, raison, resolution"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">Toutes</option>
            <option value="p2p">P2P</option>
            <option value="paylink">Legacy</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Code resolution admin</label>
          <select
            value={resolutionCode}
            onChange={(e) => setResolutionCode(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {resolutionCodeOptions.map((item) => (
              <option key={item.value || "blank"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Type de preuve</label>
          <select
            value={proofType}
            onChange={(e) => setProofType(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {proofTypeOptions.map((item) => (
              <option key={item.value || "blank"} value={item.value}>
                {item.label}
              </option>
            ))}
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
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {filtered.length} litige(s)
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow">
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
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(DISPUTE_QUEUE_VIEWS).map(([value, label]) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs uppercase tracking-wide text-slate-500">Reference preuve admin</label>
          <Link
            to="/dashboard/admin/dispute-codes"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Voir la reference des codes
          </Link>
        </div>
        <input
          value={proofRef}
          onChange={(e) => setProofRef(e.target.value)}
          placeholder="URL, reference mobile money, receipt id..."
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4">
        {!loading && filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow">
            Aucun litige pour ce filtre.
          </div>
        ) : null}

        {filtered.map((d) => (
          <div key={d.dispute_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-slate-800">{d.dispute_id}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(d.status)}`}>
                    {d.status}
                  </span>
                  {d.trade_status ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(d.trade_status)}`}>
                      trade {d.trade_status}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {d.source || "p2p"}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Ref: <span className="font-mono">{d.trade_id || d.tx_id || "-"}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  Age: {formatAgeShort(d.updated_at || d.created_at)}
                  {["OPEN", "UNDER_REVIEW"].includes(String(d.status || "").toUpperCase()) &&
                  isOlderThanHours(d.updated_at || d.created_at, 12) ? (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      SLA
                    </span>
                  ) : null}
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {d.operator_workflow?.operator_status ||
                      (["OPEN", "UNDER_REVIEW"].includes(String(d.status || "").toUpperCase())
                        ? "needs_follow_up"
                        : "resolved")}
                  </span>
                  {d.operator_workflow?.owner_name || d.operator_workflow?.owner_user_id ? (
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {d.operator_workflow?.owner_name || d.operator_workflow?.owner_user_id}
                    </span>
                  ) : null}
                  {d.operator_workflow?.follow_up_at ? (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Follow-up
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Ouvert: {fmtDate(d.created_at)}</div>
                <div>Maj: {fmtDate(d.updated_at)}</div>
                <div>Resolue: {fmtDate(d.resolved_at)}</div>
                <button
                  type="button"
                  onClick={() => handleSelectDispute(d)}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {detailLoading && selectedDetail?.dispute?.dispute_id === d.dispute_id ? "Chargement..." : "Voir detail"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div><b>Acheteur:</b> {d.buyer_name || d.buyer_user_id || "-"}</div>
                <div><b>Vendeur:</b> {d.seller_name || d.seller_user_id || "-"}</div>
                <div><b>Ouverte par:</b> {d.opened_by_name || d.opened_by_user_id || "-"}</div>
                <div><b>Resolue par:</b> {d.resolved_by_name || d.resolved_by_user_id || "-"}</div>
                <div><b>Methode:</b> {d.payment_method || "-"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div><b>Token:</b> {d.token || "-"}</div>
                <div><b>Montant token:</b> {fmtAmount(d.token_amount, d.token, 8)}</div>
                <div><b>Prix:</b> {fmtAmount(d.price_bif_per_usd, "BIF/USD", 6)}</div>
                <div><b>Montant BIF:</b> {fmtAmount(d.bif_amount, "BIF", 2)}</div>
                <div><b>Montant legacy:</b> {fmtAmount(d.tx_amount, d.tx_currency, 6)}</div>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Motif</div>
                <div className="mt-1 text-slate-800">{d.reason || "-"}</div>
                {d.reason_code ? (
                  <div className="mt-1 text-xs text-slate-500">
                    Code: {renderLabeledCode(d.reason_code, reasonCodeLabels, d.reason_code_label)}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resolution</div>
                <div className="mt-1 text-slate-800">{d.resolution || "-"}</div>
                {d.resolution_code ? (
                  <div className="mt-1 text-xs text-slate-500">
                    Code: {renderLabeledCode(d.resolution_code, resolutionCodeLabels, d.resolution_code_label)}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Preuve structuree</div>
                <div className="mt-1 text-slate-800"><b>Type:</b> {renderLabeledCode(d.proof_type, proofTypeLabels, d.proof_type_label)}</div>
                <div className="mt-1 text-slate-800"><b>Reference:</b> {d.proof_ref || "-"}</div>
              </div>
              <div className="text-sm">
                <b>Evidence URL:</b>{" "}
                {d.evidence_url ? (
                  <a className="text-blue-600 hover:underline" href={d.evidence_url} target="_blank" rel="noreferrer">
                    {d.evidence_url}
                  </a>
                ) : (
                  "-"
                )}
              </div>
              {String(d.source || "").toLowerCase() === "p2p" &&
              ["OPEN", "UNDER_REVIEW"].includes(String(d.status || "").toUpperCase()) &&
              d.trade_id ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={actionLoadingId === d.dispute_id}
                    onClick={() => handleResolve(d, "buyer_wins")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionLoadingId === d.dispute_id ? "Traitement..." : "Acheteur gagne"}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === d.dispute_id}
                    onClick={() => handleResolve(d, "seller_wins")}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {actionLoadingId === d.dispute_id ? "Traitement..." : "Vendeur gagne"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Detail litige</h2>
        {!selectedDetail ? (
          <p className="mt-2 text-sm text-slate-500">Selectionne un litige pour voir sa timeline.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div><b>ID:</b> {selectedDetail.dispute?.dispute_id || "-"}</div>
              <div><b>Trade:</b> {selectedDetail.dispute?.trade_id || "-"}</div>
              <div><b>Statut:</b> {selectedDetail.dispute?.status || "-"}</div>
              <div><b>Source:</b> {selectedDetail.dispute?.source || "-"}</div>
            </div>
            <div className="space-y-2">
              {(selectedDetail.timeline || []).length === 0 ? (
                <p className="text-sm text-slate-500">Aucune timeline disponible.</p>
              ) : (
                selectedDetail.timeline.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(item.dispute_status || item.action)}`}>
                        {item.action}
                      </span>
                      <span className="text-xs text-slate-500">{fmtDate(item.created_at)}</span>
                      <span className="text-xs text-slate-500">
                        {item.actor_role || "-"} {item.actor_user_id ? `• ${item.actor_user_id}` : ""}
                      </span>
                    </div>
                    {item.reason ? <div className="mt-2"><b>Motif:</b> {item.reason}</div> : null}
                    {item.reason_code ? (
                      <div className="mt-1 text-slate-500">
                        <b>Code motif:</b> {renderLabeledCode(item.reason_code, reasonCodeLabels, item.reason_code_label)}
                      </div>
                    ) : null}
                    {item.resolution ? <div className="mt-2"><b>Resolution:</b> {item.resolution}</div> : null}
                    {item.resolution_code ? (
                      <div className="mt-1 text-slate-500">
                        <b>Code resolution:</b> {renderLabeledCode(item.resolution_code, resolutionCodeLabels, item.resolution_code_label)}
                      </div>
                    ) : null}
                    {item.outcome ? <div className="mt-1"><b>Outcome:</b> {item.outcome}</div> : null}
                    {item.proof_type ? (
                      <div className="mt-1 text-slate-500">
                        <b>Type preuve:</b> {renderLabeledCode(item.proof_type, proofTypeLabels, item.proof_type_label)}
                      </div>
                    ) : null}
                    {item.proof_ref ? <div className="mt-1"><b>Reference preuve:</b> {item.proof_ref}</div> : null}
                    {item.step_up_method ? (
                      <div className="mt-1 text-slate-500">
                        <b>Validation admin:</b> {item.step_up_method === "token" ? "Step-up token" : "Header fallback"}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <AdminOperatorWorkflowPanel
              title="Workflow operateur litige"
              entityType="p2p_dispute"
              entityId={selectedDetail.dispute?.dispute_id}
              workflow={selectedDetail.dispute?.operator_workflow || null}
              fallbackStatus={
                ["OPEN", "UNDER_REVIEW"].includes(String(selectedDetail.dispute?.status || "").toUpperCase())
                  ? "needs_follow_up"
                  : "resolved"
              }
              fallbackOwnerLabel={
                selectedDetail.dispute?.resolved_by_name ||
                selectedDetail.dispute?.opened_by_name ||
                "Arbitrage"
              }
              onSaved={async () => {
                await load();
                const refreshed = await api.getAdminP2PDisputeDetail(selectedDetail.dispute.dispute_id);
                setSelectedDetail(refreshed);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
