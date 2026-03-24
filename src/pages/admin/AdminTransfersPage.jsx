import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

function getAgeHours(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return 0;
  return (Date.now() - ms) / (60 * 60 * 1000);
}

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const userId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("user_id") || "";
  }, [location.search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (channel) params.set("channel", channel);
    if (userId) params.set("user_id", userId);
    return params.toString();
  }, [status, channel, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, transfersData] = await Promise.all([
        api.get("/admin/transfers/summary"),
        api.get(`/admin/transfers${queryString ? `?${queryString}` : ""}`),
      ]);
      setSummary(summaryData);
      setTransfers(Array.isArray(transfersData) ? transfersData : []);
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

  const staleTransfersCount = transfers.filter(
    (item) => ["pending", "initiated"].includes(String(item.status || "").toLowerCase()) && getAgeHours(item.created_at) >= 2
  ).length;
  const criticalTransfersCount = transfers.filter(
    (item) => ["pending", "initiated"].includes(String(item.status || "").toLowerCase()) && getAgeHours(item.created_at) >= 6
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            Transferts externes
          </h1>
          <p className="text-sm text-slate-500">
            Flux sortants (bank transfer, mobile money, etc.) avec suivi des statuts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
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
            className="rounded-lg border px-3 py-2 text-sm"
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Rafraichir
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={summary.total} accent="bg-slate-900 text-white" />
          <StatCard label="En attente" value={summary.pending} accent="bg-yellow-100 text-yellow-700" />
          <StatCard label="Reussis" value={summary.succeeded} accent="bg-emerald-100 text-emerald-700" />
          <StatCard label="Echecs" value={summary.failed} accent="bg-red-100 text-red-700" />
        </div>
      )}

      {summary?.pending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{summary.pending} transfert(s) en attente de validation</p>
              <p className="text-xs text-amber-800">
                Utilise la page de validations pour approuver les transferts pending avant execution.
              </p>
            </div>
            <Link
              to="/dashboard/admin/transfer-approvals"
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-white"
            >
              Ouvrir les validations
            </Link>
          </div>
        </div>
      ) : null}

      {(staleTransfersCount > 0 || criticalTransfersCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-4">
            <span>{staleTransfersCount} transfert(s) pending depuis plus de 2h</span>
            {criticalTransfersCount > 0 ? (
              <span className="font-semibold text-red-700">
                {criticalTransfersCount} transfert(s) pending depuis plus de 6h
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Initiateur</th>
              <th className="p-3 text-left">Reference</th>
              <th className="p-3 text-left">Transaction</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Montant local</th>
              <th className="p-3 text-left">Canal</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Creee</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Aucun transfert avec ces filtres.
                </td>
              </tr>
            ) : (
              transfers.map((tx) => (
                <tr key={tx.tx_id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{tx.initiator_name || "Inconnu"}</div>
                    <div className="text-xs text-slate-500">{tx.initiator_email}</div>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{tx.reference_code || "-"}</td>
                  <td className="p-3 font-mono text-slate-700">{tx.tx_id.slice(0, 10)}...</td>
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
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(tx.status)}>{tx.status}</span>
                      {["pending", "initiated"].includes(String(tx.status || "").toLowerCase()) && getAgeHours(tx.created_at) >= 6 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                          Urgent
                        </span>
                      ) : ["pending", "initiated"].includes(String(tx.status || "").toLowerCase()) && getAgeHours(tx.created_at) >= 2 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          Alerte
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
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
