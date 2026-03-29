import { useEffect, useState } from "react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

const SECTIONS = [
  { key: "proof_types", title: "Types de preuve", description: "Formats de preuve supportes pour refund et litiges." },
  {
    key: "escrow_refund_reason_codes",
    title: "Codes motif refund escrow",
    description: "Motifs admin/cashout qui expliquent la mise en refund.",
  },
  {
    key: "escrow_refund_resolution_codes",
    title: "Codes resolution refund escrow",
    description: "Issues standardisees apres revue du refund.",
  },
  {
    key: "p2p_dispute_reason_codes",
    title: "Codes motif litige P2P",
    description: "Motifs standards a l'ouverture d'un litige P2P.",
  },
  {
    key: "p2p_dispute_resolution_codes",
    title: "Codes resolution litige P2P",
    description: "Decisions admin/cases outcome pour la resolution des litiges P2P.",
  },
];

export default function AdminDisputeCodesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codes, setCodes] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.getAdminDisputeCodes();
      setCodes(payload && typeof payload === "object" ? payload : {});
    } catch (e) {
      setError(e?.message || "Impossible de charger les codes litiges.");
      setCodes({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Codes litiges et preuves</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reference admin des valeurs canoniques utilisees par les refunds escrow et les litiges P2P.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </header>

      <ApiErrorAlert message={error} onRetry={load} retryLabel="Recharger les codes" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const items = Array.isArray(codes?.[section.key]) ? codes[section.key] : [];
          return (
            <section key={section.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{section.description}</p>
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Aucun code charge.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.value} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="font-mono text-xs text-slate-700">{item.value}</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{item.label || item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
