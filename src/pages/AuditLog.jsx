import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/backoffice/audit?limit=${limit}`);
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  const roles = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.actor_role || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const entities = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.entity_type || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && String(r.actor_role || "-") !== roleFilter) return false;
      if (entityFilter !== "all" && String(r.entity_type || "-") !== entityFilter) return false;
      if (!q) return true;
      const hay = [r.id, r.action, r.actor_user_id, r.actor_role, r.entity_type, r.entity_id]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, roleFilter, entityFilter]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const data = await api.get(`/backoffice/audit/${id}`);
      setSelected(data || null);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const badgeClass = (role) => {
    const r = String(role || "").toLowerCase();
    if (r === "admin") return "bg-emerald-100 text-emerald-800";
    if (r === "operator") return "bg-sky-100 text-sky-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
            <p className="text-sm text-slate-500 mt-1">
              Tracabilite des actions admin et operateur.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rechercher action, actor, entity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tous les roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="all">Toutes les entites</option>
            {entities.map((eType) => (
              <option key={eType} value={eType}>
                {eType}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value="50">50 lignes</option>
            <option value="100">100 lignes</option>
            <option value="200">200 lignes</option>
            <option value="500">500 lignes</option>
          </select>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[540px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Action</th>
                  <th className="text-left px-3 py-2 font-medium">Acteur</th>
                  <th className="text-left px-3 py-2 font-medium">Role</th>
                  <th className="text-left px-3 py-2 font-medium">Entite</th>
                  <th className="text-left px-3 py-2 font-medium">ID Log</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openDetail(r.id)}
                    className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex max-w-[320px] truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {r.action || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.actor_user_id || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(r.actor_role)}`}
                      >
                        {r.actor_role || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.entity_type || "-"}:{r.entity_id || "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      Aucune ligne trouvee.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Detail de l'entree</h2>
        {detailLoading ? <p className="text-sm text-slate-500 mt-2">Chargement...</p> : null}
        {!detailLoading && !selected ? (
          <p className="text-sm text-slate-500 mt-2">Clique une ligne pour voir le detail complet.</p>
        ) : null}
        {!detailLoading && selected ? (
          <pre className="mt-3 rounded-lg bg-slate-950 text-slate-100 p-4 overflow-auto text-xs">
            {JSON.stringify(selected, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
