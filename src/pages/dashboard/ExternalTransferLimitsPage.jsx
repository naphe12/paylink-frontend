import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldCheck } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function blockerLabel(code) {
  const value = String(code || "").toLowerCase();
  if (value === "account_frozen") return "Compte gele pour securite";
  if (value === "external_transfers_blocked") return "Transferts externes suspendus";
  if (value === "kyc_not_verified") return "KYC non verifie";
  if (value === "risk_too_high") return "Niveau de risque trop eleve";
  if (value === "insufficient_financial_capacity") return "Capacite financiere insuffisante";
  if (!value || value === "none") return "Aucun blocage";
  return code;
}

export default function ExternalTransferLimitsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getMyExternalTransferLimitsInsights();
      setInsights(data || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger l'analyse des limites.");
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const currency = insights?.financial_capacity?.currency || "EUR";

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              <ShieldCheck size={14} />
              Transfert externe
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Pourquoi mon transfert est bloque ?</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cette page explique le blocage principal et propose des limites realistes selon ton historique.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              Rafraichir
            </button>
            <Link
              to="/dashboard/client/external-transfer"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Aller au transfert
            </Link>
          </div>
        </div>
      </header>

      <ApiErrorAlert message={error} />

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Chargement de l'analyse...
        </div>
      ) : null}

      {!loading && insights ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Statut actuel</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                {insights.blocked_now ? <AlertTriangle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
                {insights.blocked_now ? "Bloque" : "Actif"}
              </p>
              <p className="mt-2 text-sm text-slate-700">{insights.simple_message}</p>
              <p className="mt-3 text-sm text-slate-600">
                Raison principale: <span className="font-semibold">{blockerLabel(insights.primary_blocker)}</span>
              </p>
              {Array.isArray(insights.blocked_reasons) && insights.blocked_reasons.length > 1 ? (
                <div className="mt-3 text-sm text-slate-600">
                  Autres raisons: {insights.blocked_reasons.slice(1).map(blockerLabel).join(" · ")}
                </div>
              ) : null}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Capacite financiere</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatNumber(insights.financial_capacity?.capacity)} {currency}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Wallet: {formatNumber(insights.financial_capacity?.wallet_balance)} {currency}
              </p>
              <p className="text-sm text-slate-600">
                Credit disponible: {formatNumber(insights.financial_capacity?.credit_available)} {currency}
              </p>
              <p className="mt-3 text-xs text-slate-500">Mode de politique: {insights.policy_mode || "-"}</p>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Limites et recommandations</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Reste journalier</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {insights.limits?.remaining_daily === null ? "Non applicable" : `${formatNumber(insights.limits?.remaining_daily)} ${currency}`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Reste mensuel</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {insights.limits?.remaining_monthly === null ? "Non applicable" : `${formatNumber(insights.limits?.remaining_monthly)} ${currency}`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Limite recommandee / jour</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatNumber(insights.limits?.recommended_daily_limit)} {currency}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Limite recommandee / mois</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {formatNumber(insights.limits?.recommended_monthly_limit)} {currency}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Confiance de recommandation:{" "}
              <span className="font-semibold">
                {insights.limits?.recommendation_confidence || "-"} ({formatNumber(insights.limits?.recommendation_confidence_score)}/100)
              </span>
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Monitoring historique</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">30 jours</p>
                <p className="mt-2 text-sm text-slate-700">
                  {formatNumber(insights.history?.count_30d)} transferts · total {formatNumber(insights.history?.total_30d)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">90 jours</p>
                <p className="mt-2 text-sm text-slate-700">
                  p50 {formatNumber(insights.history?.p50_90d)} · p90 {formatNumber(insights.history?.p90_90d)} · max {formatNumber(insights.history?.max_90d)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tout historique</p>
                <p className="mt-2 text-sm text-slate-700">
                  {formatNumber(insights.history?.count_all)} transferts · total {formatNumber(insights.history?.total_all)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  p50 {formatNumber(insights.history?.p50_all)} · p90 {formatNumber(insights.history?.p90_all)} · max {formatNumber(insights.history?.max_all)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Que faire maintenant ?</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {(insights.next_steps || []).map((step, idx) => (
                <p key={`${idx}-${step}`}>{idx + 1}. {step}</p>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

