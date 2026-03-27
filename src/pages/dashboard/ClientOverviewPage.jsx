import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CreditCard, Gift, ShieldAlert, Wallet } from "lucide-react";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import QuickActions from "@/components/QuickActions";
import { CLIENT_QUICK_ACTION_GROUPS } from "@/constants/clientQuickActionGroups";
import api from "@/services/api";

function formatAmount(value, currency = "EUR", maximumFractionDigits = 2) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(amount);
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  };
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export default function ClientOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState("12m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getClientDashboardOverview();
      setOverview(data);
    } catch (err) {
      setError(err?.message || "Impossible de charger le dashboard client.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const chartData = useMemo(() => {
    if (!overview) return [];
    if (period === "5y") {
      return overview.yearly_transfer_volume || [];
    }
    const monthly = overview.monthly_transfer_volume || [];
    const size = Number.parseInt(period, 10);
    return Number.isFinite(size) ? monthly.slice(-size) : monthly;
  }, [overview, period]);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Chargement du dashboard...</div>;
  }

  if (error) {
    return <ApiErrorAlert error={error} onRetry={loadOverview} />;
  }

  if (!overview) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">Aucune donnee disponible.</div>;
  }

  const { financial, kpis } = overview;
  const walletCurrency = financial.wallet_currency || "EUR";
  const dailyUsagePercent =
    Number(kpis.daily_limit || 0) > 0 ? Math.min((Number(kpis.used_daily || 0) / Number(kpis.daily_limit || 1)) * 100, 100) : 0;
  const monthlyUsagePercent =
    Number(kpis.monthly_limit || 0) > 0
      ? Math.min((Number(kpis.used_monthly || 0) / Number(kpis.monthly_limit || 1)) * 100, 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80">Vue generale</p>
            <h1 className="mt-3 text-3xl font-semibold">Synthese client</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Solde disponible, credit mobilisable, bonus et activite de transfert sur les periodes que nous pouvons calculer depuis vos donnees.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Capacite totale</p>
              <p className="mt-2 text-2xl font-semibold">{formatAmount(kpis.total_capacity, walletCurrency)}</p>
              <p className="mt-1 text-xs text-slate-300">Wallet + ligne de credit disponible</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Risque</p>
              <p className="mt-2 text-2xl font-semibold">{kpis.risk_score}</p>
              <p className="mt-1 text-xs text-slate-300">Score interne actuel</p>
            </div>
          </div>
        </div>
      </section>

      <QuickActions
        title="Acces rapides"
        subtitle="Chaque ensemble reprend exactement les items du menu client."
        groups={CLIENT_QUICK_ACTION_GROUPS}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Solde wallet"
          value={formatAmount(financial.wallet_available, walletCurrency)}
          subtitle={`En attente: ${formatAmount(financial.wallet_pending, walletCurrency)}`}
          icon={Wallet}
          tone="slate"
        />
        <MetricCard
          title="Ligne de credit disponible"
          value={formatAmount(financial.credit_available, walletCurrency)}
          subtitle={`Utilise: ${formatAmount(financial.credit_used, walletCurrency)}`}
          icon={CreditCard}
          tone="amber"
        />
        <MetricCard
          title="Bonus"
          value={formatAmount(kpis.bonus_balance, walletCurrency)}
          subtitle="Montant bonus disponible"
          icon={Gift}
          tone="blue"
        />
        <MetricCard
          title="Demandes en attente"
          value={`${kpis.pending_cash_requests + kpis.pending_external_transfers}`}
          subtitle={`${kpis.pending_cash_requests} cash | ${kpis.pending_external_transfers} transfert(s) externe(s)`}
          icon={ShieldAlert}
          tone="emerald"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Montant de transfert</h2>
              <p className="text-sm text-slate-500">Volume agrege selon les transactions reussies ou cloturees.</p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { value: "3m", label: "3m" },
                { value: "6m", label: "6m" },
                { value: "12m", label: "12m" },
                { value: "5y", label: "5y" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    period === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_amount" name="Montant" fill="#0f766e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="transfers_count" name="Nombre" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Parametres clefs</h2>
          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Limite journaliere</span>
                <span className="font-medium text-slate-900">
                  {formatAmount(kpis.used_daily, walletCurrency)} / {formatAmount(kpis.daily_limit, walletCurrency)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${dailyUsagePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Limite mensuelle</span>
                <span className="font-medium text-slate-900">
                  {formatAmount(kpis.used_monthly, walletCurrency)} / {formatAmount(kpis.monthly_limit, walletCurrency)}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${monthlyUsagePercent}%` }} />
              </div>
            </div>

            <dl className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Tontines</dt>
                <dd className="font-semibold text-slate-900">{financial.tontines_count}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Transferts reussis</dt>
                <dd className="font-semibold text-slate-900">{kpis.successful_transfers}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Mouvements wallet</dt>
                <dd className="font-semibold text-slate-900">{kpis.total_wallet_movements}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Limite credit</dt>
                <dd className="font-semibold text-slate-900">{formatAmount(financial.credit_limit, walletCurrency)}</dd>
              </div>
            </dl>
          </div>
        </article>
      </section>
    </div>
  );
}
