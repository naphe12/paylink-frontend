import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Users, Wallet } from "lucide-react";

import api from "@/services/api";

function StatCard({ label, value, currency }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {value} {currency}
      </p>
    </div>
  );
}

export default function FinancialSituationPage() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [budgetForm, setBudgetForm] = useState({
    category: "global",
    limit_amount: "",
  });
  const [budgetSaving, setBudgetSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, insightsData] = await Promise.all([
        api.getFinancialSummary(),
        api.getFinancialInsights().catch(() => null),
      ]);
      setSummary(summaryData);
      setInsights(insightsData);
    } catch {
      setError("Impossible de charger la situation financiere.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveBudgetRule = async () => {
    if (!budgetForm.category || !budgetForm.limit_amount) {
      setError("Renseigne la categorie et le plafond.");
      return;
    }
    try {
      setBudgetSaving(true);
      setError("");
      setSuccess("");
      const data = await api.upsertFinancialBudgetRule({
        category: budgetForm.category,
        limit_amount: Number(budgetForm.limit_amount),
      });
      setInsights(data);
      setBudgetForm((prev) => ({ ...prev, limit_amount: "" }));
      setSuccess("Regle budgetaire enregistree.");
    } catch (err) {
      setError(err?.message || "Impossible d'enregistrer la regle budgetaire.");
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleDeleteBudgetRule = async (category) => {
    try {
      setError("");
      setSuccess("");
      const data = await api.deleteFinancialBudgetRule(category);
      setInsights(data);
      setSuccess(
        category === "global" ? "Retour au budget suggere." : `Regle ${category} supprimee.`
      );
    } catch (err) {
      setError(err?.message || "Impossible de supprimer la regle budgetaire.");
    }
  };

  const alertTone =
    insights?.alert_level === "critical"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : insights?.alert_level === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const cards = [
    {
      title: "Solde Portefeuille",
      icon: <Wallet size={18} />,
      value: summary
        ? `${Number(summary.wallet_available).toLocaleString()} ${summary.wallet_currency || ""}`.trim()
        : "-",
      sub: summary?.bonus_balance
        ? `Bonus: ${Number(summary.bonus_balance).toLocaleString()} ${summary.wallet_currency || ""}`.trim()
        : null,
    },
    {
      title: "Ligne de Credit",
      icon: <CreditCard size={18} />,
      value: summary ? `${Number(summary.credit_limit).toLocaleString()} EUR` : "-",
      sub: summary
        ? `Disponible: ${Number(summary.credit_available).toLocaleString()} EUR | Utilise: ${Number(summary.credit_used).toLocaleString()} EUR`
        : null,
    },
    {
      title: "Tontines",
      icon: <Users size={18} />,
      value: summary ? `${summary.tontines_count} participation${summary.tontines_count > 1 ? "s" : ""}` : "-",
      sub: null,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <div>
            <p className="text-sm text-slate-500">Vue synthetique de vos finances</p>
            <h1 className="text-2xl font-bold text-slate-900">Situation financiere</h1>
          </div>
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-emerald-700">{success}</div>}
      {loading && <div className="text-slate-600">Chargement...</div>}

      {!loading && !error && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <span className="text-slate-600">{card.icon}</span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                {card.sub && <p className="text-sm text-slate-500">{card.sub}</p>}
              </div>
            ))}
          </div>

          {insights && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr,1.2fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Assistant financier</p>
                  <h2 className="text-xl font-semibold text-slate-900">Budget et respiration mensuelle</h2>
                </div>
                <div className={`rounded-xl border p-4 ${alertTone}`}>
                  <p className="text-sm font-semibold">Alerte budget</p>
                  <p className="mt-1 text-sm">{insights.alert_message}</p>
                  <p className="mt-2 text-xs">
                    Utilisation: {Number(insights.budget_usage_percent || 0).toLocaleString("fr-FR")}%
                    {" • "}
                    Categories depassees: {insights.over_limit_count || 0}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard
                    label="Entrees du mois"
                    value={Number(insights.month_inflows).toLocaleString()}
                    currency={insights.currency_code}
                  />
                  <StatCard
                    label="Depenses du mois"
                    value={Number(insights.month_outflows).toLocaleString()}
                    currency={insights.currency_code}
                  />
                  <StatCard
                    label="Budget suggere"
                    value={Number(insights.suggested_budget).toLocaleString()}
                    currency={insights.currency_code}
                  />
                  <StatCard
                    label="Budget actif"
                    value={Number(insights.active_budget).toLocaleString()}
                    currency={insights.currency_code}
                  />
                  <StatCard
                    label="Reste a depenser"
                    value={Number(insights.remaining_to_spend).toLocaleString()}
                    currency={insights.currency_code}
                  />
                  <StatCard
                    label="Epargne detectee"
                    value={Number(insights.current_savings).toLocaleString()}
                    currency={insights.currency_code}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Source du budget</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {insights.budget_source === "custom" ? "Budget personnalise" : "Budget suggere"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Net du mois: {Number(insights.month_net).toLocaleString()} {insights.currency_code}
                  </p>
                  {insights.budget_source === "custom" ? (
                    <button
                      onClick={() => handleDeleteBudgetRule("global")}
                      className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Revenir au budget suggere
                    </button>
                  ) : null}
                </div>
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Definir un plafond budgetaire</p>
                    <p className="text-sm text-slate-500">Global ou par categorie de depense.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                    <select
                      aria-label="Categorie budgetaire"
                      value={budgetForm.category}
                      onChange={(e) => setBudgetForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="global">global</option>
                      <option value="transferts">transferts</option>
                      <option value="paiements">paiements</option>
                      <option value="cash">cash</option>
                      <option value="credit">credit</option>
                      <option value="recharges">recharges</option>
                      <option value="autres">autres</option>
                    </select>
                    <input
                      aria-label="Montant budgetaire"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Plafond"
                      value={budgetForm.limit_amount}
                      onChange={(e) => setBudgetForm((prev) => ({ ...prev, limit_amount: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleSaveBudgetRule}
                      disabled={budgetSaving}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {budgetSaving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Lecture de vos habitudes</p>
                  <h2 className="text-xl font-semibold text-slate-900">Postes de depense dominants</h2>
                </div>
                {(insights.top_spending_categories || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Pas assez de depenses recentes pour categoriser.</p>
                ) : (
                  <div className="space-y-3">
                    {insights.top_spending_categories.map((item) => (
                      <div key={item.category} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold capitalize text-slate-900">{item.category}</p>
                          <p className="text-sm text-slate-500">{item.share_percent}% du total</p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {Number(item.amount).toLocaleString()} {insights.currency_code}
                        </p>
                        {item.budget_limit ? (
                          <p className={`mt-1 text-sm ${item.is_over_limit ? "text-rose-600" : "text-slate-500"}`}>
                            Budget: {Number(item.budget_limit).toLocaleString()} {insights.currency_code}
                            {" | "}
                            Reste: {Number(item.remaining_budget || 0).toLocaleString()} {insights.currency_code}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Regles budgetaires actives</p>
                  {(insights.budget_rules || []).length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Aucune limite de categorie definie.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {insights.budget_rules.map((rule) => (
                        <div key={rule.category} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold capitalize text-slate-900">{rule.category}</p>
                            <div className="flex items-center gap-3">
                              <p className={`text-xs font-medium ${rule.is_over_limit ? "text-rose-600" : "text-slate-500"}`}>
                                {rule.progress_percent}%
                              </p>
                              <button
                                onClick={() => handleDeleteBudgetRule(rule.category)}
                                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {Number(rule.spent_amount).toLocaleString()} / {Number(rule.limit_amount).toLocaleString()} {insights.currency_code}
                          </p>
                          <p className={`mt-1 text-xs ${rule.is_over_limit ? "text-rose-600" : "text-slate-500"}`}>
                            Reste: {Number(rule.remaining_amount).toLocaleString()} {insights.currency_code}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Conseils simples</p>
                  <div className="mt-2 space-y-2 text-sm text-amber-900">
                    {(insights.guidance || []).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
