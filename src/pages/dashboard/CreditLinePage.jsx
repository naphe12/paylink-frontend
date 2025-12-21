import { useEffect, useState } from "react";
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

export default function CreditLinePage() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCreditLineEvents({ limit: 100 });
      setSummary(data.summary);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de charger la ligne de crédit");
      setSummary(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatAmount = (v) =>
    Number(v || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ligne de crédit</h1>
          <p className="text-sm text-slate-500">
            Suivi du plafond, de l’utilisation et des événements.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Chargement..." : "Rafraîchir"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Montant initial"
            value={formatAmount(summary.initial_amount)}
            currency={summary.currency_code}
          />
          <StatCard
            label="Utilisé"
            value={formatAmount(summary.used_amount)}
            currency={summary.currency_code}
          />
          <StatCard
            label="Restant"
            value={formatAmount(summary.outstanding_amount)}
            currency={summary.currency_code}
          />
        </div>
      )}

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-800">Historique des événements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Δ Montant</th>
                <th className="p-3 text-left">Ancien plafond</th>
                <th className="p-3 text-left">Nouveau plafond</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    Aucun événement enregistré.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const delta = Number(ev.amount_delta || 0);
                  const isCredit = delta > 0;
                  return (
                    <tr key={ev.event_id} className="border-t">
                      <td className="p-3 text-slate-700">
                        {ev.occurred_at
                          ? new Date(ev.occurred_at).toLocaleString()
                          : ev.created_at
                          ? new Date(ev.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td
                        className={`p-3 font-semibold ${
                          isCredit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"} {formatAmount(Math.abs(delta))} {ev.currency_code}
                      </td>
                      <td className="p-3 text-slate-700">
                        {ev.old_limit != null ? formatAmount(ev.old_limit) : "-"}
                      </td>
                      <td className="p-3 text-slate-700">
                        {ev.new_limit != null ? formatAmount(ev.new_limit) : "-"}
                      </td>
                      <td className="p-3 text-slate-600">{ev.status || "-"}</td>
                      <td className="p-3 text-slate-600">{ev.source || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
