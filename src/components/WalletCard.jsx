import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Wallet, Star, Send } from "lucide-react";

export default function WalletCard({ wallet: walletProp = null, onRefresh }) {
  const [wallet, setWallet] = useState(walletProp);
  const [loading, setLoading] = useState(!walletProp);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    if (walletProp) {
      setWallet(walletProp);
      setLoading(false);
      return undefined;
    }

    const fetchWallet = async () => {
      setLoading(true);
      try {
        const data = await api.get("/wallet/");
        if (!cancelled) {
          setWallet(data);
        }
      } catch (err) {
        console.error("Erreur rÇ¸cupÇ¸ration portefeuille :", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchWallet();
    return () => {
      cancelled = true;
    };
  }, [walletProp]);

  if (loading) return <p>Chargement...</p>;
  if (!wallet) return <p>Portefeuille introuvable.</p>;

  const user = wallet.user || {};
  const currency = wallet.currency_code || wallet.currency || "";
  const displayCurrency =
    wallet.display_currency_code ||
    wallet.user_country_currency_code ||
    currency ||
    "";
  const currencySymbols = {
    EUR: "ƒ'ª",
    USD: "$",
    GBP: "¶œ",
    BIF: "FBu",
    XAF: "FCFA",
    XOF: "CFA",
    CAD: "C$",
    AUD: "AU$",
    RWF: "FRw",
  };
  const currencySymbol =
    currencySymbols[displayCurrency] || currencySymbols[currency] || displayCurrency || currency;
  const bonus = Number(wallet.bonus_balance || 0);
  let level = 1;
  if (bonus > 60000) level = 3;
  else if (bonus > 20000) level = 2;
  if (bonus > 150000) level = 4;
  const stars = "ƒ~.".repeat(level);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg border w-full max-w-lg text-center mx-auto">
      <div className="flex justify-center mb-3">
        <Wallet size={32} className="text-blue-600" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-[#0b3b64] mb-4">
        Mon Portefeuille ÐY'¬
      </h3>

      <p className="text-3xl sm:text-4xl font-bold text-[#0066ff] mb-6">
        {currencySymbol} {Number(wallet.available).toFixed(2)}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-xl py-3 px-3 sm:px-4 mb-4">
        <p className="text-sm text-gray-600">Solde Bonus</p>
        <p className="text-xl font-bold text-blue-700">
          {bonus.toLocaleString()} BIF
        </p>
        <p className="text-sm text-yellow-600 flex justify-center items-center gap-1 mt-1">
          <Star size={16} className="text-yellow-500" /> Niveau {level} {stars}
        </p>
      </div>

      <div className="p-3 bg-blue-50 border rounded-lg text-sm text-left sm:text-center">
        <p>
          Niveau KYC : <strong>{user.kyc_tier}</strong>
        </p>
        <p>
          Limite journaliÇùre : {user.daily_limit} {displayCurrency || currency}
        </p>
        <p>
          UtilisÇ¸ aujourd&apos;hui : {user.used_daily} {displayCurrency || currency}
        </p>

        {user.kyc_tier < 2 && (
          <button
            className="mt-2 w-full sm:w-auto px-3 py-2 bg-purple-600 text-white rounded-lg"
            onClick={() => navigate("/kyc/upgrade")}
          >
            ÐY"' Augmenter mon niveau KYC
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        * Le solde est mis Çÿ jour automatiquement aprÇùs chaque opÇ¸ration.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-3">
        <button
          className="w-full sm:flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2"
          onClick={() => navigate("/dashboard/client/transfer")}
        >
          <Send size={18} /> Envoyer
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-full sm:w-auto text-xs text-blue-600 underline"
          >
            RafraÇ©chir le solde
          </button>
        )}
      </div>
    </div>
  );
}
