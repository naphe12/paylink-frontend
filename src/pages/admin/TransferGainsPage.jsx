import { useEffect, useState } from "react";
import { Wallet, TrendingUp, RefreshCw } from "lucide-react";
import api from "@/services/api";

const PERIODS = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

export default function TransferGainsPage() {
  const [period, setPeriod] = useState("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ charge_rate: 0, totals: {}, rows: [] });

  const load = async (nextPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminTransferGains(nextPeriod);
      setData(res || { charge_rate: 0, totals: {}, rows: [] });
    } catch (err) {
      setError(err.message || "Impossible de charger les gains.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPeriodChange = (key) => {
    setPeriod(key);
    load(key);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Gains
          </p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" /> Gains transferts / retraits
          </h1>
          <p className="text-sm text-slate-500">
            Calculé avec le taux charge = {Number(data.charge_rate || 0).toFixed(2)}%.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCw size={16} /> Rafraîchir
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={`rounded-full px-4 py-2 text-sm border ${
              period === p.key
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Gain total"
          value={`${Number(data?.totals?.gain || 0).toFixed(2)} €`}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Montant traité"
          value={`${Number(data?.totals?.amount || 0).toFixed(2)} €`}
          icon={<Wallet size={18} />}
          color="bg-indigo-100 text-indigo-700"
        />
        <StatCard
          label="Transactions"
          value={Number(data?.totals?.count || 0).toString()}
          icon={<TrendingUp size={18} />}
          color="bg-slate-100 text-slate-700"
        />
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Détail par jour et canal
          </h2>
          <p className="text-xs text-slate-400">
            Canaux: external_transfer, cash (retraits)
          </p>
        </div>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : (data?.rows || []).length === 0 ? (
          <p className="text-slate-500">Aucune donnée pour cette période.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Jour</th>
                  <th className="px-2 py-1">Canal</th>
                  <th className="px-2 py-1">Montant</th>
                  <th className="px-2 py-1">Gain</th>
                  <th className="px-2 py-1">Volume</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={`${row.day}-${row.channel}-${idx}`} className="border-b last:border-0">
                    <td className="px-2 py-2 text-slate-700">
                      {row.day ? new Date(row.day).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-800">
                      {row.channel}
                    </td>
                    <td className="px-2 py-2 font-semibold text-right">
                      {Number(row.amount || 0).toFixed(2)} €
                    </td>
                    <td className="px-2 py-2 font-semibold text-right text-emerald-700">
                      {Number(row.gain || 0).toFixed(2)} €
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
