import { useEffect, useState } from "react";
import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

export default function P2PAdminRisk() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/api/admin/p2p/risk");
      setStats(data || null);
    } catch (err) {
      setStats(null);
      setError(err?.message || "Impossible de charger le dashboard de risque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Chargement du dashboard risque...</div>;
  }

  if (error) {
    return <ApiErrorAlert error={error} onRetry={load} />;
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Risk Dashboard</h2>
        <p className="mt-3 text-sm text-slate-500">Aucune donnee disponible.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Risk Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Vue synthetique du risque P2P.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Rafraichir
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total trades</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total_trades ?? 0}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">High Risk (&gt;=80)</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{stats.high_risk_trades ?? 0}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Average risk score</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">
            {Number(stats.average_risk || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
