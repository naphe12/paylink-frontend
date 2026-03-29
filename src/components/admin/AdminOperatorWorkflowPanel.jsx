import { useEffect, useState } from "react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";
import { getCurrentUser } from "@/services/authStore";

function toLocalDatetimeValue(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const offset = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminOperatorWorkflowPanel({
  title = "Workflow operateur",
  entityType,
  entityId,
  workflow = null,
  fallbackStatus = "needs_follow_up",
  fallbackOwnerLabel = "",
  emptyMessage = "Selectionne un dossier pour piloter son workflow operateur.",
  onSaved,
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [form, setForm] = useState({
    operator_status: fallbackStatus,
    blocked_reason: "",
    notes: "",
    follow_up_at: "",
    owner_user_id: "",
  });

  useEffect(() => {
    setForm({
      operator_status: workflow?.operator_status || fallbackStatus || "needs_follow_up",
      blocked_reason: workflow?.blocked_reason || "",
      notes: workflow?.notes || "",
      follow_up_at: toLocalDatetimeValue(workflow?.follow_up_at),
      owner_user_id: workflow?.owner_user_id || "",
    });
    setOwnerQuery(workflow?.owner_name || fallbackOwnerLabel || "");
    setOwnerOptions([]);
    setSaveError("");
  }, [workflow, fallbackStatus, fallbackOwnerLabel, entityId]);

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

  const handleSave = async () => {
    if (!entityType || !entityId) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await api.updateAdminOperatorWorkItem(entityType, entityId, {
        operator_status: form.operator_status,
        blocked_reason: form.operator_status === "blocked" ? form.blocked_reason || null : null,
        notes: form.notes || null,
        follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
        owner_user_id: form.owner_user_id || null,
      });
      if (typeof onSaved === "function") {
        await onSaved(result);
      }
    } catch (err) {
      setSaveError(err?.message || "Impossible d'enregistrer le workflow operateur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {!entityId ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <>
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
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer le workflow"}
          </button>
        </>
      )}
    </div>
  );
}
