// src/pages/WalletPage.jsx
import { useEffect, useState } from "react";
import WalletCard from "@/components/WalletCard";
import WalletHistoryTable from "@/components/wallet/WalletHistoryTable";
import api from "@/services/api";

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const data = await api.get("/wallet/");
      setWallet(data);
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
      <WalletCard wallet={wallet} onRefresh={loadWallet} />
      <WalletHistoryTable
        walletId={wallet.wallet_id}
        currency={wallet.display_currency_code || wallet.currency_code}
      />
    </div>
  );
}
