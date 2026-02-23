import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

const ORDER_STEPS = ["CREATED", "FUNDED", "SWAPPED", "PAYOUT_PENDING", "PAID_OUT"];
const API_URL = import.meta.env.VITE_API_URL || "";

export default function CryptoPayStatusPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [sandboxActionLoading, setSandboxActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchOrder() {
      try {
        const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
        const token =
          rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
        if (!token) {
          setError("Session expiree. Reconnectez-vous.");
          return;
        }
        const authHeaders = token
          ? {
              Authorization: `Bearer ${token}`,
              "X-Access-Token": token,
            }
          : {};
        const [orderRes, trackingRes] = await Promise.all([
          fetch(`${API_URL}/escrow/orders/${id}`, {
            credentials: "include",
            headers: authHeaders,
          }),
          fetch(`${API_URL}/escrow/orders/${id}/tracking`, {
            credentials: "include",
            headers: authHeaders,
          }),
        ]);
        if (!orderRes.ok) {
          throw new Error("Impossible de charger la transaction");
        }
        const data = await orderRes.json();
        const trackingData = trackingRes.ok ? await trackingRes.json() : null;
        if (mounted) {
          setOrder(data);
          setTracking(trackingData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const wsUrl = buildTrackingWsUrl(API_URL, id);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event !== "STATUS_UPDATE") return;
        setTracking(data);
        if (data.status) {
          setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => ws.close();
  }, [id]);

  useEffect(() => {
    if (typeof tracking?.eta_seconds === "number") {
      setEtaSeconds(tracking.eta_seconds);
      return;
    }
    setEtaSeconds(null);
  }, [tracking?.eta_seconds]);

  useEffect(() => {
    if (typeof etaSeconds !== "number" || etaSeconds <= 0) return undefined;
    const interval = setInterval(() => {
      setEtaSeconds((prev) => (typeof prev === "number" && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [etaSeconds]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!order) {
    return <p className="p-6">Chargement...</p>;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Adresse copiee");
  }

  async function retryPayment() {
    try {
      setRetrying(true);
      const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
      const token =
        rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
      if (!token) {
        throw new Error("Session expiree. Reconnectez-vous.");
      }
      const authHeaders = token
        ? {
            Authorization: `Bearer ${token}`,
            "X-Access-Token": token,
          }
        : {};
      const res = await fetch(`${API_URL}/escrow/orders/${id}/retry`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Relance impossible");
      }
      const [freshOrder, freshTracking] = await Promise.all([
        fetch(`${API_URL}/escrow/orders/${id}`, {
          credentials: "include",
          headers: authHeaders,
        }),
        fetch(`${API_URL}/escrow/orders/${id}/tracking`, {
          credentials: "include",
          headers: authHeaders,
        }),
      ]);
      if (freshOrder.ok) {
        setOrder(await freshOrder.json());
      }
      if (freshTracking.ok) {
        setTracking(await freshTracking.json());
      }
      alert("Paiement relance");
    } catch (err) {
      alert(err.message || "Erreur");
    } finally {
      setRetrying(false);
    }
  }

  async function runSandboxAction(action) {
    try {
      setSandboxActionLoading(true);
      const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
      const token =
        rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
      if (!token) {
        throw new Error("Session expiree. Reconnectez-vous.");
      }
      const authHeaders = token
        ? {
            Authorization: `Bearer ${token}`,
            "X-Access-Token": token,
          }
        : {};
      const res = await fetch(`${API_URL}/escrow/orders/${id}/sandbox/${action}`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Simulation impossible");
      }
      const [freshOrder, freshTracking] = await Promise.all([
        fetch(`${API_URL}/escrow/orders/${id}`, {
          credentials: "include",
          headers: authHeaders,
        }),
        fetch(`${API_URL}/escrow/orders/${id}/tracking`, {
          credentials: "include",
          headers: authHeaders,
        }),
      ]);
      if (freshOrder.ok) {
        setOrder(await freshOrder.json());
      }
      if (freshTracking.ok) {
        setTracking(await freshTracking.json());
      }
    } catch (err) {
      alert(err.message || "Erreur");
    } finally {
      setSandboxActionLoading(false);
    }
  }

  const canRetry =
    order &&
    ["CREATED", "FUNDED"].includes(String(order.status)) &&
    String(order.status) !== "SWAPPED";
  const status = String(order?.status || "");
  const canSandboxFund = order?.is_sandbox && status === "CREATED";
  const canSandboxSwap = order?.is_sandbox && status === "FUNDED";
  const canSandboxPayoutPending = order?.is_sandbox && status === "SWAPPED";
  const canSandboxPayout = order?.is_sandbox && status === "PAYOUT_PENDING";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Suivi du paiement</h1>
        {order.is_sandbox && (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Simulation
          </span>
        )}
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {order.is_sandbox && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            MODE SANDBOX - Aucune transaction reelle
          </p>
        )}
        {order.sandbox_scenario && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            Sandbox - scenario : {order.sandbox_scenario}
          </p>
        )}

        <p className="text-slate-700">
          <strong>Montant :</strong> {order.usdc_expected} USDC
        </p>
        <p className="text-slate-700">
          <strong>Equivalent cible :</strong> {order.bif_target} BIF
        </p>

        <div className="h-px bg-slate-200" />

        <h2 className="text-lg font-medium text-slate-900">Adresse de paiement USDC</h2>
        <div className="flex flex-wrap items-start gap-2">
          <code className="block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800 break-all">
            {order.deposit_address || "En attente d'attribution"}
          </code>
          {order.deposit_address && (
            <button
              onClick={() => copyToClipboard(order.deposit_address)}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Copier
            </button>
          )}
        </div>
        {order.deposit_address && (
          <div className="space-y-2">
            <h3 className="text-base font-medium text-slate-900">Scanner pour payer</h3>
            <QRCodeSVG
              value={`ethereum:${order.deposit_address}?amount=${order.amount_usdc || order.usdc_expected}&token=USDC`}
              size={180}
            />
            <p className="text-xs text-slate-500">
              Reseau : {order.network || "POLYGON"}
            </p>
          </div>
        )}

        <div className="h-px bg-slate-200" />

        <div className="space-y-2">
          <h3 className="text-base font-medium text-slate-900">Confirmations blockchain</h3>
          <p className="text-slate-700">
            {order.confirmations || 0} / {order.required_confirmations || 0} confirmations
          </p>
          <progress
            value={order.confirmations || 0}
            max={order.required_confirmations || 1}
            className="w-full"
          />
          {!order.is_sandbox && order.tx_hash && (
            <a
              href={buildExplorerTxUrl(order.network, order.tx_hash)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700 hover:underline"
            >
              Voir la transaction
            </a>
          )}
        </div>

        {typeof order.estimated_minutes_remaining === "number" && (
          <p className="text-sm text-slate-600">
            Temps estime restant : ~{order.estimated_minutes_remaining} min
          </p>
        )}

        {canRetry && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm text-amber-800">
              Le paiement n&apos;a pas encore ete detecte.
            </p>
            <button
              onClick={retryPayment}
              disabled={retrying}
              className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {retrying ? "Relance..." : "Relancer le paiement"}
            </button>
          </div>
        )}

        {order.is_sandbox && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm text-amber-800">
              Mode simulation: meme parcours utilisateur, transitions pilotees manuellement.
            </p>
            <div className="flex flex-wrap gap-2">
              {canSandboxFund && (
                <button
                  onClick={() => runSandboxAction("fund")}
                  disabled={sandboxActionLoading}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Simuler financement
                </button>
              )}
              {canSandboxSwap && (
                <button
                  onClick={() => runSandboxAction("swap")}
                  disabled={sandboxActionLoading}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Simuler conversion
                </button>
              )}
              {canSandboxPayoutPending && (
                <button
                  onClick={() => runSandboxAction("payout_pending")}
                  disabled={sandboxActionLoading}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Simuler paiement en cours
                </button>
              )}
              {canSandboxPayout && (
                <button
                  onClick={() => runSandboxAction("payout")}
                  disabled={sandboxActionLoading}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Simuler paiement finalise
                </button>
              )}
            </div>
          </div>
        )}

        <div className="h-px bg-slate-200" />

        <TrackingProgress status={order.status} tracking={tracking} etaSeconds={etaSeconds} />
        <Timeline status={order.status} tracking={tracking} />
      </section>
    </div>
  );
}

function TrackingProgress({ status, tracking, etaSeconds }) {
  const progress = getProgressValue(status, tracking);
  const etaText = formatEta(etaSeconds);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>Progression du paiement</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {etaText && <p className="text-sm text-slate-600">Temps estime restant : {etaText}</p>}
    </div>
  );
}

function Timeline({ status, tracking }) {
  const hasTracking = Array.isArray(tracking?.steps) && tracking.steps.length > 0;
  const steps = hasTracking
    ? tracking.steps.map((step) => ({
        key: step.code,
        label: step.label,
        completed: Boolean(step.completed),
        at: step.at,
      }))
    : [
        { key: "CREATED", label: "Ordre cree", completed: isActive(status, "CREATED"), at: null },
        { key: "FUNDED", label: "USDC recus", completed: isActive(status, "FUNDED"), at: null },
        { key: "SWAPPED", label: "Conversion effectuee", completed: isActive(status, "SWAPPED"), at: null },
        {
          key: "PAYOUT_PENDING",
          label: "Paiement en cours",
          completed: isActive(status, "PAYOUT_PENDING"),
          at: null,
        },
        { key: "PAID_OUT", label: "Paiement finalise", completed: isActive(status, "PAID_OUT"), at: null },
      ];

  return (
    <ul className="space-y-2">
      {steps.map((step) => {
        const active = Boolean(step.completed);
        const stepTime = formatStepTime(step.at);
        return (
          <li key={step.key} className={active ? "text-green-700 font-medium" : "text-slate-400"}>
            {active ? "OK" : "O"} {step.label}
            {stepTime && <span className="ml-2 text-xs text-slate-500">({stepTime})</span>}
          </li>
        );
      })}
    </ul>
  );
}

function isActive(current, step) {
  return ORDER_STEPS.indexOf(current) >= ORDER_STEPS.indexOf(step);
}

function formatStepTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR");
}

function buildExplorerTxUrl(network, txHash) {
  const net = String(network || "POLYGON").toUpperCase();
  const base =
    {
      POLYGON: "https://polygonscan.com/tx/",
      ETHEREUM: "https://etherscan.io/tx/",
      BSC: "https://bscscan.com/tx/",
      ARBITRUM: "https://arbiscan.io/tx/",
      OPTIMISM: "https://optimistic.etherscan.io/tx/",
      TRON: "https://tronscan.org/#/transaction/",
    }[net] || "https://polygonscan.com/tx/";
  return `${base}${txHash}`;
}

function buildTrackingWsUrl(apiBase, orderId) {
  const normalizedBase = String(apiBase || window.location.origin).replace(/\/+$/, "");
  const wsBase = normalizedBase.replace(/^http/i, "ws");
  return `${wsBase}/ws/escrow/${orderId}`;
}

function getProgressValue(status, tracking) {
  if (typeof tracking?.progress === "number") {
    return clampProgress(tracking.progress);
  }
  const fallbackMap = {
    CREATED: 10,
    FUNDED: 40,
    SWAPPED: 60,
    PAYOUT_PENDING: 80,
    PAID_OUT: 100,
  };
  return clampProgress(fallbackMap[String(status)] ?? 0);
}

function clampProgress(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function formatEta(seconds) {
  if (typeof seconds !== "number") return null;
  if (seconds <= 0) return "moins d'une minute";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}
