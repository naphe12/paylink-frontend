import { useMemo, useState } from "react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

const ESCROW_ACTIONS = ["FUND", "SWAP", "PAYOUT_PENDING", "PAYOUT", "FIAT_IN", "CRYPTO_RELEASE"];

export default function OnChainSimulatorPage() {
  const [tradeId, setTradeId] = useState("");
  const [escrowTxHash, setEscrowTxHash] = useState("");
  const [orderId, setOrderId] = useState("");
  const [escrowAction, setEscrowAction] = useState("FUND");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSimulateP2P = useMemo(() => tradeId.trim().length > 0, [tradeId]);
  const canSimulateEscrow = useMemo(() => orderId.trim().length > 0, [orderId]);

  const simulateP2P = async () => {
    if (!canSimulateP2P) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = escrowTxHash.trim() ? { escrow_tx_hash: escrowTxHash.trim() } : {};
      const res = await api.p2pSandboxCryptoLocked(tradeId.trim(), payload);
      setResult({
        scope: "P2P",
        action: "CRYPTO_LOCKED",
        data: res,
      });
    } catch (err) {
      setError(err?.message || "Simulation P2P impossible.");
    } finally {
      setLoading(false);
    }
  };

  const simulateEscrow = async () => {
    if (!canSimulateEscrow) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.escrowSandboxAction(orderId.trim(), escrowAction);
      setResult({
        scope: "Escrow",
        action: escrowAction,
        data: res,
      });
    } catch (err) {
      setError(err?.message || "Simulation escrow impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Simulation on-chain (Sandbox)</h1>
        <p className="text-sm text-slate-600">
          Outils admin pour simuler les etapes blockchain sans transfert reel.
        </p>
      </div>

      <ApiErrorAlert message={error} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">P2P: forcer CRYPTO_LOCKED</h2>
          <p className="text-xs text-slate-500">
            Endpoint: <span className="font-mono">POST /api/p2p/trades/{`{trade_id}`}/sandbox/crypto-locked</span>
          </p>
          <input
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
            placeholder="trade_id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={escrowTxHash}
            onChange={(e) => setEscrowTxHash(e.target.value)}
            placeholder="escrow_tx_hash (optionnel)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading || !canSimulateP2P}
            onClick={simulateP2P}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? "Execution..." : "Simuler P2P"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Escrow: transition sandbox</h2>
          <p className="text-xs text-slate-500">
            Endpoint: <span className="font-mono">POST /escrow/orders/{`{order_id}`}/sandbox/{`{action}`}</span>
          </p>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="order_id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={escrowAction}
            onChange={(e) => setEscrowAction(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ESCROW_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading || !canSimulateEscrow}
            onClick={simulateEscrow}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Execution..." : "Simuler Escrow"}
          </button>
        </section>
      </div>

      {result && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            OK - {result.scope} / {result.action}
          </p>
          <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
