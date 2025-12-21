import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function AdminCreditLinesPage() {
  const [lines, setLines] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLines = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listAdminCreditLines(search ? { q: search } : {});
      setLines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur chargement lignes de crédit");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminCreditLineDetail(id);
      setDetail(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur chargement du détail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLines();
  }, []);

  const selectedLine = useMemo(
    () => lines.find((l) => l.credit_line_id === selectedId),
    [lines, selectedId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lignes de crédit</h1>
          <p className="text-sm text-slate-500">
            Sélectionnez un utilisateur pour voir le détail de sa ligne de crédit.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer nom/email"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={loadLines}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm"
            disabled={loading}
          >
            {loading ? "..." : "Chercher"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">
            Utilisateurs
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y">
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aucune ligne trouvée.</p>
            ) : (
              lines.map((line) => {
                const active = line.credit_line_id === selectedId;
                return (
                  <button
                    key={line.credit_line_id}
                    onClick={() => {
                      setSelectedId(line.credit_line_id);
                      loadDetail(line.credit_line_id);
                    }}
                    className={`w-full text-left p-3 transition ${
                      active ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {line.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-slate-500">{line.email}</p>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {line.credit_line_id.slice(0, 6)}…
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      Restant: {Number(line.outstanding_amount).toLocaleString()} {line.currency_code}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Montant initial"
                  value={detail.credit_line.initial_amount}
                  currency={detail.credit_line.currency_code}
                />
                <StatCard
                  label="Utilisé"
                  value={detail.credit_line.used_amount}
                  currency={detail.credit_line.currency_code}
                />
                <StatCard
                  label="Restant"
                  value={detail.credit_line.outstanding_amount}
                  currency={detail.credit_line.currency_code}
                />
              </div>

              <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <p className="text-sm font-semibold text-slate-800">Événements</p>
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
                      {detail.events.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            Aucun événement.
                          </td>
                        </tr>
                      ) : (
                        detail.events.map((ev) => {
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
                                {isCredit ? "+" : "-"}{" "}
                                {Math.abs(delta).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {ev.currency_code}
                              </td>
                              <td className="p-3 text-slate-700">
                                {ev.old_limit != null
                                  ? Number(ev.old_limit).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="p-3 text-slate-700">
                                {ev.new_limit != null
                                  ? Number(ev.new_limit).toLocaleString()
                                  : "-"}
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
          ) : (
            <div className="bg-white border rounded-2xl shadow-sm p-6 text-slate-600">
              Sélectionnez un utilisateur dans la liste pour voir le détail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, currency }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {Number(value || 0).toLocaleString()} {currency}
      </p>
    </div>
  );
}
