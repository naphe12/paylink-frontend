import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, MessageSquare, PlusCircle } from "lucide-react";

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

const SLA_LABELS = {
  on_time: "SLA OK",
  due_soon: "SLA proche",
  overdue: "SLA depassee",
  none: "Sans SLA",
};

const SLA_STYLES = {
  on_time: "bg-emerald-100 text-emerald-800 border-emerald-200",
  due_soon: "bg-amber-100 text-amber-800 border-amber-200",
  overdue: "bg-rose-100 text-rose-800 border-rose-200",
  none: "bg-slate-100 text-slate-700 border-slate-200",
};

const CATEGORY_OPTIONS = [
  { value: "payment_request", label: "Demande de paiement" },
  { value: "wallet", label: "Wallet" },
  { value: "p2p", label: "P2P" },
  { value: "escrow", label: "Escrow" },
  { value: "cash_in", label: "Depot cash" },
  { value: "cash_out", label: "Retrait cash" },
  { value: "kyc", label: "KYC" },
  { value: "fraud", label: "Fraude" },
  { value: "other", label: "Autre" },
];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function isExternalLink(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function formatSlaRemaining(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  if (seconds < 0) return "depassee";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

export default function SupportCasesPage() {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [form, setForm] = useState({
    category: "payment_request",
    subject: "",
    description: "",
    entity_type: "",
    entity_id: "",
  });
  const [reply, setReply] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({
    file_name: "",
    storage_key: "",
    file_mime_type: "",
  });

  const fetchCases = async (preserveSelection = true) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listSupportCases(statusFilter ? { status: statusFilter } : {});
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
        const detail = await api.getSupportCaseDetail(selectedId);
        setSelectedDetail(detail);
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
      open: cases.filter((item) => ["open", "in_review", "waiting_user"].includes(item.status)).length,
      resolved: cases.filter((item) => item.status === "resolved").length,
      closed: cases.filter((item) => item.status === "closed").length,
    }),
    [cases]
  );

  const createCase = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Sujet et description obligatoires.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.createSupportCase({
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        entity_type: form.entity_type.trim() || undefined,
        entity_id: form.entity_id.trim() || undefined,
      });
      setForm({
        category: "payment_request",
        subject: "",
        description: "",
        entity_type: "",
        entity_id: "",
      });
      await fetchCases(false);
    } catch (err) {
      setError(err?.message || "Impossible de creer le dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selectedCase?.case_id || !reply.trim()) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.addSupportCaseMessage(selectedCase.case_id, { body: reply.trim() });
      setSelectedDetail(detail);
      setReply("");
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible d'envoyer le message.");
    } finally {
      setSubmitting(false);
    }
  };

  const addAttachment = async () => {
    if (!selectedCase?.case_id || !attachmentForm.file_name.trim() || !attachmentForm.storage_key.trim()) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.addSupportCaseAttachment(selectedCase.case_id, {
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

  const updateCaseStatus = async (action) => {
    if (!selectedCase?.case_id) return;
    setSubmitting(true);
    setDetailError("");
    try {
      const detail = await api.updateSupportCaseStatus(selectedCase.case_id, { action });
      setSelectedDetail(detail);
      await fetchCases();
    } catch (err) {
      setDetailError(err?.message || "Impossible de mettre a jour le statut du dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-[#0b3b64]">
            <LifeBuoy /> Reclamations & support
          </h2>
          <p className="text-sm text-slate-500">Ouvrez un dossier, suivez les reponses et gardez une trace claire des incidents.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchCases()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Rafraichir
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Actifs</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Resolus</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.resolved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fermes</p>
          <p className="mt-2 text-2xl font-bold text-slate-700">{stats.closed}</p>
        </div>
      </div>

      <ApiErrorAlert message={error} onRetry={() => fetchCases(false)} retryLabel="Recharger les dossiers" />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <PlusCircle className="text-[#0b3b64]" size={18} />
          <h3 className="text-lg font-semibold text-slate-900">Nouveau dossier</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Sujet"
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Type d'entite (optionnel)"
            value={form.entity_type}
            onChange={(e) => setForm((prev) => ({ ...prev, entity_type: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Reference entite (optionnel)"
            value={form.entity_id}
            onChange={(e) => setForm((prev) => ({ ...prev, entity_id: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="md:col-span-2 xl:col-span-4">
            <textarea
              rows={4}
              placeholder="Expliquez le probleme, le contexte et ce que vous attendez."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={createCase}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3b64] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3357] disabled:opacity-60"
          >
            <PlusCircle size={16} /> {submitting ? "Creation..." : "Ouvrir le dossier"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Mes dossiers</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="open">Ouverts</option>
              <option value="in_review">En revue</option>
              <option value="waiting_user">En attente client</option>
              <option value="resolved">Resolus</option>
              <option value="closed">Fermes</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Chargement des dossiers...</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun dossier pour le moment.</p>
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
                      <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                      <p className="text-xs text-slate-500">
                        {item.category} | {SLA_LABELS[item.sla_status] || SLA_LABELS.none}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.open}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Detail dossier</h3>
              <p className="text-sm text-slate-500">Conversations et historique de traitement.</p>
            </div>
            {selectedCase && (
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLES[selectedCase.status] || STATUS_STYLES.open}`}>
                {STATUS_LABELS[selectedCase.status] || selectedCase.status}
              </span>
            )}
          </div>

          <ApiErrorAlert
            message={detailError}
            onRetry={() => selectedId && api.getSupportCaseDetail(selectedId).then(setSelectedDetail)}
            retryLabel="Recharger le detail"
          />

          {!selectedCase ? (
            <p className="text-sm text-slate-500">Selectionnez un dossier pour afficher le detail.</p>
          ) : detailLoading ? (
            <p className="text-sm text-slate-500">Chargement du detail...</p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{selectedCase.subject}</p>
                    <p className="text-sm text-slate-500">
                      {selectedCase.category} {selectedCase.entity_id ? `• Ref ${selectedCase.entity_id}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateTime(selectedCase.created_at)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                      SLA_STYLES[selectedCase.sla_status] || SLA_STYLES.none
                    }`}
                  >
                    {SLA_LABELS[selectedCase.sla_status] || SLA_LABELS.none}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                    Restant: {formatSlaRemaining(Number(selectedCase.sla_remaining_seconds))}
                  </span>
                  {selectedCase.status !== "closed" ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => updateCaseStatus("close")}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Clore le dossier
                    </button>
                  ) : null}
                  {["resolved", "closed"].includes(String(selectedCase.status || "").toLowerCase()) ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => updateCaseStatus("reopen")}
                      className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                    >
                      Rouvrir
                    </button>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-slate-700">{selectedCase.description}</p>
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
                    <p className="text-sm text-slate-500">Aucune preuve jointe pour le moment.</p>
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
                        <p className="text-sm font-semibold text-slate-900">{message.author_role === "admin" ? "Support" : "Vous"}</p>
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
                      <MessageSquare size={16} /> Repondre
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Ajouter une information ou repondre au support"
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
                        <MessageSquare size={16} /> Envoyer
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <PlusCircle size={16} /> Ajouter une preuve
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
                        <PlusCircle size={16} /> Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
