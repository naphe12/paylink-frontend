// src/pages/WalletPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletCard from "@/components/WalletCard";
import WalletHistoryTable from "@/components/wallet/WalletHistoryTable";
import api from "@/services/api";

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [usdcWallet, setUsdcWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const [fiatWallet, usdc] = await Promise.all([
        api.get("/wallet/"),
        api.getUsdcWallet().catch(() => null),
      ]);
      setWallet(fiatWallet);
      setUsdcWallet(usdc);
    } catch (err) {
      console.error("Erreur chargement wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  if (loading) {
    return <p className="p-4">Chargement du portefeuille...</p>;
  }

  if (!wallet) {
    return <p className="p-4 text-red-500">Portefeuille introuvable.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <WalletCard wallet={wallet} onRefresh={loadWallet} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 h-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Wallet USDC</h3>
              <p className="text-sm text-slate-500">
                Solde on-ledger utilise pour conversion et retraits externes.
              </p>
            </div>
            <button
              onClick={loadWallet}
              className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Solde USDC</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {usdcWallet ? Number(usdcWallet.balance || 0).toFixed(6) : "0.000000"} USDC
            </p>
            {usdcWallet?.account_code && (
              <p className="mt-1 text-xs text-slate-500">Compte: {usdcWallet.account_code}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard/client/withdraw-usdc"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Retirer USDC
            </Link>
            <Link
              to="/dashboard/client/crypto-pay"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Crediter via CryptoPay
            </Link>
          </div>
        </section>
      </div>
      <WalletHistoryTable
        walletId={wallet.wallet_id}
        currency={wallet.display_currency_code || wallet.currency_code}
      />
    </div>
  );
}
