import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";
import { getCurrentUser } from "@/services/authStore";
import { formatAgeShort, isOlderThanHours } from "@/utils/opsSla";

function pickOperatorStatus(workflow, fallback) {
  return workflow?.operator_status || fallback;
}

function pickOwner(workflow, fallback) {
  return workflow?.owner_name || workflow?.owner_user_id || fallback;
}

function pickLastActionAt(workflow, fallback) {
  return workflow?.last_action_at || fallback;
}

function pickMeta(baseMeta, workflow) {
  if (workflow?.blocked_reason) return workflow.blocked_reason;
  if (workflow?.notes) return workflow.notes;
  return baseMeta;
}

function toLocalDatetimeValue(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const offset = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeUrgencies(escrowOrders, disputes, paymentIntents) {
  const items = [];

  for (const order of escrowOrders) {
    const workflow = order.operator_workflow || null;
    const status = String(order.status || "").toUpperCase();
    const ageSource = order.updated_at || order.created_at;
    const actionSource = pickLastActionAt(workflow, ageSource);
    const derivedOperatorStatus = ["REFUND_PENDING", "PAYOUT_PENDING"].includes(status) && isOlderThanHours(ageSource, 6)
      ? "blocked"
      : "needs_follow_up";
    const operatorStatus = pickOperatorStatus(workflow, derivedOperatorStatus);
    const stale = ["REFUND_PENDING", "PAYOUT_PENDING"].includes(status) && isOlderThanHours(actionSource, 6);
    const highRisk = Number(order.risk_score || 0) >= 80;
    if (!stale && !highRisk && !["REFUND_PENDING", "PAYOUT_PENDING"].includes(status)) continue;

    items.push({
      id: `escrow:${order.id}`,
      entityType: "escrow_order",
      entityId: order.id,
      kind: "escrow",
      title: order.id,
      subtitle: `${order.user_name || order.user_id || "-"} -> ${order.trader_name || order.trader_id || "-"}`,
      status,
      priority: stale || status === "REFUND_PENDING" || highRisk ? "critical" : "warning",
      operatorStatus,
      age: formatAgeShort(actionSource),
      stale,
      owner: pickOwner(workflow, order.trader_name || order.trader_id || "Backoffice"),
      lastActionAt: actionSource,
      to: `/dashboard/admin/escrow?queue=${stale ? "stale" : status === "REFUND_PENDING" ? "refund_pending" : status === "PAYOUT_PENDING" ? "payout_pending" : "high_risk"}`,
      meta: pickMeta(highRisk ? `Risk ${order.risk_score}` : status, workflow),
      operatorWorkflow: workflow,
    });
  }

  for (const dispute of disputes) {
    const workflow = dispute.operator_workflow || null;
    const status = String(dispute.status || "").toUpperCase();
    const ageSource = dispute.updated_at || dispute.created_at;
    const actionSource = pickLastActionAt(workflow, ageSource);
    const derivedOperatorStatus = ["OPEN", "UNDER_REVIEW"].includes(status) && isOlderThanHours(ageSource, 12)
      ? "blocked"
      : "needs_follow_up";
    const operatorStatus = pickOperatorStatus(workflow, derivedOperatorStatus);
    const stale = ["OPEN", "UNDER_REVIEW"].includes(status) && isOlderThanHours(actionSource, 12);
    if (!["OPEN", "UNDER_REVIEW"].includes(status)) continue;

    items.push({
      id: `dispute:${dispute.dispute_id}`,
      entityType: "p2p_dispute",
      entityId: dispute.dispute_id,
      kind: "p2p_dispute",
      title: dispute.dispute_id,
      subtitle: `${dispute.buyer_name || dispute.buyer_user_id || "-"} / ${dispute.seller_name || dispute.seller_user_id || "-"}`,
      status,
      priority: stale ? "critical" : "warning",
      operatorStatus,
      age: formatAgeShort(actionSource),
      stale,
      owner: pickOwner(workflow, dispute.resolved_by_name || dispute.opened_by_name || "Arbitrage"),
      lastActionAt: actionSource,
      to: `/dashboard/admin/p2p/disputes?queue=${stale ? "stale" : "to_review"}`,
      meta: pickMeta(dispute.reason || dispute.source || "P2P dispute", workflow),
      operatorWorkflow: workflow,
    });
  }

  for (const intent of paymentIntents) {
    const workflow = intent.operator_workflow || null;
    const status = String(intent.status || "").toLowerCase();
    const ageSource = intent.updated_at || intent.created_at;
    const actionSource = pickLastActionAt(workflow, ageSource);
    const derivedOperatorStatus = ["pending_provider", "settled", "failed"].includes(status) && isOlderThanHours(ageSource, 2)
      ? "blocked"
      : status === "failed"
        ? "blocked"
        : "needs_follow_up";
    const operatorStatus = pickOperatorStatus(workflow, derivedOperatorStatus);
    const stale = ["pending_provider", "settled", "failed"].includes(status) && isOlderThanHours(actionSource, 2);
    const actionable = !["credited", "cancelled"].includes(status);
    if (!actionable) continue;

    items.push({
      id: `payment:${intent.intent_id}`,
      entityType: "payment_intent",
      entityId: intent.intent_id,
      kind: "payment_intent",
      title: intent.merchant_reference || intent.intent_id,
      subtitle: intent.user?.full_name || intent.user?.email || intent.payer_identifier || "-",
      status,
      priority: stale || status === "failed" ? "critical" : "warning",
      operatorStatus,
      age: formatAgeShort(actionSource),
      stale,
      owner: pickOwner(workflow, intent.provider_channel || intent.provider_code || "Payments"),
      lastActionAt: actionSource,
      to: `/dashboard/admin/payment-intents?queue=${stale ? "stale" : "actionable"}`,
      meta: pickMeta(`${intent.currency_code || ""} ${intent.amount || ""}`.trim(), workflow),
      operatorWorkflow: workflow,
    });
  }

  return items.sort((a, b) => new Date(b.lastActionAt || 0).getTime() - new Date(a.lastActionAt || 0).getTime());
}

function hydrateBackendUrgencies(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    entityType: item.entityType || item.entity_type,
    entityId: item.entityId || item.entity_id,
    operatorStatus: item.operatorStatus || item.operator_status,
    lastActionAt: item.lastActionAt || item.last_action_at,
    operatorWorkflow: item.operatorWorkflow || item.operator_workflow || null,
  }));
}

function badgeTone(priority) {
  if (priority === "critical") return "bg-rose-100 text-rose-700";
  if (priority === "warning") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function normalizeOwnerLabel(value) {
  return String(value || "").trim().toLowerCase();
}

export default function AdminOpsUrgenciesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [workflowSummary, setWorkflowSummary] = useState(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [operatorStatusFilter, setOperatorStatusFilter] = useState("all");
  const [opsView, setOpsView] = useState("all");
  const [ownerFocus, setOwnerFocus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [form, setForm] = useState({
    operator_status: "needs_follow_up",
    blocked_reason: "",
    notes: "",
    follow_up_at: "",
    owner_user_id: "",
  });

  const me = getCurrentUser();
  const myUserId = String(me?.user_id || "");
  const myOwnerLabel = normalizeOwnerLabel(me?.full_name || me?.email || me?.user_id);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [backendUrgencies, escrowOrders, disputes, paymentIntents, summary] = await Promise.all([
        typeof api.getAdminOpsUrgencies === "function"
          ? api
              .getAdminOpsUrgencies({
                kind: kindFilter,
                operator_status: operatorStatusFilter,
                owner_key: ownerFocus,
                view: opsView,
                q: query.trim() || undefined,
              })
              .catch(() => null)
          : Promise.resolve(null),
        api.get("/backoffice/escrow/orders").catch(() => []),
        api.get("/api/admin/p2p/disputes").catch(() => []),
        api.getAdminPaymentIntents({ limit: 100 }).catch(() => []),
        typeof api.getAdminOperatorWorkflowSummary === "function"
          ? api.getAdminOperatorWorkflowSummary().catch(() => null)
          : Promise.resolve(null),
      ]);
      setItems(
        Array.isArray(backendUrgencies)
          ? hydrateBackendUrgencies(backendUrgencies)
          : normalizeUrgencies(
              Array.isArray(escrowOrders) ? escrowOrders : [],
              Array.isArray(disputes) ? disputes : [],
              Array.isArray(paymentIntents) ? paymentIntents : []
            )
      );
      setWorkflowSummary(summary && typeof summary === "object" ? summary : null);
    } catch (err) {
      setError(err?.message || "Impossible de charger les urgences OPS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [kindFilter, operatorStatusFilter, opsView, ownerFocus, query]);

  const filtered = useMemo(() => {
    if (items.length && typeof api.getAdminOpsUrgencies === "function") {
      return items;
    }
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const workflow = item.operatorWorkflow || {};
      const ownerUserId = String(workflow.owner_user_id || "");
      const ownerLabel = normalizeOwnerLabel(item.owner);
      const hasOwner = Boolean(ownerLabel || ownerUserId);
      const isMine =
        (myUserId && ownerUserId === myUserId) ||
        (myOwnerLabel && ownerLabel === myOwnerLabel);
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (operatorStatusFilter !== "all" && item.operatorStatus !== operatorStatusFilter) return false;
      if (opsView === "mine" && !isMine) return false;
      if (opsView === "team" && isMine) return false;
      if (opsView === "unassigned" && hasOwner) return false;
      if (opsView === "blocked_only" && item.operatorStatus !== "blocked") return false;
      if (ownerFocus !== "all" && ownerLabel !== ownerFocus) return false;
      if (!q) return true;
      return [item.title, item.subtitle, item.status, item.meta, item.owner]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(q);
    });
  }, [items, kindFilter, operatorStatusFilter, opsView, ownerFocus, query]);

  const summary = useMemo(() => {
    if (workflowSummary && typeof workflowSummary === "object") {
      return {
        all: Number(workflowSummary.all || 0),
        mine: Number(workflowSummary.mine || 0),
        team: Number(workflowSummary.team || 0),
        unassigned: Number(workflowSummary.unassigned || 0),
        blocked_only: Number(workflowSummary.blocked_only || 0),
      };
    }
    const stats = {
      all: items.length,
      mine: 0,
      team: 0,
      unassigned: 0,
      blocked_only: 0,
    };
    for (const item of items) {
      const workflow = item.operatorWorkflow || {};
      const ownerUserId = String(workflow.owner_user_id || "");
      const ownerLabel = normalizeOwnerLabel(item.owner);
      const hasOwner = Boolean(ownerLabel || ownerUserId);
      const isMine =
        (myUserId && ownerUserId === myUserId) ||
        (myOwnerLabel && ownerLabel === myOwnerLabel);
      if (isMine) stats.mine += 1;
      else stats.team += 1;
      if (!hasOwner) stats.unassigned += 1;
      if (item.operatorStatus === "blocked") stats.blocked_only += 1;
    }
    return stats;
  }, [items, workflowSummary]);

  const ownerBreakdown = useMemo(() => {
    if (workflowSummary?.owner_breakdown?.length) {
      return workflowSummary.owner_breakdown
        .map((owner) => ({
          key: owner.owner_key || "__unassigned__",
          label: owner.owner_label || "Non assigne",
          count: Number(owner.count || 0),
          critical: Number(owner.blocked_count || 0) + Number(owner.overdue_follow_up_count || 0),
        }))
        .slice(0, 6);
    }
    const counts = new Map();
    for (const item of items) {
      const key = normalizeOwnerLabel(item.owner) || "__unassigned__";
      const label = key === "__unassigned__" ? "Non assigne" : item.owner;
      const current = counts.get(key) || { key, label, count: 0, critical: 0 };
      current.count += 1;
      if (item.priority === "critical" || item.operatorStatus === "blocked") current.critical += 1;
      counts.set(key, current);
    }
    return Array.from(counts.values())
      .sort((a, b) => {
        if (b.critical !== a.critical) return b.critical - a.critical;
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 6);
  }, [items, workflowSummary]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }
    setSelectedId((current) => (current && filtered.some((item) => item.id === current) ? current : filtered[0].id));
  }, [filtered]);

  const selectedItem = useMemo(
    () => filtered.find((item) => item.id === selectedId) || null,
    [filtered, selectedId]
  );

  useEffect(() => {
    if (!selectedItem) return;
    const workflow = selectedItem.operatorWorkflow || {};
    setForm({
      operator_status: workflow.operator_status || selectedItem.operatorStatus || "needs_follow_up",
      blocked_reason: workflow.blocked_reason || "",
      notes: workflow.notes || "",
      follow_up_at: toLocalDatetimeValue(workflow.follow_up_at),
      owner_user_id: workflow.owner_user_id || "",
    });
    setOwnerQuery(workflow.owner_name || "");
    setSaveError("");
  }, [selectedItem]);

  useEffect(() => {
    const q = ownerQuery.trim();
    if (!q || q.length < 2) {
      setOwnerOptions([]);
      return;
    }
    if (typeof api.getUsers !== "function") {
      setOwnerOptions([]);
      return;
    }
    let cancelled = false;
    Promise.resolve(api.getUsers(q))
      .then((data) => {
        if (cancelled) return;
        setOwnerOptions(Array.isArray(data) ? data.slice(0, 12) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setOwnerOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerQuery]);

  const handleAssignToMe = () => {
    const me = getCurrentUser();
    if (!me?.user_id) return;
    setForm((current) => ({ ...current, owner_user_id: String(me.user_id) }));
    setOwnerQuery(me.full_name || me.email || String(me.user_id));
  };

  const handleOwnerPick = (user) => {
    setForm((current) => ({ ...current, owner_user_id: String(user.user_id) }));
    setOwnerQuery(user.full_name || user.email || user.user_id);
    setOwnerOptions([]);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setSaveError("");
    try {
      await api.updateAdminOperatorWorkItem(selectedItem.entityType, selectedItem.entityId, {
        operator_status: form.operator_status,
        blocked_reason: form.operator_status === "blocked" ? form.blocked_reason || null : null,
        notes: form.notes || null,
        follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
        owner_user_id: form.owner_user_id || null,
      });
      await load();
    } catch (err) {
      setSaveError(err?.message || "Impossible d'enregistrer le workflow operateur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Urgences OPS</h1>
          <p className="text-sm text-slate-500">
            Vue transversale des dossiers a traiter, stale ou bloques.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Recharger les urgences" />

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dossier, acteur, meta..."
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="escrow">Escrow</option>
          <option value="p2p_dispute">Litiges P2P</option>
          <option value="payment_intent">Paiements BIF</option>
        </select>
        <select
          value={operatorStatusFilter}
          onChange={(e) => setOperatorStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts operateur</option>
          <option value="needs_follow_up">Needs follow-up</option>
          <option value="blocked">Blocked</option>
        </select>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {filtered.length} urgence(s)
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["all", "Toutes", summary.all],
          ["mine", "Mes urgences", summary.mine],
          ["team", "Equipe", summary.team],
          ["unassigned", "Non assignees", summary.unassigned],
          ["blocked_only", "Blocked", summary.blocked_only],
        ].map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setOpsView(value)}
            className={`rounded-2xl border px-4 py-3 text-left ${
              opsView === value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{count}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Charge par owner</h2>
            <p className="text-xs text-slate-500">Raccourcis pour filtrer rapidement les urgences par operateur.</p>
          </div>
          {ownerFocus !== "all" ? (
            <button
              type="button"
              onClick={() => setOwnerFocus("all")}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Reinitialiser
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ownerBreakdown.map((owner) => (
            <button
              key={owner.key}
              type="button"
              onClick={() => setOwnerFocus(owner.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                ownerFocus === owner.key
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {owner.label} ({owner.count})
              {owner.critical > 0 ? ` • ${owner.critical} critique(s)` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Dossier</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Operateur</th>
                <th className="px-4 py-3 text-left">Age</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Acces</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t cursor-pointer ${selectedId === item.id ? "bg-blue-50/60" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td className="px-4 py-3 text-slate-700">{item.kind}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500">{item.subtitle}</div>
                    <div className="text-xs text-slate-400">{item.meta}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeTone(item.priority)}`}>
                        {item.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {item.operatorStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.stale ? "SLA depasse" : "Actif"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.age}</td>
                  <td className="px-4 py-3 text-slate-700">{item.owner}</td>
                  <td className="px-4 py-3">
                    <Link className="text-blue-600 hover:underline" to={item.to}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Aucune urgence pour ce filtre.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">Pilotage OPS</h2>
          {!selectedItem ? (
            <p className="mt-3 text-sm text-slate-500">Selectionne un dossier pour piloter son workflow operateur.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">{selectedItem.title}</div>
                <div className="text-xs text-slate-500">{selectedItem.subtitle}</div>
                <div className="mt-2 text-xs text-slate-500">{selectedItem.kind} | {selectedItem.status}</div>
              </div>

              <ApiErrorAlert message={saveError} />

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Statut operateur</span>
                <select
                  value={form.operator_status}
                  onChange={(e) => setForm((current) => ({ ...current, operator_status: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="needs_follow_up">Needs follow-up</option>
                  <option value="blocked">Blocked</option>
                  <option value="watching">Watching</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Owner</span>
                <div className="flex gap-2">
                  <input
                    value={ownerQuery}
                    onChange={(e) => {
                      setOwnerQuery(e.target.value);
                      setForm((current) => ({ ...current, owner_user_id: "" }));
                    }}
                    placeholder="Rechercher un admin/agent..."
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAssignToMe}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    A moi
                  </button>
                </div>
                {ownerOptions.length ? (
                  <div className="rounded-lg border border-slate-200">
                    {ownerOptions.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => handleOwnerPick(user)}
                        className="flex w-full items-start justify-between border-t px-3 py-2 text-left text-sm first:border-t-0 hover:bg-slate-50"
                      >
                        <span>{user.full_name || user.email || user.user_id}</span>
                        <span className="text-xs text-slate-400">{user.role || "-"}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Follow-up</span>
                <input
                  type="datetime-local"
                  value={form.follow_up_at}
                  onChange={(e) => setForm((current) => ({ ...current, follow_up_at: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>

              {form.operator_status === "blocked" ? (
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Motif blocage</span>
                  <textarea
                    value={form.blocked_reason}
                    onChange={(e) => setForm((current) => ({ ...current, blocked_reason: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              ) : null}

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Notes operateur</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveWorkflow}
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer le workflow"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
