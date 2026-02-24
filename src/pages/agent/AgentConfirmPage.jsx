import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

function resolveAgentId(explicitAgentId) {
  if (explicitAgentId) return explicitAgentId;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return user?.agent_id || user?.agentId || "";
  } catch {
    return "";
  }
}

export default function AgentConfirmPage({ agentId }) {
  const { assignmentId } = useParams();
  const effectiveAgentId = useMemo(() => resolveAgentId(agentId), [agentId]);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!effectiveAgentId) {
      setMsg("agent_id introuvable. Reconnectez-vous.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await api.confirmAgentAssignment(assignmentId, {
        agent_id: effectiveAgentId,
        lumicash_ref: ref || null,
        note: note || null,
      });
      setMsg("Confirme. Merci !");
    } catch (e) {
      setMsg(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Confirmer payout</h2>
      <p className="text-sm text-slate-500">Assignment: {assignmentId}</p>

      <div>
        <label className="block text-sm font-medium text-slate-700">Reference Lumicash (optionnel)</label>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Note</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <button
        onClick={confirm}
        disabled={saving}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {saving ? "Envoi..." : "Marquer comme paye"}
      </button>

      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
