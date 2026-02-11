import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function CryptoPayPage() {
  const navigate = useNavigate();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [sandboxScenario, setSandboxScenario] = useState("NONE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      if (!token) {
        navigate("/auth");
        return;
      }
      const res = await fetch(`${API_URL}/escrow/orders`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Payer en crypto (USDC)</h1>
        <p className="text-slate-600">
          Creez un paiement escrow USDC vers un beneficiaire local.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
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
            <label htmlFor="sandbox_scenario" className="text-sm text-slate-700">
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
          disabled={loading}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60 hover:bg-slate-700 transition"
        >
          {loading ? "Creation..." : "Continuer"}
        </button>
      </section>
    </div>
  );
}
