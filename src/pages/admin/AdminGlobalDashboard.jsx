import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Briefcase,
  CreditCard,
  Download,
  FileText,
  Scale,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function KpiCard({ title, value, subtitle, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    red: "border-rose-200 bg-rose-50",
    blue: "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm text-slate-700">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

function BaseEntryCard({ title, value, subtitle, icon: Icon, to, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };

  return (
    <Link
      to={to}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone] || tones.slate}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm text-slate-700">
          <Icon size={20} />
        </span>
      </div>
    </Link>
  );
}

export default function AdminGlobalDashboard() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [series, setSeries] = useState([]);
  const [periodDays, setPeriodDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryData, analyticsData, timeseriesData] = await Promise.all([
        api.getAdminDashboardSummary(),
        api.getAdminAnalyticsOverview().catch(() => null),
        api.getAdminDashboardTimeseries(periodDays).catch(() => []),
      ]);
      setSummary(summaryData);
      setAnalytics(analyticsData);
      setSeries(
        (timeseriesData || []).map((item) => ({
          day: String(item.day || ""),
          trades_count: Number(item.trades_count || 0),
          hits_count: Number(item.hits_count || 0),
          avg_risk: Number(item.avg_risk || 0),
        }))
      );
    } catch (err) {
      setError(err?.message || "Impossible de charger le dashboard global admin.");
      setSummary(null);
      setAnalytics(null);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [periodDays]);

  const liquidityRows = useMemo(() => {
    if (!summary?.liquidity) return [];
    return Object.entries(summary.liquidity).map(([account, balance]) => ({
      account,
      balance: balance ?? "N/A",
    }));
  }, [summary]);

  const pendingRows = useMemo(
    () => [
      { label: "Depots pending", value: Number(summary?.pending_deposits || 0) },
      { label: "Retraits pending", value: Number(summary?.pending_withdraws || 0) },
      { label: "Transferts pending", value: Number(summary?.pending_external_transfers || 0) },
    ],
    [summary]
  );

  const roleCounts = useMemo(() => {
    const counts = analytics?.role_counts || {};
    return {
      users: Number(counts.users || 0),
      admins: Number(counts.admins || 0),
      agents: Number(counts.agents || 0),
    };
  }, [analytics]);

  const exportCsv = async () => {
    const series30d = await api
      .getAdminDashboardTimeseries30d()
      .catch(() => []);
    const rows = [
      ["metric", "value"],
      ["total_users", analytics?.total_users ?? 0],
      ["active_today", analytics?.active_today ?? 0],
      ["transactions_24h", analytics?.transactions_24h ?? 0],
      ["transactions_7d", analytics?.transactions_7d ?? 0],
      ["negative_wallets", analytics?.negative_wallets ?? 0],
      ["aml_open_cases", summary?.aml_open_cases ?? 0],
      ["aml_hits_24h", summary?.aml_hits_24h ?? 0],
      ["high_risk_trades", summary?.high_risk_trades ?? 0],
      ["total_trades_24h", summary?.total_trades_24h ?? 0],
      ["arbitrage_executions_24h", summary?.arbitrage_executions_24h ?? 0],
      ["pending_deposits", summary?.pending_deposits ?? 0],
      ["pending_withdraws", summary?.pending_withdraws ?? 0],
      ["pending_external_transfers", summary?.pending_external_transfers ?? 0],
    ];
    liquidityRows.forEach((row) => rows.push([row.account, row.balance]));
    rows.push([]);
    rows.push(["day", "trades_count", "hits_count", "avg_risk"]);
    (series30d || []).forEach((row) =>
      rows.push([
        String(row.day || ""),
        Number(row.trades_count || 0),
        Number(row.hits_count || 0),
        Number(row.avg_risk || 0),
      ])
    );
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    downloadBlob(`admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
  };

  const exportPdf = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;
    const seriesRows = series
      .map(
        (row) =>
          `<tr><td>${row.day}</td><td>${row.trades_count}</td><td>${row.hits_count}</td><td>${row.avg_risk}</td></tr>`
      )
      .join("");
    const html = `
      <html>
        <head>
          <title>Dashboard admin global</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1, h2 { margin: 0 0 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 24px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
            .muted { color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Dashboard admin global</h1>
          <p class="muted">Export genere le ${new Date().toLocaleString("fr-FR")}</p>
          <div class="grid">
            <div class="card"><strong>Utilisateurs</strong><div>${formatNumber(analytics?.total_users)}</div></div>
            <div class="card"><strong>Transactions 24h</strong><div>${formatNumber(analytics?.transactions_24h)}</div></div>
            <div class="card"><strong>Cas AML ouverts</strong><div>${formatNumber(summary?.aml_open_cases)}</div></div>
            <div class="card"><strong>Depots pending</strong><div>${formatNumber(summary?.pending_deposits)}</div></div>
            <div class="card"><strong>Retraits pending</strong><div>${formatNumber(summary?.pending_withdraws)}</div></div>
            <div class="card"><strong>Transferts pending</strong><div>${formatNumber(summary?.pending_external_transfers)}</div></div>
          </div>
          <h2>Liquidite</h2>
          <table>
            <thead><tr><th>Compte</th><th>Solde</th></tr></thead>
            <tbody>${liquidityRows.map((row) => `<tr><td>${row.account}</td><td>${row.balance}</td></tr>`).join("")}</tbody>
          </table>
          <h2>Activite recente</h2>
          <table>
            <thead><tr><th>Jour</th><th>Trades</th><th>Hits AML</th><th>Risque moyen</th></tr></thead>
            <tbody>${seriesRows}</tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Chargement du dashboard global...</div>;
  }

  if (error) {
    return <ApiErrorAlert error={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Pilotage global</p>
            <h1 className="mt-3 text-3xl font-semibold">Dashboard admin global</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Vue consolidee des risques, volumes, liquidite et activite recente pour piloter les operations depuis un seul ecran.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <FileText size={16} /> Export PDF
            </button>
            <Link
              to="/dashboard/admin/transfers"
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              Voir les transferts
            </Link>
            <Link
              to="/dashboard/admin/cash-requests"
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              Validation cash
            </Link>
            <button
              onClick={load}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Rafraichir
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Base</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Base admin</h2>
          <p className="mt-2 text-sm text-slate-500">
            Vue simple des comptes principaux et acces direct a la configuration generale.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BaseEntryCard
            title="Users"
            value={formatNumber(roleCounts.users)}
            subtitle="Clients standards"
            icon={Users}
            to="/dashboard/admin/users"
            tone="slate"
          />
          <BaseEntryCard
            title="Admin"
            value={formatNumber(roleCounts.admins)}
            subtitle="Comptes administrateurs"
            icon={ShieldCheck}
            to="/dashboard/admin/users"
            tone="blue"
          />
          <BaseEntryCard
            title="Agent"
            value={formatNumber(roleCounts.agents)}
            subtitle="Comptes agents"
            icon={Briefcase}
            to="/dashboard/admin/agents"
            tone="emerald"
          />
          <BaseEntryCard
            title="General settings"
            value="FX"
            subtitle="Frais, devise, coefficient et taux custom"
            icon={Settings}
            to="/dashboard/admin/settings"
            tone="amber"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <KpiCard
            title="Utilisateurs"
            value={formatNumber(analytics?.total_users)}
            subtitle={`${formatNumber(analytics?.active_today)} actifs sur 24h`}
            icon={Users}
            tone="slate"
          />
          <Link to="/dashboard/admin/users" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Transactions 24h"
            value={formatNumber(analytics?.transactions_24h)}
            subtitle={`${formatNumber(analytics?.transactions_7d)} sur 7 jours`}
            icon={ArrowLeftRight}
            tone="blue"
          />
          <Link to="/dashboard/admin/transfers" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Cas AML ouverts"
            value={formatNumber(summary?.aml_open_cases)}
            subtitle={`${formatNumber(summary?.aml_hits_24h)} hit(s) AML sur 24h`}
            icon={ShieldAlert}
            tone="amber"
          />
          <Link to="/dashboard/admin/aml-cases" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Wallets negatifs"
            value={formatNumber(analytics?.negative_wallets)}
            subtitle={`${formatNumber(summary?.high_risk_trades)} trade(s) risque >= 80`}
            icon={AlertTriangle}
            tone="red"
          />
          <Link to="/dashboard/admin/wallets" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <KpiCard
            title="Trades P2P 24h"
            value={formatNumber(summary?.total_trades_24h)}
            subtitle="Activite recente P2P"
            icon={ArrowLeftRight}
            tone="emerald"
          />
          <Link to="/dashboard/admin/p2p/trades" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Arbitrages 24h"
            value={formatNumber(summary?.arbitrage_executions_24h)}
            subtitle="Executions journalieres"
            icon={Wallet}
            tone="slate"
          />
          <Link to="/dashboard/admin/arbitrage" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Tresorerie BIF"
            value={String(summary?.liquidity?.TREASURY_BIF ?? "N/A")}
            subtitle="Compte de tresorerie BIF"
            icon={Wallet}
            tone="blue"
          />
          <Link to="/dashboard/admin/liquidity" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
        <div className="space-y-2">
          <KpiCard
            title="Tresorerie USDC"
            value={String(summary?.liquidity?.TREASURY_USDC ?? "N/A")}
            subtitle={`USDT: ${String(summary?.liquidity?.TREASURY_USDT ?? "N/A")}`}
            icon={Wallet}
            tone="emerald"
          />
          <Link to="/dashboard/admin/liquidity" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            Details
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {pendingRows.map((row, index) => (
          <div key={row.label} className="space-y-2">
            <KpiCard
              title={row.label}
              value={formatNumber(row.value)}
              subtitle="Elements en attente de traitement"
              icon={Wallet}
              tone={index === 2 ? "amber" : "slate"}
            />
            <Link
              to={index === 2 ? "/dashboard/admin/transfer-approvals" : "/dashboard/admin/cash-requests"}
              className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Details
            </Link>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Activite recente</h2>
              <p className="text-sm text-slate-500">Trades, hits AML et risque moyen sur la periode choisie.</p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { value: 7, label: "7j" },
                { value: 14, label: "14j" },
                { value: 30, label: "30j" },
                { value: 90, label: "90j" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriodDays(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    periodDays === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="trades_count" name="Trades" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hits_count" name="Hits AML" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avg_risk" name="Risque moyen" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Liquidite et supervision</h2>
          <div className="mt-4 space-y-3">
            {liquidityRows.map((row) => (
              <div key={row.account} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-600">{row.account}</span>
                <span className="font-semibold text-slate-900">{String(row.balance)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            <Link to="/dashboard/admin/risk-heatmap" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Heatmap risque
            </Link>
            <Link to="/dashboard/admin/liquidity" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Detail liquidite
            </Link>
            <Link to="/dashboard/admin/aml-cases" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cas AML ouverts
            </Link>
            <Link to="/dashboard/admin/ops-dashboard" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Operations et monitoring
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
