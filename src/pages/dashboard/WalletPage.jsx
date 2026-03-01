import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WalletCard from "@/components/WalletCard";
import WalletHistoryTable from "@/components/wallet/WalletHistoryTable";
import api from "@/services/api";

const TABS = [
  { id: "fiat", label: "BIF / EUR" },
  { id: "usdc", label: "USDC" },
  { id: "usdt", label: "USDT" },
];

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
  const [activeTab, setActiveTab] = useState("fiat");
  const [showHistory, setShowHistory] = useState({
    fiat: false,
    usdc: false,
    usdt: false,
  });

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

  const activeToken = activeTab === "usdt" ? "USDT" : "USDC";
  const activeInstruction = depositInstructions[activeToken];
  const activeBalance =
    activeToken === "USDC"
      ? Number(cryptoBalances.USDC || usdcWallet?.balance || 0)
      : Number(cryptoBalances.USDT || 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mes wallets</h2>
            <p className="text-sm text-slate-500">
              Consultez un wallet a la fois avec ses actions et son historique dedie.
            </p>
          </div>
          <button
            onClick={loadWallet}
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            Rafraichir
          </button>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "fiat" ? (
          <div className="space-y-4">
            <WalletCard wallet={wallet} onRefresh={loadWallet} />
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard/client/withdraw/bif"
                className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
              >
                Retirer BIF
              </Link>
              <button
                onClick={() => setShowHistory((prev) => ({ ...prev, fiat: !prev.fiat }))}
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                {showHistory.fiat ? "Masquer historique BIF/EUR" : "Historique BIF/EUR"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm space-y-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Solde {activeToken}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {activeBalance.toFixed(6)} {activeToken}
                </p>
                {activeToken === "USDC" && usdcWallet?.account_code && (
                  <p className="mt-1 text-xs text-slate-500">Compte: {usdcWallet.account_code}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Adresse de depot {activeToken}
                </p>
                <span className="text-xs text-slate-500">Polygon</span>
              </div>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 break-all">
                {activeInstruction?.paylink_deposit_address || "Adresse PayLink non configuree"}
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={depositRequestAmounts[activeToken] || ""}
                  onChange={(e) =>
                    setDepositRequestAmounts((prev) => ({ ...prev, [activeToken]: e.target.value }))
                  }
                  placeholder={`Montant attendu ${activeToken} (optionnel)`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => createDepositRequest(activeToken)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
                >
                  Generer
                </button>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                {activeInstruction?.active_request ? (
                  <>
                    <p>Demande active: {activeInstruction.active_request.request_id}</p>
                    <p>
                      Montant attendu: {activeInstruction.active_request.expected_amount ?? "-"} {activeToken}
                    </p>
                    <p>Expire le: {activeInstruction.active_request.expires_at || "-"}</p>
                    <button
                      onClick={() => cancelDepositRequest(activeToken)}
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

            <div className="flex flex-wrap gap-2">
              {activeToken === "USDC" && (
                <Link
                  to="/dashboard/client/withdraw/usdc"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                >
                  Retirer USDC
                </Link>
              )}
              <Link
                to="/dashboard/client/crypto-pay"
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Crediter via CryptoPay
              </Link>
              <button
                onClick={() =>
                  setShowHistory((prev) => ({
                    ...prev,
                    [activeToken.toLowerCase()]: !prev[activeToken.toLowerCase()],
                  }))
                }
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                {showHistory[activeToken.toLowerCase()]
                  ? `Masquer historique ${activeToken}`
                  : `Historique ${activeToken}`}
              </button>
            </div>
          </div>
        )}
      </section>

      {showHistory.fiat && (
        <WalletHistoryTable
          walletId={wallet.wallet_id}
          currency={wallet.display_currency_code || wallet.currency_code}
        />
      )}
      {showHistory.usdc && (
        <WalletHistoryTable
          tokenSymbol="USDC"
          currency="USDC"
          title="Historique Wallet USDC"
        />
      )}
      {showHistory.usdt && (
        <WalletHistoryTable
          tokenSymbol="USDT"
          currency="USDT"
          title="Historique Wallet USDT"
        />
      )}
    </div>
  );
}
