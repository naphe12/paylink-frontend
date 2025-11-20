import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Loader2,
  Shield,
  Users,
} from "lucide-react";

const cardIconMap = {
  total_volume: Banknote,
  mobile_money_volume: Activity,
  active_agents: Users,
  aml_high: AlertTriangle,
  pending_external: Shield,
  active_tontines: Activity,
  sanctions_matches: Shield,
};

const formatAmount = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR")} BIF`;

export default function RiskMonitorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminPremiumAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message || "Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kpiCards = useMemo(() => {
    if (!data?.kpis) return [];
    return [
      {
        key: "total_volume",
        label: "Volume total",
        value: formatAmount(data.kpis.total_volume),
      },
      {
        key: "mobile_money_volume",
        label: "Volume Mobile Money",
        value: formatAmount(data.kpis.mobile_money_volume),
      },
      {
        key: "active_agents",
        label: "Agents actifs",
        value: data.kpis.active_agents,
      },
      {
        key: "aml_high",
        label: "Alertes AML (High+)",
        value: data.kpis.aml_high,
      },
      {
        key: "pending_external",
        label: "Transferts externes en attente",
        value: data.kpis.pending_external,
      },
      {
        key: "active_tontines",
        label: "Tontines actives",
        value: data.kpis.active_tontines,
      },
      {
        key: "sanctions_matches",
        label: "Matches sanctions",
        value: data.kpis.sanctions_matches,
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="animate-spin mr-2" /> Chargement des statistiques…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard Admin Premium
        </h1>
        <p className="text-sm text-slate-500">
          Vue consolidée des volumes PayLink, canaux mobiles et risques AML.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = cardIconMap[card.key] || Activity;
          return (
            <div
              key={card.key}
              className="rounded-2xl border bg-white px-4 py-4 flex items-center gap-4 shadow-sm"
            >
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Volume quotidien (7 derniers jours)"
          rows={data?.daily_volume || []}
          valueKey="total"
          secondaryKey="mobile"
        />
        <ChartCard
          title="Volume hebdomadaire (6 semaines)"
          rows={data?.weekly_volume || []}
          valueKey="total"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskCard breakdown={data?.risk_breakdown || {}} />
        <button
          onClick={load}
          className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:shadow-md transition flex items-center justify-between"
        >
          <div>
            <p className="text-xs uppercase text-slate-500">Mise à jour</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Rafraîchir les données
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Relance un chargement des métriques premium.
            </p>
          </div>
          <div className="p-3 rounded-full bg-slate-100 text-slate-600">
            <Loader2 size={18} />
          </div>
        </button>
      </div>
    </div>
  );
}

function ChartCard({ title, rows, valueKey, secondaryKey }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-500 shadow-sm">
        {title}
        <p className="text-sm mt-3">Pas de données disponibles.</p>
      </div>
    );
  }

  const maxValue = Math.max(...rows.map((r) => r[valueKey] || 0), 1);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.date || row.week} className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{row.date || row.week}</span>
              <span>{row[valueKey].toLocaleString()} BIF</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((row[valueKey] || 0) / maxValue) * 100
                  )}%`,
                }}
              />
            </div>
            {secondaryKey && (
              <div className="text-xs text-emerald-600">
                Mobile: {row[secondaryKey].toLocaleString()} BIF
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskCard({ breakdown }) {
  const entries = Object.entries(breakdown);
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <AlertTriangle size={18} /> Répartition AML
      </h3>
      {entries.length ? (
        <ul className="mt-4 space-y-2">
          {entries.map(([level, count]) => (
            <li
              key={level}
              className="flex items-center justify-between text-sm text-slate-700"
            >
              <span className="capitalize">{level}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 mt-3">
          Aucune alerte AML enregistrée.
        </p>
      )}
    </div>
  );
}
