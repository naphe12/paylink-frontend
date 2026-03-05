import { useMemo, useState } from "react";

const STATUSES = [
  "ALL",
  "CREATED",
  "FUNDED",
  "SWAPPED",
  "PAYOUT_PENDING",
  "PAID_OUT",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
  "FAILED",
];
const API_URL = import.meta.env.VITE_API_URL || "";

export default function EscrowAuditPage() {
  const [status, setStatus] = useState("ALL");
  const [minRisk, setMinRisk] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.append("status", status);
    if (minRisk !== "") params.append("min_risk", String(minRisk));
    if (createdFrom) params.append("created_from", new Date(`${createdFrom}T00:00:00`).toISOString());
    if (createdTo) params.append("created_to", new Date(`${createdTo}T23:59:59`).toISOString());
    const q = params.toString();
    return q ? `?${q}` : "";
  }, [status, minRisk, createdFrom, createdTo]);

  const csvHref = `${API_URL}/backoffice/escrow/audit/export.csv${query}`;
  const pdfHref = `${API_URL}/backoffice/escrow/audit/export.pdf${query}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Escrow</h1>
        <p className="text-slate-600">Exportez les operations escrow en CSV ou PDF.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block space-y-2">
            <span className="text-sm text-slate-700">Filtre statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-700">Risque min</span>
            <input
              type="number"
              min="0"
              max="100"
              value={minRisk}
              onChange={(e) => setMinRisk(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-700">Date debut</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-700">Date fin</span>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={csvHref}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 transition"
          >
            Export CSV
          </a>
          <a
            href={pdfHref}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100 transition"
          >
            Export PDF
          </a>
        </div>
      </section>
    </div>
  );
}
