import { useEffect, useState } from "react";
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

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Transferts programmes</h1>
          <p className="text-sm text-slate-500">
            Planifie des transferts recurrents internes ou externes depuis ton wallet.
          </p>
        </div>

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <select
            aria-label="Type de transfert programme"
            value={form.transfer_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                transfer_type: e.target.value,
                receiver_identifier: "",
                recipient_name: "",
                recipient_phone: "",
                recipient_email: "",
                country_destination: "",
                partner_name: PARTNERS[0],
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="internal">Interne</option>
            <option value="external">Externe</option>
          </select>
          <input
            type="number"
            aria-label="Montant programme"
            min="0"
            step="0.01"
            placeholder="Montant"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            aria-label="Frequence programmee"
            value={form.frequency}
            onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {FREQUENCIES.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            aria-label="Premiere execution"
            value={form.next_run_at}
            onChange={(e) => setForm((prev) => ({ ...prev, next_run_at: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            aria-label="Nombre d'executions"
            min="1"
            placeholder="Nombre d'executions (optionnel)"
            value={form.remaining_runs}
            onChange={(e) => setForm((prev) => ({ ...prev, remaining_runs: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            aria-label="Limite echecs consecutifs"
            min="1"
            max="10"
            placeholder="Pause auto apres N echecs"
            value={form.max_consecutive_failures}
            onChange={(e) => setForm((prev) => ({ ...prev, max_consecutive_failures: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            aria-label="Note programmee"
            placeholder="Note (optionnel)"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {!isExternalTransfer ? (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              aria-label="Destinataire programme"
              placeholder="Email ou paytag"
              value={form.receiver_identifier}
              onChange={(e) => setForm((prev) => ({ ...prev, receiver_identifier: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              aria-label="Nom beneficiaire externe"
              placeholder="Nom du beneficiaire"
              value={form.recipient_name}
              onChange={(e) => setForm((prev) => ({ ...prev, recipient_name: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              aria-label="Telephone beneficiaire externe"
              placeholder="+25761234567"
              value={form.recipient_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, recipient_phone: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              aria-label="Pays de destination externe"
              placeholder="Burundi"
              value={form.country_destination}
              onChange={(e) => setForm((prev) => ({ ...prev, country_destination: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              aria-label="Partenaire externe"
              value={form.partner_name}
              onChange={(e) => setForm((prev) => ({ ...prev, partner_name: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {PARTNERS.map((partner) => (
                <option key={partner} value={partner}>
                  {partner}
                </option>
              ))}
            </select>
            <input
              type="email"
              aria-label="Email beneficiaire externe"
              placeholder="Email beneficiaire (optionnel)"
              value={form.recipient_email}
              onChange={(e) => setForm((prev) => ({ ...prev, recipient_email: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Creation..." : "Programmer le transfert"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mes programmations</h2>
            <p className="text-sm text-slate-500">Execution manuelle ou par lot des echeances dues.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRunDue}
              className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
            >
              Executer les echeances dues ({dueCount})
            </button>
            <button
              onClick={loadItems}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucun transfert programme pour le moment.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.schedule_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.amount} {item.currency_code} vers {getTargetLabel(item)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.transfer_type === "external" ? "Externe" : "Interne"} | {item.frequency} | statut: {item.status}
                    </p>
                    {getTargetSubline(item) ? <p className="text-sm text-slate-500">{getTargetSubline(item)}</p> : null}
                    <p className="text-sm text-slate-500">Prochaine execution: {formatDateTime(item.next_run_at)}</p>
                    <p className="text-sm text-slate-500">Dernier resultat: {item.last_result || "-"}</p>
                    <p className="text-sm text-slate-500">Echeance due: {item.is_due ? "oui" : "non"}</p>
                    <p className="text-sm text-slate-500">
                      Echecs consecutifs: {item.failure_count ?? 0} / {item.max_consecutive_failures ?? 3}
                    </p>
                    <p className="text-sm text-slate-500">
                      Pause auto securite: {item.auto_paused_for_failures ? "activee" : "inactive"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Action recommandee: {item.status === "paused" ? "reprendre ou annuler" : item.is_due ? "executer" : "surveiller"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      disabled={["cancelled", "completed"].includes(item.status)}
                      className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      Editer
                    </button>
                    <button
                      onClick={() => handleRunNow(item.schedule_id)}
                      disabled={!["active", "failed"].includes(item.status)}
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Executer maintenant
                    </button>
                    {item.status !== "paused" ? (
                      <button
                        onClick={() => handlePause(item.schedule_id)}
                        disabled={["cancelled", "completed"].includes(item.status)}
                        className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Mettre en pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResume(item.schedule_id)}
                        className="rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
                      >
                        Reprendre
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(item.schedule_id)}
                      disabled={["cancelled", "completed"].includes(item.status)}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
                {editingScheduleId === item.schedule_id ? (
                  <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Montant edition"
                    />
                    <select
                      value={editForm.frequency}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, frequency: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Frequence edition"
                    >
                      {FREQUENCIES.map((frequency) => (
                        <option key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={editForm.next_run_at}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, next_run_at: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Execution edition"
                    />
                    <input
                      type="number"
                      min="1"
                      value={editForm.remaining_runs}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, remaining_runs: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Executions edition"
                      placeholder="Executions (vide = illimite)"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editForm.max_consecutive_failures}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, max_consecutive_failures: e.target.value }))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Echecs edition"
                    />
                    <input
                      type="text"
                      value={editForm.note}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label="Note edition"
                    />
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        onClick={() => handleEdit(item.schedule_id)}
                        disabled={submitting}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {submitting ? "Mise a jour..." : "Enregistrer"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Annuler edition
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
