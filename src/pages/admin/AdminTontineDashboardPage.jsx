import { useEffect, useState } from "react";
import api from "@/services/api";
import { Loader2, PieChart } from "lucide-react";

export default function AdminTontineDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminTontineAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement du dashboard tontines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Tontines
          </h1>
          <p className="text-sm text-slate-500">
            Contributions totales, état des tontines et pot global.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2"
        >
          <PieChart size={16} />
          Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Contributions totales"
          value={`${data.total_contributions.toLocaleString()} BIF`}
        />
        <KpiCard
          label="Tontines actives"
          value={`${data.active_tontines} / ${data.total_tontines}`}
        />
        <KpiCard
          label="Tontines inactives"
          value={data.inactive_tontines}
        />
        <KpiCard
          label="Pot global"
          value={`${data.global_pot.toLocaleString()} BIF`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Répartition des statuts
          </h2>
          {Object.keys(data.status_breakdown).length ? (
            <ul className="space-y-2 text-sm">
              {Object.entries(data.status_breakdown).map(([status, count]) => (
                <li
                  key={status}
                  className="flex justify-between text-slate-700 capitalize"
                >
                  <span>{status}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucune donnée.</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Contributions sur 7 jours
          </h2>
          {data.daily_contributions.length ? (
            <div className="space-y-3">
              {data.daily_contributions.map((entry) => (
                <div key={entry.date}>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{entry.date}</span>
                    <span>{entry.amount.toLocaleString()} BIF</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full bg-slate-900"
                      style={{
                        width: `${Math.min(
                          100,
                          (entry.amount /
                            Math.max(
                              ...data.daily_contributions.map((d) => d.amount),
                              1
                            )) *
                            100
                        ).toFixed(2)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Pas de contributions sur la période.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
