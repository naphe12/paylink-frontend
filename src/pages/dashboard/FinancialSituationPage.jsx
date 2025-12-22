import { useEffect, useState } from "react";
import api from "@/services/api";
import { Wallet, CreditCard, Users } from "lucide-react";

export default function FinancialSituationPage() {
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tontines, setTontines] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [walletData, profileData, tontinesData] = await Promise.all([
          api.get("/wallet"),
          api.get("/auth/me"),
          api.getTontines().catch(() => []),
        ]);
        setWallet(walletData);
        setProfile(profileData);
        setTontines(Array.isArray(tontinesData) ? tontinesData : []);
      } catch (err) {
        setError("Impossible de charger la situation financière.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const creditLimit = profile?.credit_limit ?? 0;
  const creditUsed = profile?.credit_used ?? 0;
  const creditAvailable = Math.max(0, creditLimit - creditUsed);

  const cards = [
    {
      title: "Solde portefeuille",
      icon: <Wallet size={18} />,
      value:
        wallet?.available !== undefined
          ? `${Number(wallet.available).toLocaleString()} ${wallet.currency_code || ""}`.trim()
          : "-",
      sub: wallet?.bonus_balance
        ? `Bonus: ${Number(wallet.bonus_balance).toLocaleString()} ${wallet.currency_code || ""}`.trim()
        : null,
    },
    {
      title: "Ligne de crédit",
      icon: <CreditCard size={18} />,
      value: `${Number(creditLimit).toLocaleString()} €`,
      sub: `Disponible: ${creditAvailable.toLocaleString()} € | Utilisé: ${creditUsed.toLocaleString()} €`,
    },
    {
      title: "Tontines",
      icon: <Users size={18} />,
      value: `${tontines.length} participation${tontines.length > 1 ? "s" : ""}`,
      sub:
        tontines.length > 0
          ? `Dernière: ${tontines[0]?.name || tontines[0]?.title || "N/A"}`
          : "Aucune pour le moment",
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

      {!loading && !error && (
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
