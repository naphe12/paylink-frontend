import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "pending":
    case "initiated":
      return `${base} bg-yellow-100 text-yellow-700`;
    case "failed":
    case "cancelled":
      return `${base} bg-red-100 text-red-700`;
    case "completed":
    case "succeeded":
      return `${base} bg-emerald-100 text-emerald-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
};

const STATUS_FILTERS = ["", "pending", "cancelled", "completed"];

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (channel) params.set("channel", channel);
    return params.toString();
  }, [status, channel]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, transfersData] = await Promise.all([
        api.get("/admin/transfers/summary"),
        api.get(`/admin/transfers${queryString ? `?${queryString}` : ""}`),
      ]);
      setSummary(summaryData);
      setTransfers(transfersData);
    } catch (err) {
      console.error("Erreur chargement transferts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryString]);

  const uniqueChannels = useMemo(() => {
    const set = new Set(transfers.map((t) => t.channel).filter(Boolean));
    return Array.from(set);
  }, [transfers]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Transferts externes
          </h1>
          <p className="text-sm text-slate-500">
            Flux sortants (bank transfer, mobile money, etc.) avec suivi des statuts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? `Statut : ${s}` : "Tous les statuts"}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">Tous les canaux</option>
            {uniqueChannels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={summary.total} accent="bg-slate-900 text-white" />
          <StatCard label="En attente" value={summary.pending} accent="bg-yellow-100 text-yellow-700" />
          <StatCard label="Réussis" value={summary.succeeded} accent="bg-emerald-100 text-emerald-700" />
          <StatCard label="Échecs" value={summary.failed} accent="bg-red-100 text-red-700" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Initiateur</th>
              <th className="p-3 text-left">Transaction</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Montant local</th>
              <th className="p-3 text-left">Canal</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Créée</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Aucun transfert avec ces filtres.
                </td>
              </tr>
            ) : (
              transfers.map((tx) => (
                <tr key={tx.tx_id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">
                      {tx.initiator_name || "Inconnu"}
                    </div>
                    <div className="text-xs text-slate-500">{tx.initiator_email}</div>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{tx.tx_id.slice(0, 10)}…</td>
                  <td className="p-3 font-semibold text-slate-900">
                    {Number(tx.amount || 0).toLocaleString()} {tx.currency}
                  </td>
                  <td className="p-3 text-slate-800">
                    {tx.local_amount != null
                      ? `${Number(tx.local_amount).toLocaleString()} ${tx.local_currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="p-3 text-slate-600">{tx.channel}</td>
                  <td className="p-3">
                    <span className={statusBadge(tx.status)}>{tx.status}</span>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
