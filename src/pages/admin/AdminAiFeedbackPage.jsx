import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function prettyJson(value) {
  if (!value) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function Badge({ children, tone = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[tone] || styles.slate}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, children, action = null }) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoBlock({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono break-all" : ""}`}>{value || "-"}</p>
    </div>
  );
}

export default function AdminAiFeedbackPage() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    status: "reviewed",
    expected_intent: "",
    expected_entities_json: "{}",
    parser_was_correct: "",
    resolver_was_correct: "",
    final_resolution_notes: "",
  });

  const loadLogs = async (nextStatus = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminAiAuditLogs({
        limit: 100,
        status: nextStatus || undefined,
        q: search.trim() || undefined,
        parsed_intent: intentFilter.trim() || undefined,
        annotated:
          scopeFilter === "annotated"
            ? true
            : scopeFilter === "pending_review"
              ? false
              : undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setSelectedId((current) => (current && list.some((item) => item.id === current) ? current : list[0]?.id || ""));
    } catch (err) {
      setError(err?.message || "Impossible de charger les logs IA.");
      setRows([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (auditLogId) => {
    if (!auditLogId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError("");
    try {
      const data = await api.getAdminAiAuditLog(auditLogId);
      setDetail(data);
      const annotation = data?.annotation;
      setForm({
        status: annotation?.status || "reviewed",
        expected_intent: annotation?.expected_intent || "",
        expected_entities_json: prettyJson(annotation?.expected_entities_json || {}),
        parser_was_correct:
          typeof annotation?.parser_was_correct === "boolean" ? String(annotation.parser_was_correct) : "",
        resolver_was_correct:
          typeof annotation?.resolver_was_correct === "boolean" ? String(annotation.resolver_was_correct) : "",
        final_resolution_notes: annotation?.final_resolution_notes || "",
      });
    } catch (err) {
      setError(err?.message || "Impossible de charger le detail du log IA.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      errors: rows.filter((row) => String(row.status || "").toUpperCase() === "ERROR").length,
      done: rows.filter((row) => String(row.status || "").toUpperCase() === "DONE").length,
      pending: rows.filter((row) => String(row.status || "").toUpperCase().includes("INFO")).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();
    const normalizedIntent = String(intentFilter || "").trim().toLowerCase();
    return rows.filter((row) => {
      const parsedIntent = String(row?.parsed_intent?.intent || "").toLowerCase();
      const rawMessage = String(row?.raw_message || "").toLowerCase();
      const errorMessage = String(row?.error_message || "").toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        rawMessage.includes(normalizedSearch) ||
        errorMessage.includes(normalizedSearch) ||
        parsedIntent.includes(normalizedSearch);
      const matchesIntent = !normalizedIntent || parsedIntent.includes(normalizedIntent);
      const hasError = String(row?.status || "").toUpperCase() === "ERROR";
      const matchesScope =
        scopeFilter === "all" ||
        (scopeFilter === "errors" && hasError) ||
        (scopeFilter === "annotated" && detail?.annotation && row.id === detail.audit_log?.id) ||
        (scopeFilter === "pending_review" && !detail?.annotation && !hasError);
      return matchesSearch && matchesIntent && matchesScope;
    });
  }, [rows, search, intentFilter, scopeFilter, detail]);

  const submitAnnotation = async (event) => {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      let expectedEntities = {};
      const raw = String(form.expected_entities_json || "").trim();
      if (raw) {
        expectedEntities = JSON.parse(raw);
      }
      await api.annotateAdminAiAuditLog(selectedId, {
        status: form.status,
        expected_intent: form.expected_intent || null,
        expected_entities_json: expectedEntities,
        parser_was_correct: form.parser_was_correct === "" ? null : form.parser_was_correct === "true",
        resolver_was_correct: form.resolver_was_correct === "" ? null : form.resolver_was_correct === "true",
        final_resolution_notes: form.final_resolution_notes || null,
      });
      await loadDetail(selectedId);
      await loadLogs();
    } catch (err) {
      setError(err?.message || "Impossible d'enregistrer l'annotation.");
    } finally {
      setSaving(false);
    }
  };

  const applySuggestion = async (suggestionId) => {
    setApplyingId(suggestionId);
    setError("");
    try {
      await api.applyAdminAiFeedbackSuggestion(suggestionId);
      await loadDetail(selectedId);
    } catch (err) {
      setError(err?.message || "Impossible d'appliquer la suggestion.");
    } finally {
      setApplyingId("");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assistants IA</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Bot className="text-cyan-600" />
            Feedback Learning
          </h1>
          <p className="text-sm text-slate-500">
            Relis les logs IA, annote les erreurs et applique les suggestions sans passer par Postman.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Recherche message, erreur, intent"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <input
            value={intentFilter}
            onChange={(event) => setIntentFilter(event.target.value)}
            placeholder="Intent ex: transfer.create"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="DONE">DONE</option>
            <option value="NEED_INFO">NEED_INFO</option>
            <option value="ERROR">ERROR</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <select
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="errors">Erreurs</option>
            <option value="pending_review">Hors erreurs</option>
            <option value="annotated">Selection annotee</option>
          </select>
          <button
            type="button"
            onClick={() => loadLogs(statusFilter)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>
      </header>

      <ApiErrorAlert message={error} onRetry={() => loadLogs(statusFilter)} retryLabel="Recharger" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Logs charges" value={stats.total} tone="slate" />
        <StatCard label="DONE" value={stats.done} tone="emerald" />
        <StatCard label="ERROR" value={stats.errors} tone="rose" />
        <StatCard label="NEED_INFO / INFO" value={stats.pending} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SectionCard title="Audit logs">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">Chargement...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">Aucun log IA avec ces filtres.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isSelected = row.id === selectedId;
                    const tone = String(row.status || "").toUpperCase() === "ERROR"
                      ? "rose"
                      : String(row.status || "").toUpperCase() === "DONE"
                        ? "emerald"
                        : "amber";
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className={`cursor-pointer border-t ${isSelected ? "bg-cyan-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-3 py-2 text-slate-600">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={tone}>{row.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="max-w-[340px] truncate">{row.raw_message}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {row?.parsed_intent?.intent || "intent inconnu"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Detail"
            action={detailLoading ? <span className="text-xs text-slate-400">Chargement...</span> : null}
          >
            {detail?.audit_log ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoBlock label="Audit log id" value={detail.audit_log.id} mono />
                  <InfoBlock label="Statut" value={detail.audit_log.status} />
                  <InfoBlock label="User id" value={detail.audit_log.user_id} mono />
                  <InfoBlock label="Session id" value={detail.audit_log.session_id} mono />
                </div>
                <TextBlock label="Message brut" value={detail.audit_log.raw_message} />
                <TextBlock label="Parsed intent" value={prettyJson(detail.audit_log.parsed_intent)} />
                <TextBlock label="Resolved command" value={prettyJson(detail.audit_log.resolved_command)} />
                <TextBlock label="Erreur" value={detail.audit_log.error_message || "-"} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Selectionne un audit log pour voir le detail.
              </div>
            )}
          </SectionCard>

          <SectionCard title="Annotation">
            <form onSubmit={submitAnnotation} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="text-sm text-slate-600">Statut revue</span>
                  <input
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </label>
                <label>
                  <span className="text-sm text-slate-600">Intent attendu</span>
                  <input
                    value={form.expected_intent}
                    onChange={(event) => setForm((prev) => ({ ...prev, expected_intent: event.target.value }))}
                    placeholder="transfer.create"
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </label>
                <label>
                  <span className="text-sm text-slate-600">Parser correct ?</span>
                  <select
                    value={form.parser_was_correct}
                    onChange={(event) => setForm((prev) => ({ ...prev, parser_was_correct: event.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">Inconnu</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm text-slate-600">Resolver correct ?</span>
                  <select
                    value={form.resolver_was_correct}
                    onChange={(event) => setForm((prev) => ({ ...prev, resolver_was_correct: event.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">Inconnu</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-slate-600">Entites attendues JSON</span>
                <textarea
                  rows={6}
                  value={form.expected_entities_json}
                  onChange={(event) => setForm((prev) => ({ ...prev, expected_entities_json: event.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-xs"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600">Note / prompt hint</span>
                <textarea
                  rows={4}
                  value={form.final_resolution_notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, final_resolution_notes: event.target.value }))}
                  placeholder="Expliquer le cas ambigu, le bon intent ou la nuance metier utile."
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={!selectedId || saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer l'annotation"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Suggestions">
            {!detail?.suggestions?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Aucune suggestion pour ce cas.
              </div>
            ) : (
              <div className="space-y-3">
                {detail.suggestions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-cyan-600" />
                          <span className="font-semibold text-slate-900">{item.suggestion_type}</span>
                          <Badge tone={item.applied ? "emerald" : "blue"}>
                            {item.applied ? "appliquee" : "a revoir"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">Cible: {item.target_key}</p>
                        <pre className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
                          {prettyJson(item.proposed_value)}
                        </pre>
                      </div>
                      <button
                        type="button"
                        disabled={item.applied || applyingId === item.id}
                        onClick={() => applySuggestion(item.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={16} />
                        {applyingId === item.id ? "Application..." : item.applied ? "Deja appliquee" : "Appliquer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function TextBlock({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <pre className="mt-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}
