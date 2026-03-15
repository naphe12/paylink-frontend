import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Users, Wallet } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

export default function AdminFinancialSummaryPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id") || "";
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userId) {
      setError("Parametre user_id manquant.");
      setSummary(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminFinancialSummary(userId);
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err?.message || "Impossible de charger la situation financiere.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const cards = summary
    ? [
        {
          title: "Solde Portefeuille",
          icon: <Wallet size={18} />,
          value: `${Number(summary.wallet_available).toLocaleString()} ${summary.wallet_currency || ""}`.trim(),
          sub: summary.bonus_balance
            ? `Bonus: ${Number(summary.bonus_balance).toLocaleString()} ${summary.wallet_currency || ""}`.trim()
            : null,
        },
        {
          title: "Ligne de Credit",
          icon: <CreditCard size={18} />,
          value: `${Number(summary.credit_limit).toLocaleString()} EUR`,
          sub: `Disponible: ${Number(summary.credit_available).toLocaleString()} EUR | Utilise: ${Number(summary.credit_used).toLocaleString()} EUR`,
        },
        {
          title: "Tontines",
          icon: <Users size={18} />,
          value: `${summary.tontines_count} participation${summary.tontines_count > 1 ? "s" : ""}`,
          sub: null,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <div>
            <p className="text-sm text-slate-500">Vue admin</p>
            <h1 className="text-2xl font-bold text-slate-900">Situation financiere utilisateur</h1>
          </div>
        </div>
      </header>

      <ApiErrorAlert
        message={error}
        onRetry={load}
        retryLabel="Recharger"
      />
      {loading && <div className="text-slate-600">Chargement...</div>}

      {!loading && !error && summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.title}</p>
                <span className="text-slate-600">{card.icon}</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
              {card.sub && <p className="text-sm text-slate-500">{card.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
