import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [webhookRows, setWebhookRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("all");
  const [webhookProviderFilter, setWebhookProviderFilter] = useState("all");
  const [webhookProviders, setWebhookProviders] = useState([]);
  const [webhookStats, setWebhookStats] = useState({
    total: 0,
    success: 0,
    duplicate: 0,
    failed: 0,
    by_provider: [],
  });
  const [retryingWebhookId, setRetryingWebhookId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const auditQuery = new URLSearchParams({ limit: String(limit) });
      if (roleFilter !== "all") auditQuery.append("actor_role", roleFilter);
      if (entityFilter !== "all") auditQuery.append("entity_type", entityFilter);
      if (actionFilter !== "all") auditQuery.append("action", actionFilter);
      if (query.trim()) auditQuery.append("query", query.trim());

      const webhookQuery = new URLSearchParams({ limit: "100", event_type: "P2P_CHAIN_DEPOSIT" });
      if (webhookStatusFilter !== "all") webhookQuery.append("status", webhookStatusFilter);
      if (webhookProviderFilter !== "all") webhookQuery.append("provider", webhookProviderFilter);
      if (query.trim()) webhookQuery.append("query", query.trim());

      const [auditData, webhookData, webhookProvidersData, webhookStatsData] = await Promise.all([
        api.get(`/backoffice/audit?${auditQuery.toString()}`),
        api.get(`/backoffice/webhooks?${webhookQuery.toString()}`),
        api.get("/backoffice/webhooks/providers?event_type=P2P_CHAIN_DEPOSIT"),
        api.get("/backoffice/webhooks/stats?event_type=P2P_CHAIN_DEPOSIT"),
      ]);
      setRows(Array.isArray(auditData) ? auditData : []);
      setWebhookRows(Array.isArray(webhookData) ? webhookData : []);
      setWebhookProviders(Array.isArray(webhookProvidersData) ? webhookProvidersData : []);
      setWebhookStats({
        total: Number(webhookStatsData?.total || 0),
        success: Number(webhookStatsData?.success || 0),
        duplicate: Number(webhookStatsData?.duplicate || 0),
        failed: Number(webhookStatsData?.failed || 0),
        by_provider: Array.isArray(webhookStatsData?.by_provider) ? webhookStatsData.by_provider : [],
      });
      setError(null);
    } catch (err) {
      setWebhookProviders([]);
      setWebhookStats({
        total: 0,
        success: 0,
        duplicate: 0,
        failed: 0,
        by_provider: [],
      });
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit, roleFilter, entityFilter, actionFilter, webhookStatusFilter, webhookProviderFilter]);

  const roles = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.actor_role || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const entities = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.entity_type || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const actions = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.action || "-")));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      const hay = [r.id, r.action, r.actor_user_id, r.actor_role, r.entity_type, r.entity_id]
        .map((v) => String(v || ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

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

  const retryWebhook = async (logId) => {
    setRetryingWebhookId(logId);
    try {
      await api.post(`/backoffice/webhooks/${logId}/retry`, {});
      await load();
    } catch (err) {
      setError(err.message || "Impossible de relancer le webhook");
    } finally {
      setRetryingWebhookId(null);
    }
  };

  const badgeClass = (role) => {
    const r = String(role || "").toLowerCase();
    if (r === "admin") return "bg-emerald-100 text-emerald-800";
    if (r === "operator") return "bg-sky-100 text-sky-800";
    return "bg-slate-100 text-slate-700";
  };

  const webhookStatusClass = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "SUCCESS") return "bg-emerald-100 text-emerald-800";
    if (normalized === "DUPLICATE") return "bg-amber-100 text-amber-800";
    if (normalized === "FAILED") return "bg-rose-100 text-rose-800";
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">Toutes les actions</option>
            <option value="P2P_CHAIN_DEPOSIT_MANUAL_ASSIGN">Assignations P2P</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActionFilter("P2P_CHAIN_DEPOSIT_MANUAL_ASSIGN")}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Focus assignations P2P
          </button>
          <button
            type="button"
            onClick={() => {
              setActionFilter("all");
              setEntityFilter("P2P_CHAIN_DEPOSIT");
              setQuery("");
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Focus entite depot P2P
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Appliquer
          </button>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Webhooks P2P Chain Deposit</h2>
            <p className="text-sm text-slate-500 mt-1">
              Callbacks provider/custody recus sur `P2P_CHAIN_DEPOSIT`.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={webhookProviderFilter}
              onChange={(e) => setWebhookProviderFilter(e.target.value)}
            >
              <option value="all">Tous les providers</option>
              {webhookProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={webhookStatusFilter}
              onChange={(e) => setWebhookStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="DUPLICATE">DUPLICATE</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50 p-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">Total</div>
              <div className="text-lg font-semibold text-slate-900">{webhookStats.total}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-700">Success</div>
              <div className="text-lg font-semibold text-emerald-900">{webhookStats.success}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] text-amber-700">Duplicate</div>
              <div className="text-lg font-semibold text-amber-900">{webhookStats.duplicate}</div>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <div className="text-[11px] text-rose-700">Failed</div>
              <div className="text-lg font-semibold text-rose-900">{webhookStats.failed}</div>
            </div>
          </div>
          {Array.isArray(webhookStats.by_provider) && webhookStats.by_provider.length > 0 ? (
            <div className="bg-white px-3 py-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Repartition par provider
              </div>
              <div className="flex flex-wrap gap-2">
                {webhookStats.by_provider.map((item) => (
                  <button
                    key={item.provider}
                    type="button"
                    onClick={() => setWebhookProviderFilter(item.provider)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${
                      webhookProviderFilter === item.provider
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-mono font-medium">{item.provider}</div>
                    <div>T {item.total} | S {item.success} | D {item.duplicate} | F {item.failed}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[280px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Provider</th>
                  <th className="text-left px-3 py-2 font-medium">Tx</th>
                  <th className="text-left px-3 py-2 font-medium">Ref</th>
                  <th className="text-left px-3 py-2 font-medium">Event ID</th>
                  <th className="text-left px-3 py-2 font-medium">Adresse</th>
                  <th className="text-left px-3 py-2 font-medium">Erreur</th>
                  <th className="text-left px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {webhookRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${webhookStatusClass(row.status)}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.payload?.provider || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.tx_hash || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.payload?.escrow_deposit_ref || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.payload?.provider_event_id || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.payload?.to_address || "-"}</td>
                    <td className="px-3 py-2 text-xs text-rose-700">{row.error || "-"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={retryingWebhookId === row.id}
                        onClick={() => retryWebhook(row.id)}
                        className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-60"
                      >
                        {retryingWebhookId === row.id ? "Retry..." : "Retry"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && webhookRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Aucun webhook P2P pour ce filtre.
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
