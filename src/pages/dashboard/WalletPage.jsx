// src/pages/WalletPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletCard from "@/components/WalletCard";
import WalletHistoryTable from "@/components/wallet/WalletHistoryTable";
import api from "@/services/api";

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [usdcWallet, setUsdcWallet] = useState(null);
  const [cryptoBalances, setCryptoBalances] = useState({ USDC: 0, USDT: 0 });
  const [depositInstructions, setDepositInstructions] = useState({
    USDC: null,
    USDT: null,
  });
  const [depositRequestAmounts, setDepositRequestAmounts] = useState({ USDC: "", USDT: "" });
  const [loading, setLoading] = useState(true);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const [fiatWallet, usdc, balances, usdcInstruction, usdtInstruction] = await Promise.all([
        api.get("/wallet/"),
        api.getUsdcWallet().catch(() => null),
        api.getCryptoWalletBalances().catch(() => ({ balances: { USDC: 0, USDT: 0 } })),
        api.getCryptoDepositInstructions("USDC").catch(() => null),
        api.getCryptoDepositInstructions("USDT").catch(() => null),
      ]);
      setWallet(fiatWallet);
      setUsdcWallet(usdc);
      setCryptoBalances(balances?.balances || { USDC: 0, USDT: 0 });
      setDepositInstructions({
        USDC: usdcInstruction,
        USDT: usdtInstruction,
      });
    } catch (err) {
      console.error("Erreur chargement wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  const createDepositRequest = async (tokenSymbol) => {
    const rawAmount = depositRequestAmounts[tokenSymbol]?.trim();
    try {
      await api.createCryptoDepositRequest({
        token_symbol: tokenSymbol,
        network: "POLYGON",
        expected_amount: rawAmount ? Number(rawAmount) : undefined,
      });
      await loadWallet();
    } catch (err) {
      console.error(`Erreur creation demande depot ${tokenSymbol}:`, err);
    }
  };

  const cancelDepositRequest = async (tokenSymbol) => {
    const requestId = depositInstructions[tokenSymbol]?.active_request?.request_id;
    if (!requestId) return;
    try {
      await api.cancelCryptoDepositRequest(requestId);
      await loadWallet();
    } catch (err) {
      console.error(`Erreur annulation demande depot ${tokenSymbol}:`, err);
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
              <h3 className="text-lg font-semibold text-slate-800">Wallet Crypto</h3>
              <p className="text-sm text-slate-500">
                Creez une demande de depot, envoyez les fonds a l'adresse PayLink, puis le watcher credite votre wallet interne.
              </p>
            </div>
            <button
              onClick={loadWallet}
              className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Solde USDC</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Number(cryptoBalances.USDC || usdcWallet?.balance || 0).toFixed(6)} USDC
              </p>
              {usdcWallet?.account_code && (
                <p className="mt-1 text-xs text-slate-500">Compte: {usdcWallet.account_code}</p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Solde USDT</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Number(cryptoBalances.USDT || 0).toFixed(6)} USDT
              </p>
            </div>
          </div>

          {["USDC", "USDT"].map((tokenSymbol) => (
            <div
              key={tokenSymbol}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Adresse de depot {tokenSymbol}
                </p>
                <span className="text-xs text-slate-500">Polygon</span>
              </div>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 break-all">
                {depositInstructions[tokenSymbol]?.paylink_deposit_address || "Adresse PayLink non configuree"}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={depositRequestAmounts[tokenSymbol] || ""}
                  onChange={(e) =>
                    setDepositRequestAmounts((prev) => ({ ...prev, [tokenSymbol]: e.target.value }))
                  }
                  placeholder={`Montant attendu ${tokenSymbol} (optionnel)`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => createDepositRequest(tokenSymbol)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  Generer
                </button>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                {depositInstructions[tokenSymbol]?.active_request ? (
                  <>
                    <p>
                      Demande active: {depositInstructions[tokenSymbol].active_request.request_id}
                    </p>
                    <p>
                      Montant attendu: {depositInstructions[tokenSymbol].active_request.expected_amount ?? "-"} {tokenSymbol}
                    </p>
                    <p>
                      Expire le: {depositInstructions[tokenSymbol].active_request.expires_at || "-"}
                    </p>
                    <button
                      onClick={() => cancelDepositRequest(tokenSymbol)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
                    >
                      Annuler la demande
                    </button>
                  </>
                ) : (
                  <p>Aucune demande active pour le moment.</p>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard/client/withdraw/bif"
              className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
            >
              Retirer BIF
            </Link>
            <Link
              to="/dashboard/client/withdraw/usdc"
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <WalletHistoryTable
          tokenSymbol="USDC"
          currency="USDC"
          title="Historique Wallet USDC"
        />
        <WalletHistoryTable
          tokenSymbol="USDT"
          currency="USDT"
          title="Historique Wallet USDT"
        />
      </div>
    </div>
  );
}
