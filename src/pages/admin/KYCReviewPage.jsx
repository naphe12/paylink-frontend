import { useEffect, useState } from "react";
import api from "@/services/api";

const summaryCards = [
  { key: "pending", label: "En attente", accent: "bg-yellow-100 text-yellow-700" },
  { key: "verified", label: "Validés", accent: "bg-emerald-100 text-emerald-700" },
  { key: "rejected", label: "Rejetés", accent: "bg-red-100 text-red-700" },
];

export default function KYCReviewPage() {
  const [kycList, setKycList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryData, pendingData] = await Promise.all([
        api.get("/admin/kyc/summary"),
        api.get("/admin/kyc/pending"),
      ]);
      setSummary(summaryData);
      setKycList(pendingData);
    } catch (err) {
      console.error("Erreur chargement KYC:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const validate = async (user_id) => {
    await api.post(`/admin/kyc/${user_id}/validate`);
    load();
  };

  const reject = async (user_id) => {
    const reason = prompt("Raison du rejet ?");
    if (!reason) return;
    await api.post(`/admin/kyc/${user_id}/reject`, { reason });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🧾 Vérification KYC</h1>
        <p className="text-sm text-slate-500">
          Examinez les documents fournis et valide/rejetez les demandes.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <div key={card.key} className={`rounded-xl border px-4 py-3 ${card.accent}`}>
              <p className="text-xs uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold">{summary[card.key]}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-500 py-10">Chargement…</div>
      ) : kycList.length === 0 ? (
        <div className="text-center text-slate-500 py-16 border rounded-xl bg-white">
          Aucune demande en attente.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {kycList.map((u) => (
            <div key={u.user_id} className="bg-white shadow rounded-xl p-5 border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{u.full_name}</h3>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {u.submitted_at ? new Date(u.submitted_at).toLocaleDateString() : "—"}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Pays: <span className="font-medium">{u.country || "NC"}</span>
              </p>
              <p className="text-sm text-slate-600">
                Pièce: <span className="font-medium">{u.kyc_document_type || "NC"}</span>
              </p>
              {u.national_id_number && (
                <p className="text-sm text-slate-600">#ID: {u.national_id_number}</p>
              )}

              <div className="mt-3 flex gap-2 overflow-auto">
                {u.document_front_url && (
                  <img
                    src={u.document_front_url}
                    alt="recto"
                    className="h-28 rounded-lg border object-cover"
                  />
                )}
                {u.document_back_url && (
                  <img
                    src={u.document_back_url}
                    alt="verso"
                    className="h-28 rounded-lg border object-cover"
                  />
                )}
                {u.selfie_url && (
                  <img
                    src={u.selfie_url}
                    alt="selfie"
                    className="h-28 rounded-lg border object-cover"
                  />
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  onClick={() => validate(u.user_id)}
                >
                  Valider
                </button>
                <button
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={() => reject(u.user_id)}
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
