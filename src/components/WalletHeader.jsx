import { useEffect, useState } from "react";
import api from "@/services/api";
import { ShieldCheck, AlertTriangle, Plus, Lock } from "lucide-react";

export default function WalletHeader({ onTopUp }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = async () => {
    try {
      const data = await api.get("/wallet/");
      setWallet(data);
    } catch (err) {
      console.error("Erreur récupération Wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  if (loading || !wallet) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        Chargement du portefeuille...
      </div>
    );
  }

  const { available, bonus_balance, kyc_status, risk_score, status } = wallet;

  const isFrozen = status === "frozen";

  return (
    <div className="bg-white shadow-md p-5 rounded-xl border border-gray-200">
      {/* Solde principal */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600 text-sm">Solde Disponible</p>
          <p className="text-3xl font-bold text-green-600">
            {Number(available).toLocaleString()} BIF
          </p>
        </div>

        {/* Recharge */}
        <button
          disabled={isFrozen}
          onClick={onTopUp}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
            isFrozen
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Plus size={18} /> Recharger
        </button>
      </div>

      {/* Bonus */}
      <div className="mt-2 text-sm text-purple-700 font-medium">
        Bonus : {Number(bonus_balance).toLocaleString()} BIF 🎁
      </div>

      {/* Bloc d'alertes */}
      <div className="mt-4 space-y-2">
        {kyc_status !== "verified" && (
          <div className="flex items-center gap-2 bg-yellow-100 border border-yellow-300 p-2 rounded">
            <AlertTriangle className="text-yellow-600" size={18} />
            <span className="text-sm text-yellow-700">
              Votre identité n’est pas vérifiée.
              <b>Limites d’envoi réduites.</b>
            </span>
          </div>
        )}

        {risk_score >= 50 && risk_score < 80 && (
          <div className="flex items-center gap-2 bg-orange-100 border border-orange-300 p-2 rounded">
            <AlertTriangle className="text-orange-600" size={18} />
            <span className="text-sm text-orange-700">
              Activité inhabituelle détectée — Votre compte est en surveillance.
            </span>
          </div>
        )}

        {isFrozen && (
          <div className="flex items-center gap-2 bg-red-100 border border-red-300 p-2 rounded">
            <Lock className="text-red-600" size={18} />
            <span className="text-sm text-red-700 font-semibold">
              ⚠️ Votre compte est temporairement gelé. Contactez le support pour
              vérification.
            </span>
          </div>
        )}
      </div>

      {/* Statut KYC */}
      <div className="flex items-center gap-1 mt-3 text-sm text-gray-600">
        <ShieldCheck size={16} />
        Vérification d'identité :{" "}
        <span className="font-semibold">{kyc_status}</span>
      </div>
    </div>
  );
}
