import { useMemo, useState } from "react";

const STATUSES = ["ALL", "FUNDED", "SWAPPED", "PAYOUT_PENDING", "PAID_OUT", "FAILED"];

export default function EscrowAuditPage() {
  const [status, setStatus] = useState("ALL");

  const query = useMemo(
    () => (status === "ALL" ? "" : `?status=${encodeURIComponent(status)}`),
    [status],
  );

  const csvHref = `/backoffice/escrow/audit/export.csv${query}`;
  const pdfHref = `/backoffice/escrow/audit/export.pdf${query}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Escrow</h1>
        <p className="text-slate-600">Exportez les operations escrow en CSV ou PDF.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-slate-700">Filtre statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

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
