import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, MessageSquare, RefreshCcw } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const STATUS_LABELS = {
  open: "Ouvert",
  in_review: "En revue",
  waiting_user: "En attente client",
  resolved: "Resolue",
  closed: "Fermee",
};

const STATUS_STYLES = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  in_review: "bg-sky-100 text-sky-800 border-sky-200",
  waiting_user: "bg-violet-100 text-violet-800 border-violet-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function isExternalLink(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

export default function AdminSupportCasesPage() {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reply, setReply] = useState("");
  const [statusAction, setStatusAction] = useState("in_review");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({
    file_name: "",
    storage_key: "",
    file_mime_type: "",
  });

  const fetchCases = async (preserveSelection = true) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminSupportCases({
        status: statusFilter || undefined,
        q: query.trim() || undefined,
      });
      const items = Array.isArray(data) ? data : [];
      setCases(items);
      if (!preserveSelection || !items.some((item) => item.case_id === selectedId)) {
        setSelectedId(items[0]?.case_id || "");
      }
    } catch (err) {
      setCases([]);
      setError(err?.message || "Impossible de charger les dossiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(false);
  }, [statusFilter]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) {
        setSelectedDetail(null);
        setDetailError("");
        return;
      }
      setDetailLoading(true);
      setDetailError("");
      try {
        const detail = await api.getAdminSupportCaseDetail(selectedId);
        setSelectedDetail(detail);
        setStatusAction(detail?.case?.status || "in_review");
        setAssignedUserId(detail?.case?.assigned_to_user_id || "");
      } catch (err) {
        setSelectedDetail(null);
        setDetailError(err?.message || "Impossible de charger le detail du dossier.");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedId]);

  const selectedCase = selectedDetail?.case || cases.find((item) => item.case_id === selectedId) || null;

  const stats = useMemo(
    () => ({
      open: cases.filter((item) => item.status === "open").length,
      waiting: cases.filter((item) => item.status === "waiting_user").length,
      resolved: cases.filter((item) => item.status === "resolved").length,
    }),
    [cases]
  );

  const runStatusAction = async () => {
    if (!selectedCase?.case_id) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.updateAdminSupportCaseStatus(selectedCase.case_id, {
        status: statusAction,
        message: "",
      });
      setSelectedDetail(detail);
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible de changer le statut.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAssignAction = async () => {
    if (!selectedCase?.case_id) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.assignAdminSupportCase(selectedCase.case_id, {
        assigned_to_user_id: assignedUserId.trim() || null,
      });
      setSelectedDetail(detail);
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible d'assigner le dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selectedCase?.case_id || !reply.trim()) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.replyAdminSupportCase(selectedCase.case_id, { body: reply.trim() });
      setSelectedDetail(detail);
      setReply("");
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible d'envoyer la reponse.");
    } finally {
      setSubmitting(false);
    }
  };

  const addAttachment = async () => {
    if (!selectedCase?.case_id || !attachmentForm.file_name.trim() || !attachmentForm.storage_key.trim()) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.addAdminSupportCaseAttachment(selectedCase.case_id, {
        file_name: attachmentForm.file_name.trim(),
        storage_key: attachmentForm.storage_key.trim(),
        file_mime_type: attachmentForm.file_mime_type.trim() || undefined,
      });
      setSelectedDetail(detail);
      setAttachmentForm({ file_name: "", storage_key: "", file_mime_type: "" });
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible d'ajouter la preuve.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Backoffice support et reclamations</p>
          <h1 className="text-2xl font-bold text-slate-900">Support cases</h1>
        </div>
        <button
          onClick={() => fetchCases()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ouverts</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Attente client</p>
          <p className="mt-2 text-2xl font-bold text-violet-700">{stats.waiting}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Resolus</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.resolved}</p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Dossiers support</h3>
              <p className="text-sm text-slate-500">Vue consolidee client, statut, SLA et assignation.</p>
            </div>
          </div>

          <ApiErrorAlert message={error} onRetry={() => fetchCases(false)} retryLabel="Recharger les dossiers" />

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              type="text"
              placeholder="Rechercher sujet ou reference"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="in_review">En revue</option>
              <option value="waiting_user">Attente client</option>
              <option value="resolved">Resolus</option>
              <option value="closed">Fermes</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => fetchCases(false)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Filtrer
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Chargement des dossiers...</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun dossier support.</p>
          ) : (
            <div className="space-y-3">
              {cases.map((item) => (
                <button
                  key={item.case_id}
                  type="button"
                  onClick={() => setSelectedId(item.case_id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedId === item.case_id
                      ? "border-[#0b3b64] bg-sky-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.subject}</p>
                      <p className="text-xs text-slate-500">{item.customer_label || "Client inconnu"} | {item.category}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.open}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-sm text-slate-600">{item.assigned_to_label || "Non assigne"}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Detail support case</h3>
              <p className="text-sm text-slate-500">Conversation, actions backoffice et timeline.</p>
            </div>
            {selectedCase && (
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLES[selectedCase.status] || STATUS_STYLES.open}`}>
                {STATUS_LABELS[selectedCase.status] || selectedCase.status}
              </span>
            )}
          </div>

          <ApiErrorAlert
            message={detailError}
            onRetry={() => selectedId && api.getAdminSupportCaseDetail(selectedId).then(setSelectedDetail)}
            retryLabel="Recharger le detail"
          />

          {!selectedCase ? (
            <p className="text-sm text-slate-500">Selectionnez un dossier.</p>
          ) : detailLoading ? (
            <p className="text-sm text-slate-500">Chargement du detail...</p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{selectedCase.subject}</p>
                    <p className="text-sm text-slate-500">
                      {selectedCase.customer_label || "Client inconnu"} | {selectedCase.category}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateTime(selectedCase.created_at)}</p>
                </div>
                <p className="mt-3 text-sm text-slate-700">{selectedCase.description}</p>
                <p className="mt-2 text-xs text-slate-500">Assigne: {selectedCase.assigned_to_label || "Non assigne"}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  placeholder="UUID admin assigne"
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={runAssignAction}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Assigner
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={statusAction}
                  onChange={(e) => setStatusAction(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="open">Ouvert</option>
                  <option value="in_review">En revue</option>
                  <option value="waiting_user">Attente client</option>
                  <option value="resolved">Resolue</option>
                  <option value="closed">Fermee</option>
                </select>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={runStatusAction}
                  className="rounded-lg bg-[#0b3b64] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3357] disabled:opacity-60"
                >
                  Mettre a jour
                </button>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Preuves</h4>
                <div className="space-y-3">
                  {(selectedDetail?.attachments || []).map((attachment) => (
                    <div key={attachment.attachment_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{attachment.file_name}</p>
                          <p className="text-xs text-slate-500">{attachment.file_mime_type || "Type non renseigne"}</p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDateTime(attachment.created_at)}</p>
                      </div>
                      {isExternalLink(attachment.storage_key) ? (
                        <a
                          href={attachment.storage_key}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm text-sky-700 underline"
                        >
                          Ouvrir la preuve
                        </a>
                      ) : (
                        <p className="mt-2 break-all font-mono text-xs text-slate-500">{attachment.storage_key}</p>
                      )}
                    </div>
                  ))}
                  {(selectedDetail?.attachments || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune preuve jointe.</p>
                  ) : null}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Conversation</h4>
                <div className="space-y-3">
                  {(selectedDetail?.messages || []).map((message) => (
                    <div
                      key={message.message_id}
                      className={`rounded-2xl border p-4 ${
                        message.author_role === "admin" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{message.author_role === "admin" ? "Admin" : "Client"}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(message.created_at)}</p>
                      </div>
                      <p className="text-sm text-slate-700">{message.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCase.status !== "closed" && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MessageSquare size={16} /> Reponse client
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Reponse ou demande de precision"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={submitting || !reply.trim()}
                        onClick={sendReply}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <MessageSquare size={16} /> Repondre
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <LifeBuoy size={16} /> Ajouter une preuve
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nom de la preuve"
                        value={attachmentForm.file_name}
                        onChange={(e) => setAttachmentForm((prev) => ({ ...prev, file_name: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Lien ou reference de stockage"
                        value={attachmentForm.storage_key}
                        onChange={(e) => setAttachmentForm((prev) => ({ ...prev, storage_key: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Type MIME (optionnel)"
                        value={attachmentForm.file_mime_type}
                        onChange={(e) => setAttachmentForm((prev) => ({ ...prev, file_mime_type: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={submitting || !attachmentForm.file_name.trim() || !attachmentForm.storage_key.trim()}
                        onClick={addAttachment}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <LifeBuoy size={16} /> Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h4>
                <div className="space-y-3">
                  {(selectedDetail?.events || []).map((event) => (
                    <div key={event.event_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <LifeBuoy size={14} /> {event.event_type}
                        </div>
                        <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.before_status || "-"} → {event.after_status || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
