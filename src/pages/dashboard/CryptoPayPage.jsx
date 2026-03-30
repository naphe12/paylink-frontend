import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

import { getAccessToken, suspendForAuthRedirect } from "@/services/authStore";

const API_URL = import.meta.env.VITE_API_URL || "";
const USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ESCROW_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const SANDBOX_SCENARIOS = [
  { value: "NONE", label: "Parcours nominal" },
  { value: "CONFIRMATION_DELAY", label: "Confirmation lente" },
  { value: "SWAP_FAILED", label: "Echec de conversion" },
  { value: "PAYOUT_BLOCKED", label: "Payout bloque" },
  { value: "WEBHOOK_FAILED", label: "Webhook manquant" },
];

export default function CryptoPayPage() {
  const navigate = useNavigate();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [showSandboxConfig, setShowSandboxConfig] = useState(false);
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
      alert(err?.message || "Echec de connexion du wallet");
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
      alert(err?.message || "Echec du paiement USDC");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setSubmitLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) return suspendForAuthRedirect("expired");

      const res = await fetch(`${API_URL}/escrow/orders`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Access-Token": token,
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

      if (res.status === 401 || res.status === 403) return suspendForAuthRedirect("expired");
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
      setError(err?.message || "Impossible de creer la transaction");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Paiement crypto securise en escrow</h1>
        <p className="text-slate-600">
          Creez un ordre escrow USDC, suivez la verification du depot, puis le paiement local du beneficiaire.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Comment cela fonctionne</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <InfoStep
            title="1. Depot USDC"
            text="Vous creez l'ordre puis vous envoyez les USDC vers l'adresse escrow attribuee."
          />
          <InfoStep
            title="2. Verification et traitement"
            text="Le systeme confirme le depot, prepare la conversion et orchestre le payout local."
          />
          <InfoStep
            title="3. Paiement du beneficiaire"
            text="Le beneficiaire recoit le paiement sur son numero mobile money."
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Types d&apos;escrow pris en charge</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <EscrowTypeCard
            title="Paiement local standard"
            tone="emerald"
            text="Depot USDC, verification, conversion et paiement local du beneficiaire."
          />
          <EscrowTypeCard
            title="Escrow en revue"
            tone="amber"
            text="Le dossier peut etre retenu pour verification, risque ou blocage operateur avant payout."
          />
          <EscrowTypeCard
            title="Escrow avec refund"
            tone="rose"
            text="Si le traitement echoue ou reste bloque, un parcours de remboursement peut etre enclenche."
          />
          <EscrowTypeCard
            title="Simulation QA"
            tone="slate"
            text="Mode de test interne pour simuler confirmations lentes, echec swap, payout bloque ou webhook manquant."
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Cette page sert au parcours client normal. Le mode sandbox est un outil de simulation QA et reste
          volontairement separe du flux principal.
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="amount_usdc" className="text-sm font-medium text-slate-700">
                Montant a deposer (USDC)
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

            <div className="space-y-1">
              <label htmlFor="recipient_name" className="text-sm font-medium text-slate-700">
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
              <label htmlFor="recipient_phone" className="text-sm font-medium text-slate-700">
                Numero du beneficiaire (Mobile Money)
              </label>
              <input
                id="recipient_phone"
                type="text"
                placeholder="+257..."
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p className="text-xs text-slate-500">
                Ce numero sert au paiement local final du beneficiaire. Ce n&apos;est pas un parametre technique
                de test.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Wallet et depot</h2>
            {!account ? (
              <button
                onClick={connectWallet}
                className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-600 transition"
              >
                Connecter le wallet
              </button>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 break-all">
                Wallet connecte : {account}
              </div>
            )}

            <p className="text-sm text-slate-600">
              Le bouton ci-dessous reste un raccourci de test local pour envoyer 1000 USDC au contrat escrow.
            </p>

            {account && (
              <div className="space-y-2">
                <button
                  onClick={payUSDC}
                  disabled={loading}
                  className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-60 hover:bg-emerald-600 transition"
                >
                  {loading ? "Transaction en cours..." : "Tester un paiement 1000 USDC"}
                </button>

                {txHash && <div className="text-sm text-slate-700 break-all">Tx Hash : {txHash}</div>}
                {confirmations > 0 && (
                  <div className="text-sm text-slate-700">Confirmations : {confirmations}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Simulation QA</h3>
              <p className="text-xs text-amber-800">
                A utiliser uniquement pour tester des cas internes. A ne pas activer pour un vrai paiement client.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSandboxConfig((current) => !current)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              {showSandboxConfig ? "Masquer" : "Afficher"}
            </button>
          </div>

          {showSandboxConfig && (
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={sandbox}
                  onChange={(e) => setSandbox(e.target.checked)}
                />
                Creer cet ordre en mode simulation
              </label>

              {sandbox && (
                <div className="space-y-2">
                  <label htmlFor="sandbox_scenario" className="text-sm font-medium text-amber-900">
                    Scenario de simulation
                  </label>
                  <select
                    id="sandbox_scenario"
                    value={sandboxScenario}
                    onChange={(e) => setSandboxScenario(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 px-3 py-2"
                  >
                    {SANDBOX_SCENARIOS.map((scenario) => (
                      <option key={scenario.value} value={scenario.value}>
                        {scenario.label}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
                    Les scenarios sandbox servent a simuler un retard de confirmation, un echec de conversion,
                    un blocage payout ou un webhook manquant.
                  </div>
                </div>
              )}
            </div>
          )}
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
          {submitLoading ? "Creation..." : "Creer l'ordre escrow"}
        </button>
      </section>
    </div>
  );
}

function InfoStep({ title, text }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <p className="mt-1 text-sm text-slate-700">{text}</p>
    </div>
  );
}

function EscrowTypeCard({ title, text, tone }) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.slate}`}>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-sm opacity-90">{text}</p>
    </div>
  );
}
