import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Banknote,
  CalendarClock,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RISK_LEVEL_META = {
  low: { label: "Low", color: "#10b981" },
  medium: { label: "Medium", color: "#f59e0b" },
  high: { label: "High", color: "#f97316" },
  critical: { label: "Critical", color: "#ef4444" },
};

const cardIconMap = {
  total_volume: Banknote,
  mobile_money_volume: Activity,
  active_agents: Users,
  aml_high: AlertTriangle,
  pending_external: Shield,
  active_tontines: CalendarClock,
  sanctions_matches: Shield,
  mobile_share: Activity,
  variation: ArrowUpDown,
  avg_volume: Banknote,
  risk_score: AlertTriangle,
};

const numberFormatter = new Intl.NumberFormat("fr-FR");
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(value) {
  return `${percentFormatter.format(toNumber(value))} %`;
}

function movingAverage(series, key, window = 3) {
  if (!Array.isArray(series)) return [];
  return series.map((item, idx) => {
    const start = Math.max(0, idx - (window - 1));
    const bucket = series.slice(start, idx + 1);
    const avg = bucket.reduce((sum, row) => sum + toNumber(row[key]), 0) / bucket.length;
    return avg;
  });
}

function toCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvDownload(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export default function RiskMonitorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("EUR");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [period, setPeriod] = useState("daily");
  const [metric, setMetric] = useState("total");
  const [riskSort, setRiskSort] = useState("desc");
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState("60");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [res, preference] = await Promise.all([
        api.getAdminPremiumAnalytics(),
        api.getMyDisplayCurrencyPreference().catch(() => null),
      ]);
      setData(res || null);
      const prefCurrency =
        String(
          preference?.display_currency ||
            preference?.displayCurrency ||
            preference ||
            ""
        )
          .trim()
          .toUpperCase() || "EUR";
      setDisplayCurrency(prefCurrency);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (autoRefresh === "off") return undefined;
    const seconds = Number(autoRefresh);
    if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
    const timer = setInterval(() => {
      load();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (period === "weekly" && metric !== "total") {
      setMetric("total");
    }
  }, [metric, period]);

  const dailySeries = useMemo(() => {
    const rows = Array.isArray(data?.daily_volume) ? data.daily_volume : [];
    return rows
      .map((row) => {
        const total = toNumber(row?.total);
        const mobile = toNumber(row?.mobile);
        return {
          period: String(row?.date || ""),
          label: String(row?.date || ""),
          total,
          mobile,
          mobileShare: total > 0 ? (mobile / total) * 100 : 0,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  const weeklySeries = useMemo(() => {
    const rows = Array.isArray(data?.weekly_volume) ? data.weekly_volume : [];
    return rows
      .map((row) => ({
        period: String(row?.week || ""),
        label: String(row?.week || ""),
        total: toNumber(row?.total),
        mobile: 0,
        mobileShare: 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  const selectedSeries = period === "daily" ? dailySeries : weeklySeries;

  const selectedSeriesWithTrend = useMemo(() => {
    const avg = movingAverage(selectedSeries, "total", 3);
    return selectedSeries.map((row, idx) => ({
      ...row,
      trend: avg[idx] || 0,
    }));
  }, [selectedSeries]);

  const riskEntries = useMemo(() => {
    const entries = Object.entries(data?.risk_breakdown || {}).map(([rawLevel, rawCount]) => {
      const level = String(rawLevel || "").toLowerCase();
      const count = toNumber(rawCount);
      const meta = RISK_LEVEL_META[level] || {
        label: level || "Unknown",
        color: "#64748b",
      };
      return {
        level,
        label: meta.label,
        color: meta.color,
        count,
      };
    });

    if (riskSort === "asc") {
      entries.sort((a, b) => a.count - b.count);
      return entries;
    }
    if (riskSort === "alpha") {
      entries.sort((a, b) => a.label.localeCompare(b.label));
      return entries;
    }
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [data, riskSort]);

  const riskTotal = useMemo(() => riskEntries.reduce((sum, item) => sum + item.count, 0), [riskEntries]);

  const executive = useMemo(() => {
    const kpis = data?.kpis || {};
    const totalVolume = toNumber(kpis.total_volume);
    const mobileVolume = toNumber(kpis.mobile_money_volume);
    const mobileShare = totalVolume > 0 ? (mobileVolume / totalVolume) * 100 : 0;

    const len = selectedSeriesWithTrend.length;
    const latest = len > 0 ? selectedSeriesWithTrend[len - 1].total : 0;
    const prev = len > 1 ? selectedSeriesWithTrend[len - 2].total : 0;
    const variation = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
    const avgVolume = len > 0 ? selectedSeriesWithTrend.reduce((sum, row) => sum + row.total, 0) / len : 0;

    const amlHigh = toNumber(kpis.aml_high);
    const pendingExternal = toNumber(kpis.pending_external);
    const sanctionsMatches = toNumber(kpis.sanctions_matches);
    const riskScoreRaw = amlHigh * 3 + pendingExternal + sanctionsMatches * 5;
    const riskScore = Math.min(100, riskScoreRaw);

    let riskLevel = "Faible";
    let riskTone = "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (riskScore >= 75) {
      riskLevel = "Critique";
      riskTone = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (riskScore >= 45) {
      riskLevel = "Eleve";
      riskTone = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (riskScore >= 20) {
      riskLevel = "Modere";
      riskTone = "bg-orange-50 text-orange-700 border-orange-200";
    }

    return {
      totalVolume,
      mobileVolume,
      mobileShare,
      variation,
      avgVolume,
      riskScore,
      riskLevel,
      riskTone,
    };
  }, [data, selectedSeriesWithTrend]);

  const kpiCards = useMemo(() => {
    if (!data?.kpis) return [];
    const formatAmount = (value) =>
      `${numberFormatter.format(toNumber(value))} ${displayCurrency}`;
    return [
      { key: "total_volume", label: "Volume total", value: formatAmount(data.kpis.total_volume) },
      { key: "mobile_money_volume", label: "Volume Mobile Money", value: formatAmount(data.kpis.mobile_money_volume) },
      { key: "mobile_share", label: "Part Mobile", value: formatPercent(executive.mobileShare) },
      { key: "variation", label: "Variation vs periode precedente", value: formatPercent(executive.variation) },
      { key: "avg_volume", label: "Moyenne periode", value: formatAmount(executive.avgVolume) },
      { key: "active_agents", label: "Agents actifs", value: numberFormatter.format(data.kpis.active_agents || 0) },
      { key: "aml_high", label: "Alertes AML (High+)", value: numberFormatter.format(data.kpis.aml_high || 0) },
      { key: "pending_external", label: "Transferts externes en attente", value: numberFormatter.format(data.kpis.pending_external || 0) },
      { key: "active_tontines", label: "Tontines actives", value: numberFormatter.format(data.kpis.active_tontines || 0) },
      { key: "sanctions_matches", label: "Matches sanctions", value: numberFormatter.format(data.kpis.sanctions_matches || 0) },
      { key: "risk_score", label: "Risk score", value: `${numberFormatter.format(executive.riskScore)}/100` },
    ];
  }, [data, displayCurrency, executive]);

  const chartMetricLabel = {
    total: "Volume total",
    mobile: "Volume mobile",
    mobileShare: "Part mobile (%)",
  }[metric];

  const metricOptions = period === "daily"
    ? [
        { value: "total", label: "Volume total" },
        { value: "mobile", label: "Volume mobile" },
        { value: "mobileShare", label: "Part mobile (%)" },
      ]
    : [{ value: "total", label: "Volume total" }];

  const exportVisibleSeries = () => {
    const rows = selectedSeriesWithTrend.map((row) => [
      row.period,
      Math.round(row.total),
      Math.round(row.mobile),
      row.mobileShare.toFixed(2),
      Math.round(row.trend),
    ]);
    csvDownload(
      `admin-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "period",
        `total_${displayCurrency.toLowerCase()}`,
        `mobile_${displayCurrency.toLowerCase()}`,
        "mobile_share_percent",
        "moving_avg_total",
      ],
      rows
    );
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 animate-spin" /> Chargement des statistiques...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Analytics 360</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Admin Analytics Pro</h1>
            <p className="mt-1 text-sm text-slate-500">
              Vision consolidee des volumes, canaux, pression AML et operations sensibles.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Derniere mise a jour: {lastUpdatedAt ? lastUpdatedAt.toLocaleString("fr-FR") : "-"}
            </p>
            <p className="mt-1 text-xs text-slate-400">Devise d'affichage: {displayCurrency}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${executive.riskTone}`}>
            <p className="text-xs uppercase tracking-wide">Niveau de risque global</p>
            <p className="mt-1 text-xl font-semibold">{executive.riskLevel}</p>
            <p className="text-xs">Score {numberFormatter.format(executive.riskScore)}/100</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm text-slate-700">
            Periode
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="daily">7 derniers jours</option>
              <option value="weekly">6 dernieres semaines</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Metrique
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Tri risques AML
            <select
              value={riskSort}
              onChange={(e) => setRiskSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="desc">Plus eleve d'abord</option>
              <option value="asc">Plus faible d'abord</option>
              <option value="alpha">Alphabetique</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Auto-refresh
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="off">Off</option>
              <option value="30">30 sec</option>
              <option value="60">60 sec</option>
              <option value="120">2 min</option>
            </select>
          </label>

          <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showMovingAverage}
              onChange={(e) => setShowMovingAverage(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Moyenne mobile
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Rafraichir
            </button>
            <button
              type="button"
              onClick={exportVisibleSeries}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = cardIconMap[card.key] || Activity;
          return (
            <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <span className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <Icon size={18} />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Tendance {chartMetricLabel} ({period === "daily" ? "7 jours" : "6 semaines"})
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Courbe principale du volume avec comparaison canal mobile et moyenne mobile.
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedSeriesWithTrend}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const formatAmount = (amount) =>
                      `${numberFormatter.format(toNumber(amount))} ${displayCurrency}`;
                    if (name === "Part mobile") return [formatPercent(value), name];
                    return [formatAmount(value), name];
                  }}
                  labelFormatter={(label) => `Periode: ${label}`}
                />
                <Legend />
                {metric === "mobileShare" ? (
                  <Line type="monotone" dataKey="mobileShare" name="Part mobile" stroke="#10b981" strokeWidth={2.5} />
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey={metric}
                      name={metric === "mobile" ? "Volume mobile" : "Volume total"}
                      stroke="#0f172a"
                      fill="url(#trendFill)"
                      strokeWidth={2.5}
                    />
                    {period === "daily" ? (
                      <Line
                        type="monotone"
                        dataKey="mobile"
                        name="Mobile money"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        dot={false}
                      />
                    ) : null}
                  </>
                )}
                {showMovingAverage ? (
                  <Line
                    type="monotone"
                    dataKey="trend"
                    name="Moyenne mobile (3)"
                    stroke="#f97316"
                    strokeDasharray="6 4"
                    dot={false}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Repartition AML</h2>
          <p className="mt-1 text-sm text-slate-500">Distribution des alertes par niveau de risque.</p>
          <div className="mt-4 h-72">
            {riskEntries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value, name) => [`${numberFormatter.format(value)} alertes`, name]} />
                  <Legend />
                  <Pie
                    data={riskEntries}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {riskEntries.map((entry) => (
                      <Cell key={entry.level} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Aucune alerte AML sur la fenetre courante.
              </div>
            )}
          </div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Total alertes: <strong>{numberFormatter.format(riskTotal)}</strong>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Comparatif par periode</h2>
          <p className="mt-1 text-sm text-slate-500">Comparaison segmentee de la metrique selectionnee.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedSeriesWithTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => {
                    const formatAmount = (amount) =>
                      `${numberFormatter.format(toNumber(amount))} ${displayCurrency}`;
                    return metric === "mobileShare" ? formatPercent(value) : formatAmount(value);
                  }}
                  labelFormatter={(label) => `Periode: ${label}`}
                />
                <Bar dataKey={metric} name={chartMetricLabel} fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Table detaillee</h2>
          <p className="mt-1 text-sm text-slate-500">Drill-down par date/semaine pour validation rapide.</p>
          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Periode</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Mobile</th>
                  <th className="px-3 py-2 text-right">Part mobile</th>
                </tr>
              </thead>
              <tbody>
                {selectedSeriesWithTrend.map((row) => (
                  <tr key={row.period} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className="px-3 py-2 text-right text-slate-900">
                      {`${numberFormatter.format(toNumber(row.total))} ${displayCurrency}`}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {period === "daily"
                        ? `${numberFormatter.format(toNumber(row.mobile))} ${displayCurrency}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {period === "daily" ? formatPercent(row.mobileShare) : "-"}
                    </td>
                  </tr>
                ))}
                {!selectedSeriesWithTrend.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Pas de donnees disponibles.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
