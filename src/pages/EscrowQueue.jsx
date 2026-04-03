import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import AdminOperatorWorkflowPanel from "@/components/admin/AdminOperatorWorkflowPanel";
import AdminStepUpBadge from "@/components/admin/AdminStepUpBadge";
import AdminStepUpDialog from "@/components/admin/AdminStepUpDialog";
import useAdminStepUp from "@/hooks/useAdminStepUp";
import { getCurrentUser } from "@/services/authStore";
import {
  ESCROW_REFUND_REASON_CODE_OPTIONS,
  ESCROW_REFUND_RESOLUTION_CODE_OPTIONS,
  PROOF_TYPE_OPTIONS,
  buildOptionLabelMap,
  prependBlankOption,
} from "@/constants/disputeCodes";
import { formatAgeShort, isOlderThanHours } from "@/utils/opsSla";
const API_URL = import.meta.env.VITE_API_URL || "";
const STATUSES = [
  "ALL",
  "CREATED",
  "FUNDED",
  "SWAPPED",
  "PAYOUT_PENDING",
  "PAID_OUT",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
  "FAILED",
];

const ESCROW_QUEUE_VIEWS = {
  all: "Tous",
  refund_pending: "Refund a traiter",
  payout_pending: "Payout a traiter",
  high_risk: "Risque eleve",
  attention: "Attention",
  stale: "Stale",
};

export default function EscrowQueue() {
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
  const [status, setStatus] = useState("ALL");
  const [queueView, setQueueView] = useState(() => {
    const initial = searchParams.get("queue");
    return initial && initial in ESCROW_QUEUE_VIEWS ? initial : "all";
  });
  const [refundOnly, setRefundOnly] = useState(false);
  const [minRisk, setMinRisk] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState(() => searchParams.get("target_id") || "");
  const [operatorStatusFilter, setOperatorStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [opsView, setOpsView] = useState("all");
  const [selected, setSelected] = useState(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [paidOutAmount, setPaidOutAmount] = useState("");
  const [proofType, setProofType] = useState("SCREENSHOT");
  const [proofRef, setProofRef] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonCode, setRefundReasonCode] = useState("");
  const [refundProofType, setRefundProofType] = useState("");
  const [refundProofRef, setRefundProofRef] = useState("");
  const [refundResolution, setRefundResolution] = useState("");
  const [refundResolutionCode, setRefundResolutionCode] = useState("");
  const [refundReasonCodeOptions, setRefundReasonCodeOptions] = useState(ESCROW_REFUND_REASON_CODE_OPTIONS);
  const [refundResolutionCodeOptions, setRefundResolutionCodeOptions] = useState(ESCROW_REFUND_RESOLUTION_CODE_OPTIONS);
  const [refundProofTypeOptions, setRefundProofTypeOptions] = useState(PROOF_TYPE_OPTIONS);
  const [payoutPendingIdemKey, setPayoutPendingIdemKey] = useState("");
  const [paidOutIdemKey, setPaidOutIdemKey] = useState("");

  const buildListQuery = () => {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (minRisk !== "") params.append("min_risk", String(minRisk));
    if (createdFrom) params.append("created_from", new Date(`${createdFrom}T00:00:00`).toISOString());
    if (createdTo) params.append("created_to", new Date(`${createdTo}T23:59:59`).toISOString());
    return params.toString();
  };

  const loadOrderDetail = async (orderId) => {
    try {
      const detail = await api.get(`/backoffice/escrow/orders/${orderId}`);
      setSelected(detail);
      setPayoutReference(detail?.payout_reference || "");
      setPaidOutAmount(detail?.bif_target ? String(detail.bif_target) : "");
    } catch {
      // Keep selected from list if detail endpoint fails in some environments.
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    setActionMessage("");
    try {
      const qs = buildListQuery();
      const data = await api.get(`/backoffice/escrow/orders${qs ? `?${qs}` : ""}`);
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      if (selected) {
        const refreshed = list.find((o) => o.id === selected.id);
        if (!refreshed) {
          setSelected(null);
        } else {
          await loadOrderDetail(refreshed.id);
        }
      }
    } catch (err) {
      setError(err.message || "Erreur chargement escrow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [status, minRisk, createdFrom, createdTo]);

  useEffect(() => {
    const requestedQueue = searchParams.get("queue");
    const requestedTargetId = searchParams.get("target_id") || "";
    if (requestedQueue && requestedQueue in ESCROW_QUEUE_VIEWS && requestedQueue !== queueView) {
      setQueueView(requestedQueue);
    }
    if (!requestedQueue && queueView !== "all") {
      setQueueView("all");
    }
    if (requestedTargetId !== query) {
      setQuery(requestedTargetId);
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
        if (Array.isArray(payload.escrow_refund_reason_codes)) {
          setRefundReasonCodeOptions(
            prependBlankOption(payload.escrow_refund_reason_codes, "Code motif (optionnel)")
          );
        }
        if (Array.isArray(payload.escrow_refund_resolution_codes)) {
          setRefundResolutionCodeOptions(
            prependBlankOption(payload.escrow_refund_resolution_codes, "Code resolution (optionnel)")
          );
        }
        if (Array.isArray(payload.proof_types)) {
          setRefundProofTypeOptions(
            prependBlankOption(payload.proof_types, "Type de preuve (optionnel)")
          );
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ownerQ = ownerFilter.trim().toLowerCase();
    const me = getCurrentUser();
    const myUserId = String(me?.user_id || "");
    const myName = String(me?.full_name || me?.email || "").toLowerCase();
    return orders.filter((o) => {
      const normalizedStatus = String(o.status || "").toUpperCase();
      const riskScore = Number(o.risk_score || 0);
      const workflow = o.operator_workflow || {};
      const operatorStatus =
        workflow.operator_status ||
        (["REFUND_PENDING", "PAYOUT_PENDING"].includes(normalizedStatus) ? "needs_follow_up" : "watching");
      const ownerLabel = workflow.owner_name || workflow.owner_user_id || o.trader_name || o.trader_id || "";
      const ownerUserId = String(workflow.owner_user_id || "");
      const hasOwner = Boolean(ownerLabel || ownerUserId);
      if (refundOnly && !["REFUND_PENDING", "REFUNDED"].includes(normalizedStatus)) {
        return false;
      }
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
      if (queueView === "refund_pending" && normalizedStatus !== "REFUND_PENDING") return false;
      if (queueView === "payout_pending" && normalizedStatus !== "PAYOUT_PENDING") return false;
      if (queueView === "high_risk" && riskScore < 80) return false;
      if (
        queueView === "stale" &&
        (!["REFUND_PENDING", "PAYOUT_PENDING"].includes(normalizedStatus) ||
          !isOlderThanHours(o.updated_at || o.created_at, 6))
      ) {
        return false;
      }
      if (
        queueView === "attention" &&
        normalizedStatus !== "REFUND_PENDING" &&
        normalizedStatus !== "PAYOUT_PENDING" &&
        riskScore < 80
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        o.id,
        o.status,
        o.user_name,
        o.user_id,
        o.trader_name,
        o.trader_id,
        o.payout_account_name,
        o.payout_account_number,
        o.deposit_tx_hash,
        o.payout_reference,
      ]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, refundOnly, queueView, operatorStatusFilter, ownerFilter, opsView]);

  const queueCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      refund_pending: 0,
      payout_pending: 0,
      high_risk: 0,
      attention: 0,
      stale: 0,
    };
    for (const order of orders) {
      const normalizedStatus = String(order.status || "").toUpperCase();
      const riskScore = Number(order.risk_score || 0);
      if (normalizedStatus === "REFUND_PENDING") counts.refund_pending += 1;
      if (normalizedStatus === "PAYOUT_PENDING") counts.payout_pending += 1;
      if (riskScore >= 80) counts.high_risk += 1;
      if (
        ["REFUND_PENDING", "PAYOUT_PENDING"].includes(normalizedStatus) &&
        isOlderThanHours(order.updated_at || order.created_at, 6)
      ) counts.stale += 1;
      if (normalizedStatus === "REFUND_PENDING" || normalizedStatus === "PAYOUT_PENDING" || riskScore >= 80) {
        counts.attention += 1;
      }
    }
    return counts;
  }, [orders]);

  const refundReasonCodeLabels = useMemo(
    () => buildOptionLabelMap(refundReasonCodeOptions),
    [refundReasonCodeOptions]
  );
  const refundResolutionCodeLabels = useMemo(
    () => buildOptionLabelMap(refundResolutionCodeOptions),
    [refundResolutionCodeOptions]
  );
  const refundProofTypeLabels = useMemo(
    () => buildOptionLabelMap(refundProofTypeOptions),
    [refundProofTypeOptions]
  );

  const renderLabeledCode = (value, labelMap, explicitLabel = null) => {
    if (!value) return "-";
    const label = explicitLabel || labelMap?.[value] || value;
    return label === value ? value : `${label} (${value})`;
  };

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  const fmtAmount = (v, code, maxFraction = 2) => {
    if (v === null || v === undefined) return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFraction,
    })}${code ? ` ${code}` : ""}`;
  };

  const statusClass = (s) => {
    const v = String(s || "").toUpperCase();
    if (v === "PAID_OUT") return "bg-emerald-100 text-emerald-700";
    if (v === "PAYOUT_PENDING") return "bg-amber-100 text-amber-700";
    if (v === "REFUND_PENDING") return "bg-rose-100 text-rose-700";
    if (v === "REFUNDED") return "bg-fuchsia-100 text-fuchsia-700";
    if (v === "FAILED" || v === "CANCELLED") return "bg-rose-100 text-rose-700";
    if (v === "FUNDED" || v === "SWAPPED") return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-700";
  };

  const riskClass = (score) => {
    const s = Number(score || 0);
    if (s >= 80) return "bg-rose-100 text-rose-700";
    if (s >= 50) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const onSelectOrder = async (order) => {
    setSelected(order);
    setPayoutReference(order?.payout_reference || "");
    setPaidOutAmount(order?.bif_target ? String(order.bif_target) : "");
    setProofRef("");
    setRefundReason("");
    setRefundReasonCode("");
    setRefundProofType("");
    setRefundProofRef("");
    setRefundResolution("");
    setRefundResolutionCode("");
    setPayoutPendingIdemKey("");
    setPaidOutIdemKey("");
    setActionMessage("");
    await loadOrderDetail(order.id);
  };

  useEffect(() => {
    const targetId = (searchParams.get("target_id") || "").trim();
    if (!targetId || !filtered.length) return;
    const match = filtered.find((item) => String(item.id || "").trim() === targetId);
    if (!match) return;
    if (String(selected?.id || "").trim() === targetId) return;
    onSelectOrder(match);
  }, [filtered, searchParams, selected?.id]);

  const setOrderPayoutPending = async () => {
    if (!selected?.id) return;
    setActionLoading(true);
    setActionMessage("");
    setError("");
    try {
      const idemKey =
        payoutPendingIdemKey || api.newIdempotencyKey(`escrow-payout-pending-${selected.id}`);
      if (!payoutPendingIdemKey) setPayoutPendingIdemKey(idemKey);
      await api.postIdempotent(`/backoffice/escrow/orders/${selected.id}/payout-pending`, {
        payout_reference: payoutReference || null,
      }, idemKey, `escrow-payout-pending-${selected.id}`);
      setActionMessage("Ordre passe en PAYOUT_PENDING.");
      setPayoutPendingIdemKey("");
      await fetchOrders();
      await loadOrderDetail(selected.id);
    } catch (err) {
      setError(err.message || "Impossible de passer en payout pending");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmPaidOut = async () => {
    if (!selected?.id) return;
    if (!paidOutAmount || Number(paidOutAmount) <= 0) {
      setError("Montant BIF invalide pour la confirmation.");
      return;
    }
    if (!payoutReference.trim()) {
      setError("Reference payout obligatoire.");
      return;
    }
    if (!proofRef.trim()) {
      setError("Preuve obligatoire (proof_ref).");
      return;
    }
    setActionLoading(true);
    setActionMessage("");
    setError("");
    try {
      const idemKey =
        paidOutIdemKey || api.newIdempotencyKey(`escrow-paid-out-${selected.id}`);
      if (!paidOutIdemKey) setPaidOutIdemKey(idemKey);
      await api.postIdempotent(`/backoffice/escrow/orders/${selected.id}/paid-out`, {
        amount_bif: Number(paidOutAmount),
        payout_reference: payoutReference.trim(),
        proof_type: proofType,
        proof_ref: proofRef.trim(),
        proof_metadata: {},
      }, idemKey, `escrow-paid-out-${selected.id}`);
      setActionMessage("Payout confirme (PAID_OUT).");
      setPaidOutIdemKey("");
      await fetchOrders();
      await loadOrderDetail(selected.id);
    } catch (err) {
      setError(err.message || "Impossible de confirmer le payout");
    } finally {
      setActionLoading(false);
    }
  };

  const requestRefund = async () => {
    if (!selected?.id) return;
    if (!refundReason.trim()) {
      setError("Motif de refund obligatoire.");
      return;
    }
    setActionLoading(true);
    setActionMessage("");
    setError("");
    try {
      const payload = {
        reason: refundReason.trim(),
        ...(refundReasonCode ? { reason_code: refundReasonCode } : {}),
        ...(refundProofType ? { proof_type: refundProofType } : {}),
        ...(refundProofRef.trim() ? { proof_ref: refundProofRef.trim() } : {}),
      };
      const result = await runWithStepUp({
        action: "escrow_refund_request",
        actionLabel: "Confirmer la demande de refund escrow",
        execute: (stepUpToken) =>
          api.requestEscrowRefund(selected.id, payload, stepUpToken),
      });
      if (!result) return;
      setActionMessage("Refund demande. Statut passe en REFUND_PENDING.");
      await fetchOrders();
      await loadOrderDetail(selected.id);
    } catch (err) {
      setError(err.message || "Impossible de demander le refund.");
    } finally {
    setActionLoading(false);
    }
  };

  const confirmRefund = async () => {
    if (!selected?.id) return;
    if (!refundResolution.trim()) {
      setError("Resolution de refund obligatoire.");
      return;
    }
    setActionLoading(true);
    setActionMessage("");
    setError("");
    try {
      const payload = {
        resolution: refundResolution.trim(),
        ...(refundResolutionCode ? { resolution_code: refundResolutionCode } : {}),
        ...(refundProofType ? { proof_type: refundProofType } : {}),
        ...(refundProofRef.trim() ? { proof_ref: refundProofRef.trim() } : {}),
      };
      const result = await runWithStepUp({
        action: "escrow_refund_confirm",
        actionLabel: "Confirmer le refund final escrow",
        execute: (stepUpToken) =>
          api.confirmEscrowRefund(selected.id, payload, stepUpToken),
      });
      if (!result) return;
      setActionMessage("Refund confirme. Statut passe en REFUNDED.");
      await fetchOrders();
      await loadOrderDetail(selected.id);
    } catch (err) {
      setError(err.message || "Impossible de confirmer le refund.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminStepUpDialog
        open={stepUpOpen}
        loading={stepUpLoading}
        error={stepUpError}
        actionLabel={stepUpActionLabel}
        onClose={closeStepUp}
        onConfirm={confirmStepUp}
      />
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Escrow Queue</h1>
            <p className="text-sm text-slate-500 mt-1">
              Suivi backoffice des ordres escrow, statuts et montants.
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
            type="button"
            onClick={fetchOrders}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={refundOnly}
              onChange={(e) => setRefundOnly(e.target.checked)}
            />
            Refund only
          </label>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Risque min (0-100)"
            type="number"
            min="0"
            max="100"
            value={minRisk}
            onChange={(e) => setMinRisk(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rechercher id, deposant, operateur, beneficiaire payout..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={operatorStatusFilter}
            onChange={(e) => setOperatorStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Tous les workflows operateur</option>
            <option value="needs_follow_up">Needs follow-up</option>
            <option value="blocked">Blocked</option>
            <option value="watching">Watching</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filtrer par owner operateur..."
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          />
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {filtered.length} ordre(s){refundOnly ? " refund" : ""}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(ESCROW_QUEUE_VIEWS).map(([value, label]) => (
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

        <ApiErrorAlert
          message={error}
          onRetry={fetchOrders}
          retryLabel="Recharger la file"
          className="mt-4"
        />

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Order ID</th>
                  <th className="text-left px-3 py-2 font-medium">Deposant</th>
                  <th className="text-left px-3 py-2 font-medium">Operateur payout</th>
                  <th className="text-left px-3 py-2 font-medium">USDC</th>
                  <th className="text-left px-3 py-2 font-medium">BIF</th>
                  <th className="text-left px-3 py-2 font-medium">Age</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => onSelectOrder(o)}
                    className={`border-t border-slate-200 hover:bg-slate-50 cursor-pointer ${
                      String(o.status || "").toUpperCase() === "REFUND_PENDING"
                        ? "bg-rose-50/70"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{o.user_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{o.user_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{o.trader_name || "-"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{o.trader_id || "-"}</div>
                    </td>
                    <td className="px-3 py-2">{fmtAmount(o.usdc_expected, "USDC", 6)}</td>
                    <td className="px-3 py-2">{fmtAmount(o.bif_target, "BIF", 2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span>{formatAgeShort(o.updated_at || o.created_at)}</span>
                        {["REFUND_PENDING", "PAYOUT_PENDING"].includes(String(o.status || "").toUpperCase()) &&
                        isOlderThanHours(o.updated_at || o.created_at, 6) ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            SLA
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClass(o.status)}`}>
                          {o.status}
                        </span>
                        {(o.operator_workflow?.operator_status || ["REFUND_PENDING", "PAYOUT_PENDING"].includes(String(o.status || "").toUpperCase())) ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {o.operator_workflow?.operator_status ||
                              (["REFUND_PENDING", "PAYOUT_PENDING"].includes(String(o.status || "").toUpperCase())
                                ? "needs_follow_up"
                                : "watching")}
                          </span>
                        ) : null}
                        {o.operator_workflow?.owner_name || o.operator_workflow?.owner_user_id ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {o.operator_workflow?.owner_name || o.operator_workflow?.owner_user_id}
                          </span>
                        ) : null}
                        {String(o.status || "").toUpperCase() === "REFUND_PENDING" ? (
                          <span className="inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            A traiter
                          </span>
                        ) : null}
                        {o.operator_workflow?.follow_up_at ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Follow-up
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${riskClass(o.risk_score)}`}>
                        {o.risk_score ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Aucun ordre trouve.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Detail ordre</h2>
        {!selected ? (
          <p className="text-sm text-slate-500 mt-2">Clique une ligne pour voir les details.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>ID:</b> {selected.id}</p>
                <p><b>Status:</b> {selected.status}</p>
                <p><b>Created:</b> {fmtDate(selected.created_at)}</p>
                <p><b>Updated:</b> {fmtDate(selected.updated_at)}</p>
                <p><b>Funded at:</b> {fmtDate(selected.funded_at)}</p>
                <p><b>Swapped at:</b> {fmtDate(selected.swapped_at)}</p>
                <p><b>Payout initiated:</b> {fmtDate(selected.payout_initiated_at)}</p>
                <p><b>Paid out at:</b> {fmtDate(selected.paid_out_at)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p><b>Deposant:</b> {selected.user_name || selected.user_id || "-"}</p>
                <p><b>Operateur payout:</b> {selected.trader_name || selected.trader_id || "-"}</p>
                <p><b>USDC expected:</b> {fmtAmount(selected.usdc_expected, "USDC", 6)}</p>
                <p><b>USDC received:</b> {fmtAmount(selected.usdc_received, "USDC", 6)}</p>
                <p><b>USDT target:</b> {fmtAmount(selected.usdt_target, "USDT", 6)}</p>
                <p><b>USDT received:</b> {fmtAmount(selected.usdt_received, "USDT", 6)}</p>
                <p><b>BIF target:</b> {fmtAmount(selected.bif_target, "BIF", 2)}</p>
                <p><b>BIF paid:</b> {fmtAmount(selected.bif_paid, "BIF", 2)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
                <p><b>Deposit network:</b> {selected.deposit_network || "-"}</p>
                <p><b>Deposit address:</b> {selected.deposit_address || "-"}</p>
                <p><b>Deposit tx hash:</b> {selected.deposit_tx_hash || "-"}</p>
                <p><b>Payout method:</b> {selected.payout_method || "-"}</p>
                <p><b>Payout provider:</b> {selected.payout_provider || "-"}</p>
                <p><b>Beneficiaire payout:</b> {selected.payout_account_name || "-"}</p>
                <p><b>Compte payout:</b> {selected.payout_account_number || "-"}</p>
                <p><b>Payout account:</b> {selected.payout_account_name || "-"} / {selected.payout_account_number || "-"}</p>
                <p><b>Payout reference:</b> {selected.payout_reference || "-"}</p>
                <p><b>Flags:</b> {Array.isArray(selected.flags) && selected.flags.length ? selected.flags.join(", ") : "-"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Actions operateur</h3>
                <Link
                  to="/dashboard/admin/dispute-codes"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Voir la reference des codes
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Reference payout"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Montant BIF"
                  type="number"
                  min="0"
                  value={paidOutAmount}
                  onChange={(e) => setPaidOutAmount(e.target.value)}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value)}
                >
                  <option value="SCREENSHOT">SCREENSHOT</option>
                  <option value="PDF">PDF</option>
                  <option value="RECEIPT_ID">RECEIPT_ID</option>
                  <option value="BANK_REFERENCE">BANK_REFERENCE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Proof ref (URL, ID, reference)"
                value={proofRef}
                onChange={(e) => setProofRef(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Motif de refund"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={refundReasonCode}
                onChange={(e) => setRefundReasonCode(e.target.value)}
              >
                {refundReasonCodeOptions.map((item) => (
                  <option key={item.value || "blank"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={refundProofType}
                onChange={(e) => setRefundProofType(e.target.value)}
              >
                {refundProofTypeOptions.map((item) => (
                  <option key={item.value || "blank"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Reference preuve refund"
                value={refundProofRef}
                onChange={(e) => setRefundProofRef(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Resolution de refund"
                value={refundResolution}
                onChange={(e) => setRefundResolution(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={refundResolutionCode}
                onChange={(e) => setRefundResolutionCode(e.target.value)}
              >
                {refundResolutionCodeOptions.map((item) => (
                  <option key={item.value || "blank"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading || selected.status !== "SWAPPED"}
                  onClick={setOrderPayoutPending}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                >
                  Mettre en PAYOUT_PENDING
                </button>
                <button
                  type="button"
                  disabled={actionLoading || selected.status !== "PAYOUT_PENDING"}
                  onClick={confirmPaidOut}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-sm text-white disabled:opacity-50 hover:bg-slate-700"
                >
                  Confirmer PAID_OUT
                </button>
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    !["FUNDED", "SWAPPED", "PAYOUT_PENDING"].includes(String(selected.status || "").toUpperCase())
                  }
                  onClick={requestRefund}
                  className="px-3 py-2 rounded-lg border border-amber-300 text-sm text-amber-800 disabled:opacity-50 hover:bg-amber-50"
                >
                  Demander REFUND_PENDING
                </button>
                <button
                  type="button"
                  disabled={actionLoading || String(selected.status || "").toUpperCase() !== "REFUND_PENDING"}
                  onClick={confirmRefund}
                  className="px-3 py-2 rounded-lg bg-rose-700 text-sm text-white disabled:opacity-50 hover:bg-rose-800"
                >
                  Confirmer REFUNDED
                </button>
              </div>

              {actionMessage ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <h3 className="font-semibold text-slate-900">Historique refund</h3>
              {Array.isArray(selected.refund_audit_trail) && selected.refund_audit_trail.length > 0 ? (
                <div className="space-y-2">
                  {selected.refund_audit_trail.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClass(item.status || item.action)}`}>
                          {item.action}
                        </span>
                        <span className="text-xs text-slate-500">{fmtDate(item.created_at)}</span>
                        <span className="text-xs text-slate-500">
                          {item.actor_role || "-"} {item.actor_user_id ? `• ${item.actor_user_id}` : ""}
                        </span>
                      </div>
                      {item.reason ? (
                        <div className="mt-1 text-slate-700">
                          <b>Motif:</b> {item.reason}
                        </div>
                      ) : null}
                      {item.reason_code ? (
                        <div className="mt-1 text-slate-500">
                          <b>Code motif:</b> {renderLabeledCode(item.reason_code, refundReasonCodeLabels, item.reason_code_label)}
                        </div>
                      ) : null}
                      {item.resolution ? (
                        <div className="mt-1 text-slate-700">
                          <b>Resolution:</b> {item.resolution}
                        </div>
                      ) : null}
                      {item.resolution_code ? (
                        <div className="mt-1 text-slate-500">
                          <b>Code resolution:</b> {renderLabeledCode(item.resolution_code, refundResolutionCodeLabels, item.resolution_code_label)}
                        </div>
                      ) : null}
                      {item.proof_type ? (
                        <div className="mt-1 text-slate-500">
                          <b>Type preuve:</b> {renderLabeledCode(item.proof_type, refundProofTypeLabels, item.proof_type_label)}
                        </div>
                      ) : null}
                      {item.proof_ref ? (
                        <div className="mt-1 text-slate-700">
                          <b>Reference preuve:</b> {item.proof_ref}
                        </div>
                      ) : null}
                      {item.step_up_method ? (
                        <div className="mt-1 text-slate-500">
                          <b>Validation admin:</b> {item.step_up_method === "token" ? "Step-up token" : "Header fallback"}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Aucun historique refund pour cet ordre.</p>
              )}
            </div>

            <AdminOperatorWorkflowPanel
              title="Workflow operateur escrow"
              entityType="escrow_order"
              entityId={selected.id}
              workflow={selected.operator_workflow || null}
              fallbackStatus={
                ["REFUND_PENDING", "PAYOUT_PENDING"].includes(String(selected.status || "").toUpperCase())
                  ? "needs_follow_up"
                  : "watching"
              }
              fallbackOwnerLabel={selected.trader_name || selected.trader_id || "Backoffice"}
              onSaved={async () => {
                await fetchOrders();
                await loadOrderDetail(selected.id);
              }}
            />

            <a
              href={`${API_URL}/backoffice/escrow/orders/${selected.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Ouvrir endpoint detail ordre
            </a>
            <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 overflow-auto text-xs">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
