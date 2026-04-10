import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/services/api";

const FREQUENCIES = [
  { value: "daily", label: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
];

const PARTNERS = ["Lumicash", "Ecocash", "eNoti"];

const INITIAL_FORM = {
  transfer_type: "internal",
  receiver_identifier: "",
  recipient_name: "",
  recipient_phone: "",
  recipient_email: "",
  country_destination: "",
  partner_name: PARTNERS[0],
  amount: "",
  frequency: "weekly",
  next_run_at: "",
  note: "",
  remaining_runs: "",
  max_consecutive_failures: "3",
};

function getTransferTypeFromLocation(pathname = "", search = "") {
  if (String(pathname).endsWith("/scheduled-transfers/external")) return "external";
  if (!search) return "internal";
  const type = new URLSearchParams(search).get("type");
  return type === "external" ? "external" : "internal";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toDateTimeLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function getTargetLabel(item) {
  if (item.transfer_type === "external") {
    const recipientName = item.external_transfer?.recipient_name || item.receiver_identifier;
    const recipientPhone = item.external_transfer?.recipient_phone;
    return recipientPhone ? `${recipientName} (${recipientPhone})` : recipientName;
  }
  return item.receiver_identifier;
}

function getTargetSubline(item) {
  if (item.transfer_type !== "external" || !item.external_transfer) return "";
  return `${item.external_transfer.partner_name} | ${item.external_transfer.country_destination}`;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStatusBadgeClasses(status) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "completed") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "cancelled") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function baseInputClassName(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)] ${extra}`;
}

export default function ScheduledTransfersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [defaultTransferType, setDefaultTransferType] = useState(() =>
    getTransferTypeFromLocation(location.pathname, location.search)
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, transfer_type: defaultTransferType }));
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [diagnostics, setDiagnostics] = useState({});
  const [diagnosticLoading, setDiagnosticLoading] = useState({});
  const [editForm, setEditForm] = useState({
    amount: "",
    frequency: "weekly",
    next_run_at: "",
    remaining_runs: "",
    max_consecutive_failures: "3",
    note: "",
  });

  const dueCount = items.filter((item) => item.is_due).length;
  const isExternalTransfer = form.transfer_type === "external";
  const statusSummary = useMemo(() => {
    const counts = {
      active: 0,
      paused: 0,
      failed: 0,
      completed: 0,
      cancelled: 0,
    };
    items.forEach((item) => {
      const status = normalizeStatus(item.status);
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [items]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await api.listScheduledTransfers();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les transferts programmes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname.endsWith("/scheduled-transfers") && params.get("type") === "external") {
      navigate("/dashboard/client/scheduled-transfers/external", { replace: true });
      return;
    }
    const nextDefault = getTransferTypeFromLocation(location.pathname, location.search);
    setDefaultTransferType(nextDefault);
    setForm((prev) => {
      if (prev.transfer_type === nextDefault) return prev;
      return { ...prev, transfer_type: nextDefault };
    });
  }, [location.pathname, location.search, navigate]);

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, transfer_type: defaultTransferType });
  };

  const switchTransferType = (nextType) => {
    if (nextType === form.transfer_type) return;
    if (nextType === "external") {
      navigate("/dashboard/client/scheduled-transfers/external");
    } else {
      navigate("/dashboard/client/scheduled-transfers");
    }
    setForm((prev) => ({
      ...prev,
      transfer_type: nextType,
      receiver_identifier: "",
      recipient_name: "",
      recipient_phone: "",
      recipient_email: "",
      country_destination: "",
      partner_name: PARTNERS[0],
    }));
  };

  const handleCreate = async () => {
    if (!form.amount || !form.next_run_at) {
      setError("Completer le montant et la premiere execution.");
      return;
    }
    if (!isExternalTransfer && !form.receiver_identifier) {
      setError("Completer le destinataire interne.");
      return;
    }
    if (
      isExternalTransfer &&
      (!form.recipient_name || !form.recipient_phone || !form.country_destination || !form.partner_name)
    ) {
      setError("Completer le beneficiaire externe, le pays et le partenaire.");
      return;
    }

    try {
      const payload = {
        transfer_type: form.transfer_type,
        amount: Number(form.amount),
        frequency: form.frequency,
        next_run_at: new Date(form.next_run_at).toISOString(),
        note: form.note || null,
        remaining_runs: form.remaining_runs ? Number(form.remaining_runs) : null,
        max_consecutive_failures: form.max_consecutive_failures ? Number(form.max_consecutive_failures) : 3,
      };
      if (isExternalTransfer) {
        payload.external_transfer = {
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          recipient_email: form.recipient_email || null,
          country_destination: form.country_destination,
          partner_name: form.partner_name,
        };
      } else {
        payload.receiver_identifier = form.receiver_identifier;
      }

      setSubmitting(true);
      setError("");
      setSuccess("");
      await api.createScheduledTransfer(payload);
      setSuccess(isExternalTransfer ? "Transfert externe programme cree." : "Transfert programme cree.");
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err?.message || "Impossible de creer le transfert programme.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunNow = async (scheduleId) => {
    if (!scheduleId) {
      setError("Programmation invalide.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.runScheduledTransferNow(scheduleId);
      setSuccess("Transfert programme execute.");
      await loadItems();
    } catch (err) {
      setError(err?.message || "Execution impossible.");
    }
  };

  const handleRunDue = async () => {
    try {
      setError("");
      setSuccess("");
      const processed = await api.runDueScheduledTransfers();
      const count = Array.isArray(processed) ? processed.length : 0;
      setSuccess(count > 0 ? `${count} echeance(s) due(s) executee(s).` : "Aucune echeance due a executer.");
      await loadItems();
    } catch (err) {
      setError(err?.message || "Execution des echeances dues impossible.");
    }
  };

  const handleCancel = async (scheduleId) => {
    if (!scheduleId) {
      setError("Programmation invalide.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.cancelScheduledTransfer(scheduleId);
      setSuccess("Transfert programme annule.");
      await loadItems();
    } catch (err) {
      setError(err?.message || "Annulation impossible.");
    }
  };

  const handlePause = async (scheduleId) => {
    if (!scheduleId) {
      setError("Programmation invalide.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.pauseScheduledTransfer(scheduleId);
      setSuccess("Transfert programme mis en pause.");
      await loadItems();
    } catch (err) {
      setError(err?.message || "Mise en pause impossible.");
    }
  };

  const handleResume = async (scheduleId) => {
    if (!scheduleId) {
      setError("Programmation invalide.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      await api.resumeScheduledTransfer(scheduleId);
      setSuccess("Transfert programme repris.");
      await loadItems();
    } catch (err) {
      setError(err?.message || "Reprise impossible.");
    }
  };

  const startEdit = (item) => {
    setEditingScheduleId(item.schedule_id);
    setEditForm({
      amount: item.amount ?? "",
      frequency: item.frequency ?? "weekly",
      next_run_at: toDateTimeLocalInput(item.next_run_at),
      remaining_runs: item.remaining_runs ?? "",
      max_consecutive_failures: item.max_consecutive_failures ?? 3,
      note: item.note ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingScheduleId(null);
    setEditForm({
      amount: "",
      frequency: "weekly",
      next_run_at: "",
      remaining_runs: "",
      max_consecutive_failures: "3",
      note: "",
    });
  };

  const handleEdit = async (scheduleId) => {
    if (!editForm.next_run_at) {
      setError("Complete la prochaine execution.");
      return;
    }
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      setError("Montant invalide.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await api.updateScheduledTransfer(scheduleId, {
        amount: Number(editForm.amount),
        frequency: editForm.frequency,
        next_run_at: new Date(editForm.next_run_at).toISOString(),
        remaining_runs: editForm.remaining_runs === "" ? null : Number(editForm.remaining_runs),
        max_consecutive_failures: editForm.max_consecutive_failures
          ? Number(editForm.max_consecutive_failures)
          : 3,
        note: editForm.note || null,
      });
      setSuccess("Programmation mise a jour.");
      cancelEdit();
      await loadItems();
    } catch (err) {
      setError(err?.message || "Mise a jour impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiagnostic = async (scheduleId) => {
    if (!scheduleId) {
      setError("Programmation invalide.");
      return;
    }
    try {
      setError("");
      setDiagnosticLoading((prev) => ({ ...prev, [scheduleId]: true }));
      const data = await api.getScheduledTransferDiagnostic(scheduleId);
      setDiagnostics((prev) => ({ ...prev, [scheduleId]: data || null }));
    } catch (err) {
      setError(err?.message || "Diagnostic impossible.");
    } finally {
      setDiagnosticLoading((prev) => ({ ...prev, [scheduleId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-200/35 blur-2xl" />
        <div className="absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-amber-200/45 blur-2xl" />
        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="inline-flex rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Planification intelligente
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Transferts programmes internes et externes</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Pilote tes virements recurrents depuis un seul ecran: creation, reprise, execution manuelle et diagnostic.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Actifs</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{statusSummary.active}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">En pause</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{statusSummary.paused}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">En echec</p>
              <p className="mt-1 text-2xl font-semibold text-rose-700">{statusSummary.failed}</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Echeances dues</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-700">{dueCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Nouvelle programmation</h2>
            <p className="text-sm text-slate-500">Configure les regles d'execution et la cible du transfert.</p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => switchTransferType("internal")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                !isExternalTransfer ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Interne programme
            </button>
            <button
              type="button"
              onClick={() => switchTransferType("external")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isExternalTransfer ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Externe programme
            </button>
          </div>
        </div>
        <select
          aria-label="Type de transfert programme"
          value={form.transfer_type}
          onChange={(e) => switchTransferType(e.target.value)}
          className="sr-only"
        >
          <option value="internal">Interne</option>
          <option value="external">Externe</option>
        </select>

        {error ? <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Montant">
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="Montant programme"
              placeholder="Montant"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className={baseInputClassName()}
            />
          </Field>

          <Field label="Frequence">
            <select
              aria-label="Frequence programmee"
              value={form.frequency}
              onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}
              className={baseInputClassName()}
            >
              {FREQUENCIES.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Premiere execution">
            <input
              type="datetime-local"
              aria-label="Premiere execution"
              value={form.next_run_at}
              onChange={(e) => setForm((prev) => ({ ...prev, next_run_at: e.target.value }))}
              className={baseInputClassName()}
            />
          </Field>

          <Field label="Limite d'echecs consecutifs">
            <input
              type="number"
              min="1"
              max="10"
              placeholder="Pause auto apres N echecs"
              value={form.max_consecutive_failures}
              onChange={(e) => setForm((prev) => ({ ...prev, max_consecutive_failures: e.target.value }))}
              className={baseInputClassName()}
            />
          </Field>

          <Field label="Executions planifiees (optionnel)">
            <input
              type="number"
              min="1"
              placeholder="Vide = illimite"
              value={form.remaining_runs}
              onChange={(e) => setForm((prev) => ({ ...prev, remaining_runs: e.target.value }))}
              className={baseInputClassName()}
            />
          </Field>

          <Field label="Note (optionnel)">
            <input
              type="text"
              placeholder="Contexte du transfert"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className={baseInputClassName()}
            />
          </Field>
        </div>

        {!isExternalTransfer ? (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-700">Cible interne</p>
            <Field label="Destinataire (email ou paytag)">
              <input
                type="text"
                aria-label="Destinataire programme"
                placeholder="nom@email.com ou @paytag"
                value={form.receiver_identifier}
                onChange={(e) => setForm((prev) => ({ ...prev, receiver_identifier: e.target.value }))}
                className={baseInputClassName("max-w-xl")}
              />
            </Field>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Beneficiaire externe</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nom beneficiaire">
                <input
                  type="text"
                  aria-label="Nom beneficiaire externe"
                  placeholder="Nom du beneficiaire"
                  value={form.recipient_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipient_name: e.target.value }))}
                  className={baseInputClassName()}
                />
              </Field>

              <Field label="Telephone">
                <input
                  type="text"
                  aria-label="Telephone beneficiaire externe"
                  placeholder="+25761234567"
                  value={form.recipient_phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipient_phone: e.target.value }))}
                  className={baseInputClassName()}
                />
              </Field>

              <Field label="Pays destination">
                <input
                  type="text"
                  aria-label="Pays de destination externe"
                  placeholder="Burundi"
                  value={form.country_destination}
                  onChange={(e) => setForm((prev) => ({ ...prev, country_destination: e.target.value }))}
                  className={baseInputClassName()}
                />
              </Field>

              <Field label="Partenaire">
                <select
                  aria-label="Partenaire externe"
                  value={form.partner_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_name: e.target.value }))}
                  className={baseInputClassName()}
                >
                  {PARTNERS.map((partner) => (
                    <option key={partner} value={partner}>
                      {partner}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Email beneficiaire (optionnel)">
                <input
                  type="email"
                  aria-label="Email beneficiaire externe"
                  placeholder="beneficiaire@email.com"
                  value={form.recipient_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipient_email: e.target.value }))}
                  className={baseInputClassName("md:col-span-2 xl:col-span-4")}
                />
              </Field>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creation..." : "Programmer le transfert"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reinitialiser
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mes programmations</h2>
            <p className="text-sm text-slate-500">Execution manuelle, reprise, pause, annulation et diagnostic.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRunDue}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              Executer les echeances dues ({dueCount})
            </button>
            <button
              type="button"
              onClick={loadItems}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Aucun transfert programme pour le moment.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {items.map((item) => {
              const status = normalizeStatus(item.status);
              const isRunnable = ["active", "failed"].includes(status);
              const isPaused = status === "paused";
              const isFinal = ["cancelled", "completed"].includes(status);
              const itemDiagnostic = diagnostics[item.schedule_id];
              const itemDiagnosticLoading = Boolean(diagnosticLoading[item.schedule_id]);
              const editDisabledReason = isFinal ? "Impossible: transfert termine ou annule." : "";
              const runDisabledReason = isRunnable
                ? ""
                : "Impossible: statut requis active ou failed pour executer.";
              const pauseDisabledReason = isFinal ? "Impossible: transfert termine ou annule." : "";
              const cancelDisabledReason = isFinal ? "Impossible: deja termine ou annule." : "";

              return (
                <article
                  key={item.schedule_id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                          {item.transfer_type === "external" ? "Externe" : "Interne"}
                        </span>
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold capitalize ${getStatusBadgeClasses(
                            status
                          )}`}
                        >
                          {status || "-"}
                        </span>
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                            item.is_due
                              ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {item.is_due ? "Echeance due" : "Non due"}
                        </span>
                      </div>

                      <p className="text-base font-semibold text-slate-900">
                        {item.amount} {item.currency_code} vers {getTargetLabel(item)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.transfer_type === "external" ? "Externe" : "Interne"} | {item.frequency} | statut: {status || "-"}
                      </p>
                      {getTargetSubline(item) ? <p className="text-sm text-slate-600">{getTargetSubline(item)}</p> : null}

                      <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-700">Frequence:</span> {item.frequency}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Prochaine execution:</span> {formatDateTime(item.next_run_at)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Echecs consecutifs:</span> {item.failure_count ?? 0} /{" "}
                          {item.max_consecutive_failures ?? 3}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Pause auto securite:</span>{" "}
                          {item.auto_paused_for_failures ? "activee" : "inactive"}
                        </p>
                      </div>

                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Dernier resultat:</span> {item.last_result || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={isFinal}
                        title={editDisabledReason}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editer
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunNow(item.schedule_id)}
                        disabled={!isRunnable}
                        title={runDisabledReason}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Executer maintenant
                      </button>

                      {!isPaused ? (
                        <button
                          type="button"
                          onClick={() => handlePause(item.schedule_id)}
                          disabled={isFinal}
                          title={pauseDisabledReason}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mettre en pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResume(item.schedule_id)}
                          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                        >
                          Reprendre
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDiagnostic(item.schedule_id)}
                        disabled={itemDiagnosticLoading}
                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {itemDiagnosticLoading ? "Diagnostic..." : "Diagnostiquer"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancel(item.schedule_id)}
                        disabled={isFinal}
                        title={cancelDisabledReason}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>

                  {editingScheduleId === item.schedule_id ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Edition rapide</p>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Montant">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                            className={baseInputClassName()}
                            aria-label="Montant edition"
                          />
                        </Field>

                        <Field label="Frequence">
                          <select
                            value={editForm.frequency}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, frequency: e.target.value }))}
                            className={baseInputClassName()}
                            aria-label="Frequence edition"
                          >
                            {FREQUENCIES.map((frequency) => (
                              <option key={frequency.value} value={frequency.value}>
                                {frequency.label}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Prochaine execution">
                          <input
                            type="datetime-local"
                            value={editForm.next_run_at}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, next_run_at: e.target.value }))}
                            className={baseInputClassName()}
                            aria-label="Execution edition"
                          />
                        </Field>

                        <Field label="Executions restantes">
                          <input
                            type="number"
                            min="1"
                            value={editForm.remaining_runs}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, remaining_runs: e.target.value }))}
                            className={baseInputClassName()}
                            aria-label="Executions edition"
                            placeholder="Vide = illimite"
                          />
                        </Field>

                        <Field label="Pause auto apres N echecs">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editForm.max_consecutive_failures}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, max_consecutive_failures: e.target.value }))
                            }
                            className={baseInputClassName()}
                            aria-label="Echecs edition"
                          />
                        </Field>

                        <Field label="Note">
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                            className={baseInputClassName()}
                            aria-label="Note edition"
                          />
                        </Field>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item.schedule_id)}
                          disabled={submitting}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submitting ? "Mise a jour..." : "Enregistrer"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-white"
                        >
                          Annuler edition
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {itemDiagnostic ? (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                      <p>
                        <span className="font-semibold">Diagnostic:</span> {itemDiagnostic.recommended_action || "-"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold">Blocages:</span>{" "}
                        {Array.isArray(itemDiagnostic.blocking_reasons) && itemDiagnostic.blocking_reasons.length > 0
                          ? itemDiagnostic.blocking_reasons.join(", ")
                          : "aucun"}
                      </p>
                      {itemDiagnostic?.context?.latest_external_transfer_status ? (
                        <p className="mt-1">
                          <span className="font-semibold">Statut externe:</span>{" "}
                          {itemDiagnostic.context.latest_external_transfer_status}
                        </p>
                      ) : null}
                      {itemDiagnostic?.context?.latest_external_transfer_failure_reason ? (
                        <p className="mt-1">
                          <span className="font-semibold">Raison echec externe:</span>{" "}
                          {itemDiagnostic.context.latest_external_transfer_failure_reason}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
