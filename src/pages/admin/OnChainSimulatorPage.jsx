import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import ApiErrorAlert from "@/components/ApiErrorAlert";

const ESCROW_ACTIONS = ["FUND", "SWAP", "PAYOUT_PENDING", "PAYOUT", "FIAT_IN", "CRYPTO_RELEASE"];
const ESCROW_STATUSES = ["ALL", "CREATED", "FUNDED", "SWAPPED", "PAYOUT_PENDING", "PAID_OUT", "FAILED", "CANCELLED"];
const P2P_CANDIDATE_STATUSES = new Set(["AWAITING_CRYPTO", "EXPIRED"]);
const ESCROW_ACTION_TO_STATUS = {
  FUND: "CREATED",
  SWAP: "FUNDED",
  PAYOUT_PENDING: "SWAPPED",
  PAYOUT: "PAYOUT_PENDING",
  FIAT_IN: "SWAPPED",
  CRYPTO_RELEASE: "PAYOUT_PENDING",
};

const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const fmtAmount = (value, code = "") => {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })}${code ? ` ${code}` : ""}`;
};

const extractOrderFlags = (order) => {
  const raw = order?.flags;
  if (Array.isArray(raw)) {
    const normalized = raw.map((v) => String(v || "").trim()).filter(Boolean);
    // Some backends accidentally serialize postgres text[] as list(string),
    // producing an array of chars like ["{","S","A",...].
    if (normalized.length > 2 && normalized.every((v) => v.length <= 1)) {
      const joined = normalized.join("");
      return joined
        .replace(/^\{/, "")
        .replace(/\}$/, "")
        .split(",")
        .map((v) => String(v || "").trim().replace(/^"+|"+$/g, ""))
        .filter(Boolean);
    }
    return normalized.map((v) => v.replace(/^"+|"+$/g, ""));
  }
  if (typeof raw === "string") {
    return raw
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .split(",")
      .map((v) => String(v || "").trim().replace(/^"+|"+$/g, ""))
      .filter(Boolean);
  }
  return [];
};

const getOrderId = (order) => String(order?.id || order?.order_id || "");

const isSandboxOrder = (order) => {
  if (!order || typeof order !== "object") return false;
  if (order.is_sandbox === true) return true;
  const flags = extractOrderFlags(order);
  return flags.some((f) => String(f || "").toUpperCase() === "SANDBOX");
};

export default function OnChainSimulatorPage() {
  const [tradeId, setTradeId] = useState("");
  const [escrowTxHash, setEscrowTxHash] = useState("");
  const [orderId, setOrderId] = useState("");
  const [escrowAction, setEscrowAction] = useState("FUND");
  const [escrowStatusFilter, setEscrowStatusFilter] = useState("ALL");
  const [webhookOrderId, setWebhookOrderId] = useState("");
  const [webhookAmount, setWebhookAmount] = useState("10");
  const [webhookConfirmations, setWebhookConfirmations] = useState("3");
  const [webhookTxHash, setWebhookTxHash] = useState("");
  const [webhookFromAddress, setWebhookFromAddress] = useState("");
  const [p2pCandidates, setP2pCandidates] = useState([]);
  const [escrowCandidates, setEscrowCandidates] = useState([]);
  const [escrowCandidatesFallbackAll, setEscrowCandidatesFallbackAll] = useState(false);
  const [escrowReloadTick, setEscrowReloadTick] = useState(0);
  const [selectedEscrowDetail, setSelectedEscrowDetail] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [candidateLoadError, setCandidateLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSimulateP2P = useMemo(() => tradeId.trim().length > 0, [tradeId]);
  const canSimulateEscrow = useMemo(() => orderId.trim().length > 0, [orderId]);
  const canSimulateWebhook = useMemo(
    () => webhookOrderId.trim().length > 0 && Number(webhookAmount) > 0,
    [webhookAmount, webhookOrderId]
  );
  const escrowStatusHint = ESCROW_ACTION_TO_STATUS[escrowAction];

  useEffect(() => {
    const mapped = ESCROW_ACTION_TO_STATUS[escrowAction];
    if (mapped && escrowStatusFilter === "ALL") {
      setEscrowStatusFilter(mapped);
    }
  }, [escrowAction, escrowStatusFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadP2PCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const rows = await api.get("/admin/p2p/trades");
        const list = (Array.isArray(rows) ? rows : []).filter((item) =>
          P2P_CANDIDATE_STATUSES.has(String(item?.status || "").toUpperCase())
        );
        if (!cancelled) {
          setP2pCandidates(list);
          if (list[0]?.trade_id) {
            setTradeId((prev) => (prev.trim() ? prev : String(list[0].trade_id)));
          }
        }
      } catch {
        if (!cancelled) setP2pCandidates([]);
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    };

    loadP2PCandidates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadEscrowCandidates = async () => {
      setLoadingCandidates(true);
      setCandidateLoadError("");
      try {
        const normalizeRows = (payload) => {
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.items)) return payload.items;
          return [];
        };
        const buildStatusQuery = (statusValue) => {
          if (!statusValue || statusValue === "ALL") return "";
          return `?status=${encodeURIComponent(statusValue)}`;
        };
        const loadByStatus = async (statusValue) => {
          const rows = await api.get(`/backoffice/escrow/orders${buildStatusQuery(statusValue)}`);
          return normalizeRows(rows).filter(isSandboxOrder);
        };

        let list = await loadByStatus(escrowStatusFilter);
        let usedFallbackAll = false;
        if (list.length === 0 && escrowStatusFilter !== "ALL") {
          list = await loadByStatus("ALL");
          usedFallbackAll = true;
        }
        if (cancelled) return;

        setEscrowCandidates(list);
        setEscrowCandidatesFallbackAll(usedFallbackAll);
        if (list.length === 0) {
          setSelectedEscrowDetail(null);
          return;
        }
        setOrderId((prev) => {
          const current = prev.trim();
          if (current && list.some((item) => getOrderId(item) === current)) {
            return prev;
          }
          return getOrderId(list[0]);
        });
      } catch (err) {
        if (!cancelled) {
          setEscrowCandidates([]);
          setEscrowCandidatesFallbackAll(false);
          setSelectedEscrowDetail(null);
          setCandidateLoadError(err?.message || "Chargement des orders impossible.");
        }
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    };

    loadEscrowCandidates();
    return () => {
      cancelled = true;
    };
  }, [escrowStatusFilter, escrowReloadTick]);

  useEffect(() => {
    let cancelled = false;
    const currentOrderId = orderId.trim();
    if (!currentOrderId) {
      setSelectedEscrowDetail(null);
      return undefined;
    }

    const loadOrderDetail = async () => {
      setLoadingOrderDetail(true);
      try {
        let detail = null;
        try {
          detail = await api.get(`/backoffice/escrow/orders/${currentOrderId}`);
        } catch {
          detail = await api.get(`/escrow/orders/${currentOrderId}`);
        }
        if (!cancelled) setSelectedEscrowDetail(detail);
      } catch {
        if (!cancelled) setSelectedEscrowDetail(null);
      } finally {
        if (!cancelled) setLoadingOrderDetail(false);
      }
    };

    loadOrderDetail();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

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
      const nextStatus = String(res?.escrow_status || "").toUpperCase();
      if (nextStatus && ESCROW_STATUSES.includes(nextStatus)) {
        setEscrowStatusFilter(nextStatus);
      }
      if (res?.id) {
        setOrderId(String(res.id));
      }
      // Force reload candidates even when status is unchanged.
      setEscrowReloadTick((v) => v + 1);
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

  const simulateUsdcWebhook = async () => {
    if (!canSimulateWebhook) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        order_id: webhookOrderId.trim(),
        amount: Number(webhookAmount),
        confirmations: Number(webhookConfirmations || 0),
        tx_hash: webhookTxHash.trim() || undefined,
        from_address: webhookFromAddress.trim() || undefined,
      };
      const res = await api.escrowSandboxUsdcWebhook(payload);
      setResult({
        scope: "Escrow Webhook",
        action: "USDC_DEPOSIT",
        data: res,
      });
    } catch (err) {
      setError(err?.message || "Simulation webhook USDC impossible.");
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">P2P: forcer CRYPTO_LOCKED</h2>
          <p className="text-xs text-slate-500">
            Endpoint: <span className="font-mono">POST /api/p2p/trades/{`{trade_id}`}/sandbox/crypto-locked</span>
          </p>
          <select
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selectionner un trade candidat...</option>
            {p2pCandidates.map((t) => (
              <option key={t.trade_id} value={t.trade_id}>
                {t.trade_id} - {t.status} - {t.token_amount} {t.token || ""}
              </option>
            ))}
          </select>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <select
              value={escrowStatusFilter}
              onChange={(e) => setEscrowStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {ESCROW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            Statut attendu pour l'action {escrowAction}: <span className="font-semibold">{escrowStatusHint || "-"}</span>
          </p>
          {escrowCandidatesFallbackAll && (
            <p className="text-[11px] text-amber-600">
              Aucun order sandbox sur le statut {escrowStatusFilter}; affichage de tous les statuts.
            </p>
          )}
          {candidateLoadError && (
            <p className="text-[11px] text-rose-600">{candidateLoadError}</p>
          )}
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">
              {loadingCandidates ? "Chargement des orders..." : "Selectionner un order sandbox candidat..."}
            </option>
            {escrowCandidates.map((o) => {
              const oid = getOrderId(o);
              return (
              <option key={oid} value={oid}>
                {oid} - {o.status}
              </option>
            );
            })}
          </select>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="order_id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading || !canSimulateEscrow}
            onClick={simulateEscrow}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Execution..." : "Simuler Escrow"}
          </button>

          {orderId.trim() && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Detail order selectionne</p>
              {loadingOrderDetail && <p>Chargement detail...</p>}
              {!loadingOrderDetail && selectedEscrowDetail && (
                <>
                  <p><b>ID:</b> <span className="font-mono">{selectedEscrowDetail.id || orderId}</span></p>
                  <p><b>Status:</b> {selectedEscrowDetail.status || "-"}</p>
                  <p><b>Sandbox:</b> {isSandboxOrder(selectedEscrowDetail) ? "Oui" : "Non"}</p>
                  <p><b>User:</b> <span className="font-mono">{selectedEscrowDetail.user_id || "-"}</span></p>
                  <p><b>Trader:</b> <span className="font-mono">{selectedEscrowDetail.trader_id || "-"}</span></p>
                  <p><b>USDC attendu/recu:</b> {fmtAmount(selectedEscrowDetail.usdc_expected, "USDC")} / {fmtAmount(selectedEscrowDetail.usdc_received, "USDC")}</p>
                  <p><b>USDT cible/recu:</b> {fmtAmount(selectedEscrowDetail.usdt_target, "USDT")} / {fmtAmount(selectedEscrowDetail.usdt_received, "USDT")}</p>
                  <p><b>BIF cible/paye:</b> {fmtAmount(selectedEscrowDetail.bif_target, "BIF")} / {fmtAmount(selectedEscrowDetail.bif_paid, "BIF")}</p>
                  <p><b>Created:</b> {fmtDate(selectedEscrowDetail.created_at)}</p>
                  <p><b>Updated:</b> {fmtDate(selectedEscrowDetail.updated_at)}</p>
                  <p><b>Flags:</b> {Array.isArray(selectedEscrowDetail.flags) && selectedEscrowDetail.flags.length ? selectedEscrowDetail.flags.join(", ") : "-"}</p>
                </>
              )}
              {!loadingOrderDetail && !selectedEscrowDetail && (
                <p>Detail indisponible pour cet order_id.</p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Escrow: simuler webhook USDC</h2>
          <p className="text-xs text-slate-500">
            Endpoint: <span className="font-mono">POST /backoffice/webhooks/sandbox/usdc</span>
          </p>
          <input
            value={webhookOrderId}
            onChange={(e) => setWebhookOrderId(e.target.value)}
            placeholder="order_id (sandbox)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={webhookAmount}
              onChange={(e) => setWebhookAmount(e.target.value)}
              type="number"
              min="0"
              step="0.000001"
              placeholder="amount"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={webhookConfirmations}
              onChange={(e) => setWebhookConfirmations(e.target.value)}
              type="number"
              min="0"
              step="1"
              placeholder="confirmations"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={webhookTxHash}
            onChange={(e) => setWebhookTxHash(e.target.value)}
            placeholder="tx_hash (optionnel)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={webhookFromAddress}
            onChange={(e) => setWebhookFromAddress(e.target.value)}
            placeholder="from_address (optionnel)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading || !canSimulateWebhook}
            onClick={simulateUsdcWebhook}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Execution..." : "Simuler webhook USDC"}
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
