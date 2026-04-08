import { useEffect, useState } from "react";
import api from "@/services/api";

function formatAmount(value, currency) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ""}`.trim();
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const localTime = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
}

function computeRoundUpPreview(spentAmount, increment, maxAmount) {
  const spent = Number(spentAmount);
  const unit = Number(increment);
  const cap = Number(maxAmount);
  if (!Number.isFinite(spent) || spent <= 0 || !Number.isFinite(unit) || unit <= 0) return 0;
  const remainder = spent % unit;
  let delta = remainder === 0 ? 0 : unit - remainder;
  if (Number.isFinite(cap) && cap > 0) {
    delta = Math.min(delta, cap);
  }
  return Number(delta.toFixed(2));
}

export default function SavingsGoalsPage() {
  const [items, setItems] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    target_date: "",
    note: "",
    locked: false,
  });
  const [movementAmount, setMovementAmount] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [roundUpForm, setRoundUpForm] = useState({
    enabled: true,
    increment: "100",
    max_amount: "",
    spent_amount: "",
  });
  const [autoContributionForm, setAutoContributionForm] = useState({
    enabled: true,
    amount: "",
    frequency: "weekly",
    next_run_at: "",
  });

  const syncGoalForms = (detail) => {
    const roundUpRule = detail?.round_up_rule || {};
    setRoundUpForm((prev) => ({
      ...prev,
      enabled: Boolean(roundUpRule.enabled),
      increment: roundUpRule.increment ? String(roundUpRule.increment) : prev.increment || "100",
      max_amount: roundUpRule.max_amount ? String(roundUpRule.max_amount) : "",
      spent_amount: "",
    }));

    const autoRule = detail?.auto_contribution_rule || {};
    setAutoContributionForm({
      enabled: autoRule.enabled ?? true,
      amount: autoRule.amount ? String(autoRule.amount) : "",
      frequency: autoRule.frequency || "weekly",
      next_run_at: autoRule.next_run_at ? toDateTimeLocalValue(autoRule.next_run_at) : "",
    });
  };

  const resetGoalForms = () => {
    setRoundUpForm({
      enabled: true,
      increment: "100",
      max_amount: "",
      spent_amount: "",
    });
    setAutoContributionForm({
      enabled: true,
      amount: "",
      frequency: "weekly",
      next_run_at: "",
    });
  };

  const loadGoals = async (goalIdToSelect = null) => {
    try {
      setLoading(true);
      const goals = await api.listSavingsGoals();
      const normalized = Array.isArray(goals) ? goals : [];
      setItems(normalized);
      const targetGoal =
        normalized.find((goal) => goal.goal_id === goalIdToSelect) ||
        normalized.find((goal) => goal.goal_id === selectedGoal?.goal_id) ||
        normalized[0] ||
        null;
      if (targetGoal) {
        const detail = await api.getSavingsGoalDetail(targetGoal.goal_id);
        setSelectedGoal(detail);
        syncGoalForms(detail);
      } else {
        setSelectedGoal(null);
        resetGoalForms();
      }
    } catch (err) {
      setError(err?.message || "Impossible de charger les objectifs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.target_amount) {
      setError("Renseigne le titre et le montant cible.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      const created = await api.createSavingsGoal({
        title: form.title,
        target_amount: Number(form.target_amount),
        target_date: form.target_date ? new Date(form.target_date).toISOString() : null,
        note: form.note || null,
        locked: form.locked,
      });
      setSuccess("Objectif d'epargne cree.");
      setForm({
        title: "",
        target_amount: "",
        target_date: "",
        note: "",
        locked: false,
      });
      await loadGoals(created.goal_id);
    } catch (err) {
      setError(err?.message || "Creation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = async (goalId) => {
    try {
      setError("");
      const detail = await api.getSavingsGoalDetail(goalId);
      setSelectedGoal(detail);
      syncGoalForms(detail);
    } catch (err) {
      setError(err?.message || "Impossible de charger le detail.");
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !movementAmount) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.contributeSavingsGoal(selectedGoal.goal_id, {
        amount: Number(movementAmount),
      });
      setSelectedGoal(detail);
      setSuccess("Contribution epargne enregistree.");
      setMovementAmount("");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Contribution impossible.");
    }
  };

  const handleWithdraw = async () => {
    if (!selectedGoal || !movementAmount) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.withdrawSavingsGoal(selectedGoal.goal_id, {
        amount: Number(movementAmount),
      });
      setSelectedGoal(detail);
      setSuccess("Retrait epargne enregistre.");
      setMovementAmount("");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Retrait impossible.");
    }
  };

  const handleToggleLock = async () => {
    if (!selectedGoal) return;
    try {
      setError("");
      setSuccess("");
      const nextLocked = !selectedGoal.locked;
      const detail = await api.updateSavingsGoalLock(selectedGoal.goal_id, {
        locked: nextLocked,
        reason: lockReason.trim() || undefined,
      });
      setSelectedGoal(detail);
      setLockReason("");
      setSuccess(nextLocked ? "Coffre verrouille." : "Coffre deverrouille.");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Mise a jour du verrouillage impossible.");
    }
  };

  const handleSaveRoundUpRule = async () => {
    if (!selectedGoal || !roundUpForm.increment) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.configureSavingsGoalRoundUp(selectedGoal.goal_id, {
        enabled: roundUpForm.enabled,
        increment: Number(roundUpForm.increment),
        max_amount: roundUpForm.max_amount ? Number(roundUpForm.max_amount) : null,
      });
      setSelectedGoal(detail);
      setSuccess("Regle d'arrondi automatique mise a jour.");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Configuration de l'arrondi impossible.");
    }
  };

  const handleApplyRoundUp = async () => {
    if (!selectedGoal || !roundUpForm.spent_amount) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.applySavingsGoalRoundUp(selectedGoal.goal_id, {
        spent_amount: Number(roundUpForm.spent_amount),
      });
      setSelectedGoal(detail);
      setRoundUpForm((prev) => ({ ...prev, spent_amount: "" }));
      setSuccess("Arrondi automatique applique a l'objectif.");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Application de l'arrondi impossible.");
    }
  };

  const handleSaveAutoContribution = async () => {
    if (!selectedGoal || !autoContributionForm.amount || !autoContributionForm.next_run_at) {
      setError("Renseigne le montant et la prochaine execution automatique.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const detail = await api.configureSavingsGoalAutoContribution(selectedGoal.goal_id, {
        enabled: autoContributionForm.enabled,
        amount: Number(autoContributionForm.amount),
        frequency: autoContributionForm.frequency,
        next_run_at: new Date(autoContributionForm.next_run_at).toISOString(),
      });
      setSelectedGoal(detail);
      syncGoalForms(detail);
      setSuccess("Contribution automatique mise a jour.");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Configuration de la contribution automatique impossible.");
    }
  };

  const handleRunAutoContribution = async () => {
    if (!selectedGoal) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.runSavingsGoalAutoContribution(selectedGoal.goal_id, {});
      setSelectedGoal(detail);
      syncGoalForms(detail);
      setSuccess("Contribution automatique executee.");
      await loadGoals(selectedGoal.goal_id);
    } catch (err) {
      setError(err?.message || "Execution de la contribution automatique impossible.");
    }
  };

  const handleRunDueAutoContributions = async () => {
    try {
      setError("");
      setSuccess("");
      const processed = await api.runDueSavingsAutoContributions();
      const count = Array.isArray(processed) ? processed.length : 0;
      setSuccess(
        count > 0
          ? `${count} contribution${count > 1 ? "s" : ""} automatique${count > 1 ? "s" : ""} executee${count > 1 ? "s" : ""}.`
          : "Aucune contribution automatique due."
      );
      await loadGoals(selectedGoal?.goal_id || null);
    } catch (err) {
      setError(err?.message || "Traitement des contributions automatiques dues impossible.");
    }
  };

  const roundUpPreview = computeRoundUpPreview(
    roundUpForm.spent_amount,
    roundUpForm.increment,
    roundUpForm.max_amount
  );
  const dueAutoContributionCount = items.filter((item) => item.auto_contribution_rule?.is_due).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Epargne intelligente</h1>
          <p className="text-sm text-slate-500">
            Cree des objectifs, alimente-les depuis le wallet et suis la progression.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <input
            aria-label="Titre objectif epargne"
            type="text"
            placeholder="Titre de l'objectif"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Montant cible epargne"
            type="number"
            min="0"
            step="0.01"
            placeholder="Montant cible"
            value={form.target_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, target_amount: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Date cible epargne"
            type="date"
            value={form.target_date}
            onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Note objectif epargne"
            type="text"
            placeholder="Note (optionnel)"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.locked}
            onChange={(e) => setForm((prev) => ({ ...prev, locked: e.target.checked }))}
          />
          Coffre verrouille
        </label>
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Creation..." : "Creer l'objectif"}
        </button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mes objectifs</h2>
              <p className="text-sm text-slate-500">Selectionne un objectif pour le gerer.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {dueAutoContributionCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700">
                  {dueAutoContributionCount} due{dueAutoContributionCount > 1 ? "s" : ""}
                </span>
              ) : null}
              <button
                onClick={handleRunDueAutoContributions}
                disabled={dueAutoContributionCount === 0}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              >
                Executer les dues
              </button>
              <button
                onClick={() => loadGoals(selectedGoal?.goal_id || null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Rafraichir
              </button>
            </div>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucun objectif pour le moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <button
                  key={item.goal_id}
                  onClick={() => handleSelect(item.goal_id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedGoal?.goal_id === item.goal_id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatAmount(item.current_amount, item.currency_code)} /{" "}
                    {formatAmount(item.target_amount, item.currency_code)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.progress_percent}% | {item.status} {item.locked ? "| verrouille" : ""}
                    {item.auto_contribution_rule?.enabled && item.auto_contribution_rule?.amount
                      ? ` | auto ${formatAmount(item.auto_contribution_rule.amount, item.currency_code)} / ${
                          item.auto_contribution_rule.frequency
                        }${item.auto_contribution_rule.is_due ? " | due" : ""}`
                      : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedGoal ? (
            <p className="text-sm text-slate-500">Selectionne un objectif pour voir le detail.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedGoal.title}</h2>
                  <p className="text-sm text-slate-500">
                    Cible le {formatDate(selectedGoal.target_date)} | statut: {selectedGoal.status}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {selectedGoal.locked ? "Verrouille" : "Flexible"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progression</span>
                  <span>{selectedGoal.progress_percent}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(selectedGoal.progress_percent || 0, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  {formatAmount(selectedGoal.current_amount, selectedGoal.currency_code)} disponibles sur{" "}
                  {formatAmount(selectedGoal.target_amount, selectedGoal.currency_code)}
                </p>
              </div>

              {(selectedGoal.recommended_weekly_amount || selectedGoal.recommended_monthly_amount) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-sky-700">Suggestion hebdomadaire</p>
                    <p className="mt-1 text-sm font-semibold text-sky-900">
                      {formatAmount(selectedGoal.recommended_weekly_amount, selectedGoal.currency_code)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-indigo-700">Suggestion mensuelle</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-900">
                      {formatAmount(selectedGoal.recommended_monthly_amount, selectedGoal.currency_code)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <input
                  aria-label="Montant mouvement epargne"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleContribute}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Alimenter
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={selectedGoal.locked}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    aria-label="Raison verrouillage epargne"
                    type="text"
                    placeholder="Raison (optionnel)"
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleToggleLock}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                      selectedGoal.locked ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {selectedGoal.locked ? "Deverrouiller le coffre" : "Verrouiller le coffre"}
                  </button>
                  <span className="rounded-full bg-white px-3 py-2 text-xs text-slate-600">
                    Etat: {selectedGoal.locked ? "verrouille" : "deverrouille"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-amber-50 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Contribution automatique</h3>
                  <p className="text-sm text-slate-500">
                    Programme une alimentation automatique simple depuis le wallet vers cet objectif.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoContributionForm.enabled}
                      onChange={(e) =>
                        setAutoContributionForm((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                    />
                    Activer
                  </label>
                  <input
                    aria-label="Montant contribution automatique epargne"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant"
                    value={autoContributionForm.amount}
                    onChange={(e) =>
                      setAutoContributionForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    aria-label="Frequence contribution automatique epargne"
                    value={autoContributionForm.frequency}
                    onChange={(e) =>
                      setAutoContributionForm((prev) => ({ ...prev, frequency: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                  <input
                    aria-label="Prochaine contribution automatique epargne"
                    type="datetime-local"
                    value={autoContributionForm.next_run_at}
                    onChange={(e) =>
                      setAutoContributionForm((prev) => ({ ...prev, next_run_at: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Statut</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedGoal.auto_contribution_rule?.enabled
                        ? selectedGoal.auto_contribution_rule?.is_due
                          ? "Actif | due"
                          : "Actif"
                        : "Inactif"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Prochaine execution</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(selectedGoal.auto_contribution_rule?.next_run_at)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Derniere execution</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(selectedGoal.auto_contribution_rule?.last_applied_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveAutoContribution}
                    className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-white"
                  >
                    Enregistrer la contribution auto
                  </button>
                  <button
                    onClick={handleRunAutoContribution}
                    disabled={!selectedGoal.auto_contribution_rule?.enabled}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Executer maintenant
                  </button>
                  <span className="rounded-full bg-white px-3 py-2 text-xs text-slate-600">
                    Montant: {formatAmount(selectedGoal.auto_contribution_rule?.amount, selectedGoal.currency_code)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Arrondi automatique</h3>
                  <p className="text-sm text-slate-500">
                    Configure une regle simple par objectif, puis applique-la sur un montant de depense.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roundUpForm.enabled}
                      onChange={(e) => setRoundUpForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    Activer l'arrondi
                  </label>
                  <input
                    aria-label="Palier arrondi epargne"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Palier"
                    value={roundUpForm.increment}
                    onChange={(e) => setRoundUpForm((prev) => ({ ...prev, increment: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Plafond arrondi epargne"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Plafond par depense"
                    value={roundUpForm.max_amount}
                    onChange={(e) => setRoundUpForm((prev) => ({ ...prev, max_amount: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSaveRoundUpRule}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Enregistrer la regle
                  </button>
                  <span className="rounded-full bg-white px-3 py-2 text-xs text-slate-600">
                    Statut: {selectedGoal.round_up_rule?.enabled ? "actif" : "inactif"}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr,auto,auto] md:items-center">
                  <input
                    aria-label="Montant depense arrondi epargne"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant de depense"
                    value={roundUpForm.spent_amount}
                    onChange={(e) => setRoundUpForm((prev) => ({ ...prev, spent_amount: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700">
                    Arrondi estime: {formatAmount(roundUpPreview, selectedGoal.currency_code)}
                  </span>
                  <button
                    onClick={handleApplyRoundUp}
                    disabled={!selectedGoal.round_up_rule?.enabled}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Appliquer l'arrondi
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Mouvements</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {(selectedGoal.movements || []).length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-500">Aucun mouvement pour cet objectif.</p>
                  ) : (
                    selectedGoal.movements.map((movement) => (
                      <div key={movement.movement_id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {movement.direction === "in" ? "Alimentation" : "Retrait"}
                          </p>
                          <p className="text-xs text-slate-500">{formatDate(movement.created_at)}</p>
                        </div>
                        <p className={`text-sm font-semibold ${movement.direction === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                          {movement.direction === "in" ? "+" : "-"} {formatAmount(movement.amount, movement.currency_code)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
