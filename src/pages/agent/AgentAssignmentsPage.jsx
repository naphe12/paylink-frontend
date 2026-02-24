import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export default function AgentAssignmentsPage({ agentId }) {
  const effectiveAgentId = useMemo(() => resolveAgentId(agentId), [agentId]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!effectiveAgentId) {
        setError("agent_id introuvable. Reconnectez-vous ou transmettez l'identifiant agent.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await api.getAgentAssignments(effectiveAgentId);
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        setError(e?.message || "Erreur chargement assignments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveAgentId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Payouts a traiter</h2>
        <p className="text-sm text-slate-500">Assignments recents pour cet agent.</p>
      </div>

      {loading && <div className="text-slate-500">Chargement...</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {!loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((x) => (
              <li key={x.id} className="px-4 py-3 text-sm flex flex-wrap items-center gap-2">
                <b className="text-slate-900">{x.amount_bif} BIF</b>
                <span className="text-slate-500">- {x.status}</span>
                <span className="text-slate-500">- Order {x.order_id}</span>
                <Link
                  to={`/dashboard/agent/assignments/${x.id}`}
                  className="ml-auto inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Ouvrir
                </Link>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-4 py-6 text-sm text-slate-500">Aucun assignment.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
