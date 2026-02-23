import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

const API_URL = import.meta.env.VITE_API_URL || "";
const USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ESCROW_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

export default function CryptoPayPage() {
  const navigate = useNavigate();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [sandboxScenario, setSandboxScenario] = useState("NONE");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [account, setAccount] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [confirmations, setConfirmations] = useState(0);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask non detecte");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0] || null);
    } catch (err) {
      const message = err?.message || "Echec de connexion du wallet";
      alert(message);
    }
  };

  const payUSDC = async () => {
    if (!window.ethereum) return;

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const abi = ["function transfer(address to, uint256 amount) returns (bool)"];

      const contract = new ethers.Contract(USDC_ADDRESS, abi, signer);

      const amount = ethers.parseUnits("1000", 18);

      const tx = await contract.transfer(ESCROW_ADDRESS, amount);

      setTxHash(tx.hash);

      const receipt = await tx.wait();

      setConfirmations(receipt.confirmations);
    } catch (err) {
      const message = err?.message || "Echec du paiement USDC";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  async function submit() {
    setSubmitLoading(true);
    setError(null);

    try {
      const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
      const token =
        rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
      if (!token) {
        navigate("/auth");
        return;
      }
      const res = await fetch(`${API_URL}/escrow/orders`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
                "X-Access-Token": token,
              }
            : {}),
          "X-SANDBOX": sandbox ? "true" : "false",
          ...(sandbox && sandboxScenario !== "NONE"
            ? { "X-SANDBOX-SCENARIO": sandboxScenario }
            : {}),
        },
        body: JSON.stringify({
          amount_usdc: amountUsdc,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? JSON.stringify(data.detail)
              : null;
        throw new Error(detail || `Impossible de creer la transaction (${res.status})`);
      }

      const data = await res.json();
      navigate(`/app/crypto-pay/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Transfert crypto sécurisé (USDC)
        </h1>
        <p className="text-slate-600">
          Creez un paiement escrow USDC vers un beneficiaire local.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {!account ? (
          <button
            onClick={connectWallet}
            className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-600 transition"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Wallet connecte : {account}
          </div>
        )}
        {account && (
          <div>
            <button
              onClick={payUSDC}
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-600 transition"
            >
              {loading ? "Transaction en cours..." : "Payer 1000 USDC"}
            </button>

            {txHash && (
              <div className="mt-2 text-sm text-slate-700">
                Tx Hash : {txHash}
              </div>
            )}
            {confirmations > 0 && (
              <div className="mt-1 text-sm text-slate-700">
                Confirmations : {confirmations}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="amount_usdc" className="text-sm text-slate-700">
            Montant (USDC)
          </label>
          <input
            id="amount_usdc"
            type="number"
            min="0"
            step="0.01"
            placeholder="ex: 50"
            value={amountUsdc}
            onChange={(e) => setAmountUsdc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={sandbox}
            onChange={(e) => setSandbox(e.target.checked)}
          />
          Mode test (sandbox)
        </label>
        {sandbox && (
          <div className="space-y-1">
            <label
              htmlFor="sandbox_scenario"
              className="text-sm text-slate-700"
            >
              Scenario sandbox
            </label>
            <select
              id="sandbox_scenario"
              value={sandboxScenario}
              onChange={(e) => setSandboxScenario(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="NONE">Aucun</option>
              <option value="CONFIRMATION_DELAY">CONFIRMATION_DELAY</option>
              <option value="SWAP_FAILED">SWAP_FAILED</option>
              <option value="PAYOUT_BLOCKED">PAYOUT_BLOCKED</option>
              <option value="WEBHOOK_FAILED">WEBHOOK_FAILED</option>
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="recipient_name" className="text-sm text-slate-700">
            Nom du beneficiaire
          </label>
          <input
            id="recipient_name"
            type="text"
            placeholder="Nom complet"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="recipient_phone" className="text-sm text-slate-700">
            Telephone (Mobile Money)
          </label>
          <input
            id="recipient_phone"
            type="text"
            placeholder="+257..."
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={submitLoading}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60 hover:bg-slate-700 transition"
        >
          {submitLoading ? "Creation..." : "Continuer"}
        </button>
      </section>
    </div>
  );
}
