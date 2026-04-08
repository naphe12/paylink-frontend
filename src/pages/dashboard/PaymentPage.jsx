import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Clock3, PlusCircle, Send, XCircle } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const FILTERS = [
  { id: "received", label: "Recues" },
  { id: "sent", label: "Envoyees" },
  { id: "all", label: "Toutes" },
];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-rose-100 text-rose-800 border-rose-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  expired: "bg-orange-100 text-orange-800 border-orange-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payee",
  declined: "Refusee",
  cancelled: "Annulee",
  expired: "Expiree",
  draft: "Brouillon",
};

const EVENT_LABELS = {
  created: "Creation",
  sent: "Envoi",
  viewed: "Consultation",
  reminder_sent: "Relance",
  autopay_updated: "Auto-pay",
  paid: "Paiement",
  declined: "Refus",
  cancelled: "Annulation",
  expired: "Expiration",
};

function formatMoney(amount, currencyCode) {
  const numeric = Number(amount || 0);
  return `${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode || ""}`.trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildPaymentRequestShareUrl(shareToken) {
  if (!shareToken) return "";
  if (typeof window === "undefined") return `/pay/request/${shareToken}`;
  return `${window.location.origin}/pay/request/${shareToken}`;
}

function inferRequestScope(item, activeFilter) {
  if (activeFilter === "received") return item.role === "payer";
  if (activeFilter === "sent") return item.role === "requester";
  return true;
}

function sortRequests(items = []) {
  return [...items].sort((a, b) => {
    const left = new Date(a.created_at || 0).getTime();
    const right = new Date(b.created_at || 0).getTime();
    return right - left;
  });
}

export default function PaymentPage() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [activeFilter, setActiveFilter] = useState("received");
  const [autoPayMaxAmount, setAutoPayMaxAmount] = useState("");
  const [form, setForm] = useState({
    payer_identifier: "",
    amount: "",
    currency_code: "EUR",
    title: "",
    note: "",
    due_at: "",
    expires_at: "",
    recurrence_frequency: "none",
    recurrence_count: "",
    recurrence_end_at: "",
  });

  const fetchRequests = async (preserveSelection = true) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listPaymentRequests();
      const normalized = sortRequests(Array.isArray(data) ? data : []);
      setRequests(normalized);
      if (!preserveSelection || !normalized.some((item) => item.request_id === selectedId)) {
        setSelectedId(normalized[0]?.request_id || "");
      }
    } catch (err) {
      setRequests([]);
      setError(err?.message || "Impossible de charger les demandes de paiement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(false);
  }, []);

  const filteredRequests = useMemo(
    () => requests.filter((item) => inferRequestScope(item, activeFilter)),
    [requests, activeFilter]
  );

  useEffect(() => {
    if (!filteredRequests.some((item) => item.request_id === selectedId)) {
      setSelectedId(filteredRequests[0]?.request_id || "");
    }
  }, [filteredRequests, selectedId]);

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
        const detail = await api.getPaymentRequestDetail(selectedId);
        setSelectedDetail(detail);
      } catch (err) {
        setSelectedDetail(null);
        setDetailError(err?.message || "Impossible de charger le detail de la demande.");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedId]);

  const selectedRequest =
    selectedDetail?.request || filteredRequests.find((item) => item.request_id === selectedId) || null;

  useEffect(() => {
    if (!selectedRequest) {
      setAutoPayMaxAmount("");
      return;
    }
    const existing = selectedRequest.auto_pay_max_amount;
    if (existing !== null && existing !== undefined && existing !== "") {
      setAutoPayMaxAmount(String(existing));
      return;
    }
    if (selectedRequest.amount !== null && selectedRequest.amount !== undefined) {
      setAutoPayMaxAmount(String(selectedRequest.amount));
      return;
    }
    setAutoPayMaxAmount("");
  }, [selectedRequest?.request_id, selectedRequest?.auto_pay_max_amount, selectedRequest?.amount]);

  const createRequest = async () => {
    if (!form.amount.trim()) {
      setError("Le montant est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMaintenanceMessage("");
    try {
      const payload = {
        payer_identifier: form.payer_identifier.trim() || undefined,
        amount: Number(form.amount),
        currency_code: form.currency_code.trim().toUpperCase(),
        title: form.title.trim() || undefined,
        note: form.note.trim() || undefined,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
        recurrence_frequency: form.recurrence_frequency || "none",
        recurrence_count: form.recurrence_count ? Number(form.recurrence_count) : undefined,
        recurrence_end_at: form.recurrence_end_at ? new Date(form.recurrence_end_at).toISOString() : undefined,
      };
      await api.createPaymentRequest(payload);
      setForm({
        payer_identifier: "",
        amount: "",
        currency_code: form.currency_code || "EUR",
        title: "",
        note: "",
        due_at: "",
        expires_at: "",
        recurrence_frequency: "none",
        recurrence_count: "",
        recurrence_end_at: "",
      });
      await fetchRequests(false);
      setActiveFilter("sent");
    } catch (err) {
      setError(err?.message || "Impossible de creer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action) => {
    if (!selectedRequest?.request_id) return;
    setSubmitting(true);
    setDetailError("");
    setMaintenanceMessage("");
    try {
      if (action === "pay") {
        await api.payPaymentRequest(selectedRequest.request_id, {});
      } else if (action === "decline") {
        await api.declinePaymentRequest(selectedRequest.request_id, {});
      } else if (action === "cancel") {
        await api.cancelPaymentRequest(selectedRequest.request_id, {});
      } else if (action === "remind") {
        await api.remindPaymentRequest(selectedRequest.request_id, {});
      }
      await fetchRequests();
      const detail = await api.getPaymentRequestDetail(selectedRequest.request_id).catch(() => null);
      setSelectedDetail(detail);
    } catch (err) {
      setDetailError(err?.message || "Action impossible sur cette demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateAutoPay = async (enabled) => {
    if (!selectedRequest?.request_id) return;
    setSubmitting(true);
    setDetailError("");
    setMaintenanceMessage("");
    try {
      let payload = { enabled };
      if (enabled) {
        const parsedMaxAmount = Number(autoPayMaxAmount);
        if (!Number.isFinite(parsedMaxAmount) || parsedMaxAmount <= 0) {
          throw new Error("Le plafond auto-pay doit etre superieur a 0.");
        }
        payload = { enabled: true, max_amount: parsedMaxAmount };
      }
      await api.updatePaymentRequestAutoPay(selectedRequest.request_id, payload);
      await fetchRequests();
      const detail = await api.getPaymentRequestDetail(selectedRequest.request_id).catch(() => null);
      setSelectedDetail(detail);
      setMaintenanceMessage(enabled ? "Auto-pay activee." : "Auto-pay desactivee.");
    } catch (err) {
      setDetailError(err?.message || "Configuration auto-pay impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const runDueMaintenance = async () => {
    setSubmitting(true);
    setError("");
    setDetailError("");
    setMaintenanceMessage("");
    try {
      const result = await api.runDuePaymentRequests();
      await fetchRequests();
      if (selectedId) {
        const detail = await api.getPaymentRequestDetail(selectedId).catch(() => null);
        setSelectedDetail(detail);
      }
      const reminded = Number(result?.reminded_count || 0);
      const expired = Number(result?.expired_count || 0);
      const autoPaid = Number(result?.auto_paid_count || 0);
      setMaintenanceMessage(
        `Echeances traitees: ${autoPaid} auto-paiement(s), ${reminded} relance(s) automatique(s), ${expired} expiration(s).`
      );
    } catch (err) {
      setError(err?.message || "Impossible de traiter les echeances dues.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyShareLink = async () => {
    const shareUrl = buildPaymentRequestShareUrl(selectedRequest?.share_token);
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMaintenanceMessage("Lien de demande copie.");
    } catch (_err) {
      setDetailError("Copie du lien impossible.");
    }
  };

  const canPay = selectedRequest?.role === "payer" && selectedRequest?.status === "pending";
  const canDecline = selectedRequest?.role === "payer" && selectedRequest?.status === "pending";
  const canCancel = selectedRequest?.role === "requester" && selectedRequest?.status === "pending";
  const canRemind =
    selectedRequest?.role === "requester" &&
    selectedRequest?.status === "pending" &&
    selectedRequest?.can_send_manual_reminder !== false;
  const canManageAutoPay = selectedRequest?.role === "payer" && selectedRequest?.status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-[#0b3b64]">
            <Send /> Demandes de paiement
          </h2>
          <p className="text-sm text-slate-500">
            Creez, suivez, relancez et reglez vos demandes depuis un seul ecran.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={runDueMaintenance}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            Traiter les echeances dues
          </button>
          <button
            type="button"
            onClick={() => fetchRequests()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Rafraichir
          </button>
        </div>
      </div>

      {maintenanceMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {maintenanceMessage}
        </div>
      )}

      <ApiErrorAlert
        message={error}
        onRetry={() => fetchRequests(false)}
        retryLabel="Recharger les demandes"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <PlusCircle className="text-[#0b3b64]" size={18} />
          <h3 className="text-lg font-semibold text-slate-900">Nouvelle demande</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Email, username, paytag ou numero"
            value={form.payer_identifier}
            onChange={(e) => setForm((prev) => ({ ...prev, payer_identifier: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Montant"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Devise"
            value={form.currency_code}
            onChange={(e) => setForm((prev) => ({ ...prev, currency_code: e.target.value.toUpperCase() }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
          />
          <input
            type="text"
            placeholder="Titre"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={form.due_at}
            onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.recurrence_frequency}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence_frequency: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            aria-label="Frequence recurrence"
          >
            <option value="none">Sans recurrence</option>
            <option value="daily">Quotidienne</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuelle</option>
          </select>
          <input
            type="number"
            min="1"
            max="365"
            placeholder="Nombre d'occurrences"
            value={form.recurrence_count}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence_count: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={form.recurrence_end_at}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence_end_at: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="md:col-span-2">
            <textarea
              rows={3}
              placeholder="Note optionnelle"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={createRequest}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3b64] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3357] disabled:opacity-60"
          >
            <PlusCircle size={16} /> {submitting ? "Envoi..." : "Creer la demande"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Mes demandes</h3>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === filter.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Chargement des demandes...</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune demande dans cette vue.</p>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((item) => (
                <button
                  key={item.request_id}
                  type="button"
                  onClick={() => setSelectedId(item.request_id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedId === item.request_id
                      ? "border-[#0b3b64] bg-sky-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title || "Demande de paiement"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.role === "payer" ? "Demande recue de" : "Demande envoyee a"}{" "}
                        {item.counterpart_label || "utilisateur"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {item.is_due && item.status === "pending" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                          Echeance due
                        </span>
                      ) : null}
                      {item.recurrence_frequency && item.recurrence_frequency !== "none" ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                          Recurrence {item.recurrence_frequency}
                        </span>
                      ) : null}
                      {item.auto_pay_enabled ? (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">
                          Auto-pay
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-medium ${
                          STATUS_STYLES[item.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#0b3b64]">
                        {formatMoney(item.amount, item.currency_code)}
                      </p>
                      <p className="text-xs text-slate-500">Creee le {formatDateTime(item.created_at)}</p>
                    </div>
                    {item.expires_at && (
                      <p className="text-xs text-slate-500">Expire le {formatDateTime(item.expires_at)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Detail</h3>
              <p className="text-sm text-slate-500">
                Timeline, dates, lien partageable et actions disponibles.
              </p>
            </div>
            {selectedRequest?.share_token && (
              <div className="flex items-center gap-2">
                <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {selectedRequest.share_token}
                </code>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Copier le lien
                </button>
              </div>
            )}
          </div>

          <ApiErrorAlert
            message={detailError}
            onRetry={() => selectedId && api.getPaymentRequestDetail(selectedId).then(setSelectedDetail)}
            retryLabel="Recharger le detail"
            className="mb-4"
          />

          {!selectedRequest ? (
            <p className="text-sm text-slate-500">Selectionnez une demande pour voir son detail.</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedRequest.title || "Demande de paiement"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedRequest.role === "payer" ? "Recue de" : "Envoyee a"}{" "}
                      {selectedRequest.counterpart_label || "utilisateur"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRequest.is_due && selectedRequest.status === "pending" ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                        Echeance due
                      </span>
                    ) : null}
                    {selectedRequest.recurrence_frequency && selectedRequest.recurrence_frequency !== "none" ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                        Recurrence {selectedRequest.recurrence_frequency}
                      </span>
                    ) : null}
                    {selectedRequest.auto_pay_enabled ? (
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">
                        Auto-pay
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                    </span>
                  </div>
                </div>

                <p className="text-2xl font-bold text-[#0b3b64]">
                  {formatMoney(selectedRequest.amount, selectedRequest.currency_code)}
                </p>
                {selectedRequest.note && (
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    {selectedRequest.note}
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <CalendarClock size={14} /> Echeance
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedRequest.due_at)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <Clock3 size={14} /> Expiration
                    </p>
                    <p className="text-sm text-slate-800">{formatDateTime(selectedRequest.expires_at)}</p>
                  </div>
                </div>
                {selectedRequest.is_due && selectedRequest.status === "pending" ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Cette demande a atteint son echeance. Un traitement batch peut envoyer une relance automatique
                    ou constater son expiration.
                  </div>
                ) : null}
                {selectedRequest.role === "requester" && selectedRequest.status === "pending" ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Relances manuelles</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Nombre envoye: {Number(selectedRequest.manual_reminder_count || 0).toLocaleString("fr-FR")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Prochaine relance autorisee: {formatDateTime(selectedRequest.next_manual_reminder_at)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canPay || submitting}
                  onClick={() => runAction("pay")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Payer
                </button>
                <button
                  type="button"
                  disabled={!canDecline || submitting}
                  onClick={() => runAction("decline")}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <XCircle size={16} /> Refuser
                </button>
                <button
                  type="button"
                  disabled={!canCancel || submitting}
                  onClick={() => runAction("cancel")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!canRemind || submitting}
                  onClick={() => runAction("remind")}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <BellRing size={16} /> Relancer
                </button>
              </div>
              {selectedRequest?.role === "requester" &&
              selectedRequest?.status === "pending" &&
              selectedRequest?.can_send_manual_reminder === false ? (
                <p className="text-xs text-amber-700">
                  Relance manuelle temporairement indisponible (cooldown actif).
                </p>
              ) : null}

              {canManageAutoPay ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-sm font-semibold text-indigo-900">Auto-pay</p>
                  <p className="mt-1 text-xs text-indigo-800">
                    Active ou desactive le paiement automatique avec plafond de securite.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Plafond auto-pay detail"
                      value={autoPayMaxAmount}
                      onChange={(e) => setAutoPayMaxAmount(e.target.value)}
                      className="w-44 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => updateAutoPay(true)}
                      className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
                    >
                      Activer / mettre a jour
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => updateAutoPay(false)}
                      className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      Desactiver
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Timeline
                </h4>
                {detailLoading ? (
                  <p className="text-sm text-slate-500">Chargement du detail...</p>
                ) : (selectedDetail?.events || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun evenement disponible.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDetail.events.map((event) => (
                      <div
                        key={event.event_id}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                        </div>
                        {(event.before_status || event.after_status) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {event.before_status || "-"} → {event.after_status || "-"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
