import { useEffect, useState } from "react";
import api from "@/services/api";
import { Wallet, CreditCard, Users } from "lucide-react";

export default function FinancialSituationPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getFinancialSummary();
        setSummary(data);
      } catch (err) {
        setError("Impossible de charger la situation financière.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    {
      title: "Solde portefeuille",
      icon: <Wallet size={18} />,
      value:
        summary
          ? `${Number(summary.wallet_available).toLocaleString()} ${summary.wallet_currency || ""}`.trim()
          : "-",
      sub: summary?.bonus_balance
        ? `Bonus: ${Number(summary.bonus_balance).toLocaleString()} ${summary.wallet_currency || ""}`.trim()
        : null,
    },
    {
      title: "Ligne de crédit",
      icon: <CreditCard size={18} />,
      value: summary ? `${Number(summary.credit_limit).toLocaleString()} €` : "-",
      sub: summary
        ? `Disponible: ${Number(summary.credit_available).toLocaleString()} € | Utilisé: ${Number(summary.credit_used).toLocaleString()} €`
        : null,
    },
    {
      title: "Tontines",
      icon: <Users size={18} />,
      value: summary ? `${summary.tontines_count} participation${summary.tontines_count > 1 ? "s" : ""}` : "-",
      sub: null,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Vue synthétique de vos finances</p>
          <h1 className="text-2xl font-bold text-slate-900">Situation financière</h1>
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-slate-600">Chargement...</div>}

      {!loading && !error && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2"
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
