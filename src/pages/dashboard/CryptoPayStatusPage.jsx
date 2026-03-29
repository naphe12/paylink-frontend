import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import { getAccessToken, suspendForAuthRedirect } from "@/services/authStore";

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
  const [showSandboxPanel, setShowSandboxPanel] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchOrder() {
      try {
        const token = getAccessToken();
        if (!token) return suspendForAuthRedirect("expired");

        const authHeaders = {
          Authorization: `Bearer ${token}`,
          "X-Access-Token": token,
        };

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

        if (
          orderRes.status === 401 ||
          orderRes.status === 403 ||
          trackingRes.status === 401 ||
          trackingRes.status === 403
        ) {
          return suspendForAuthRedirect("expired");
        }
        if (!orderRes.ok) throw new Error("Impossible de charger la transaction");

        const data = await orderRes.json();
        const trackingData = trackingRes.ok ? await trackingRes.json() : null;
        if (!mounted) return;
        setOrder(data);
        setTracking(trackingData);
        setError(null);
      } catch (err) {
        if (mounted) setError(err?.message || "Impossible de charger la transaction");
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
        // ignore malformed messages
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
      <div className="max-w-3xl mx-auto p-6">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!order) {
    return <p className="p-6">Chargement...</p>;
  }

  const status = String(order?.status || "");
  const canRetry = order && ["CREATED", "FUNDED"].includes(status) && status !== "SWAPPED";
  const canSandboxFund = order?.is_sandbox && status === "CREATED";
  const canSandboxSwap = order?.is_sandbox && status === "FUNDED";
  const canSandboxPayoutPending = order?.is_sandbox && status === "SWAPPED";
  const canSandboxPayout = order?.is_sandbox && status === "PAYOUT_PENDING";
  const dossierNature = getEscrowNature(order);

  const runSandboxAction = async (action) => {
    try {
      setSandboxActionLoading(true);
      const token = getAccessToken();
      if (!token) return suspendForAuthRedirect("expired");

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "X-Access-Token": token,
      };

      const res = await fetch(`${API_URL}/escrow/orders/${id}/sandbox/${action}`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      });
      if (res.status === 401 || res.status === 403) return suspendForAuthRedirect("expired");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Simulation impossible");
      }

      await refreshOrder(id, setOrder, setTracking);
    } catch (err) {
      alert(err?.message || "Erreur");
    } finally {
      setSandboxActionLoading(false);
    }
  };

  const retryPayment = async () => {
    try {
      setRetrying(true);
      const token = getAccessToken();
      if (!token) return suspendForAuthRedirect("expired");

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "X-Access-Token": token,
      };

      const res = await fetch(`${API_URL}/escrow/orders/${id}/retry`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
      });
      if (res.status === 401 || res.status === 403) return suspendForAuthRedirect("expired");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Relance impossible");
      }

      await refreshOrder(id, setOrder, setTracking);
      alert("Paiement relance");
    } catch (err) {
      alert(err?.message || "Erreur");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Suivi de l&apos;ordre escrow</h1>
          <p className="text-sm text-slate-600">
            Suivez votre depot USDC, la verification du flux et le paiement local du beneficiaire.
          </p>
        </div>
        {order.is_sandbox ? (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Mode simulation QA
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Ordre client
          </span>
        )}
      </header>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Ce que vous suivez ici</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Statut actuel" value={status || "-"} />
          <SummaryCard label="Nature du dossier" value={dossierNature.label} />
          <SummaryCard label="Depot attendu" value={`${order.usdc_expected} USDC`} />
          <SummaryCard label="Paiement local cible" value={`${order.bif_target} BIF`} />
          <SummaryCard label="Beneficiaire" value={order.payout_account_name || "En cours"} />
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm ${dossierNature.className}`}>
          {dossierNature.help}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        {order.is_sandbox && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Cet ordre est en simulation. Aucune transaction reelle n&apos;est executee. Les scenarios sandbox servent
            uniquement a la QA et aux demonstrations internes.
          </div>
        )}

        <TrackingProgress status={status} tracking={tracking} etaSeconds={etaSeconds} />
        <Timeline status={status} tracking={tracking} />

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Adresse de depot USDC</h2>
              <p className="text-sm text-slate-600">
                Envoyez les USDC vers cette adresse escrow. Une fois le depot confirme, le systeme poursuit le flux.
              </p>
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
                  <QRCodeSVG
                    value={`ethereum:${order.deposit_address}?amount=${order.amount_usdc || order.usdc_expected}&token=USDC`}
                    size={180}
                  />
                  <p className="text-xs text-slate-500">Reseau : {order.network || "POLYGON"}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Beneficiaire et payout</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Nom beneficiaire" value={order.payout_account_name || "-"} />
                <DetailRow label="Numero beneficiaire" value={order.payout_account_number || "-"} />
                <DetailRow label="Methode payout" value={order.payout_method || "Mobile Money"} />
                <DetailRow label="Reference payout" value={order.payout_reference || "-"} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Verification blockchain</h2>
              <p className="text-sm text-slate-700">
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
                  Voir la transaction on-chain
                </a>
              )}
            </div>

            {typeof order.estimated_minutes_remaining === "number" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Temps estime restant : ~{order.estimated_minutes_remaining} min
              </div>
            )}

            {canRetry && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm text-amber-800">
                  Le depot n&apos;a pas encore ete detecte. Vous pouvez relancer la verification.
                </p>
                <button
                  onClick={retryPayment}
                  disabled={retrying}
                  className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {retrying ? "Relance..." : "Relancer la verification"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {order.is_sandbox && (
        <section className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Simulation QA</h2>
              <p className="text-sm text-amber-800">
                Les boutons ci-dessous ne sont pas des actions client. Ils servent a faire avancer un scenario
                de test interne.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSandboxPanel((current) => !current)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              {showSandboxPanel ? "Masquer" : "Afficher"}
            </button>
          </div>

          {showSandboxPanel && (
            <div className="space-y-3">
              {order.sandbox_scenario && (
                <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
                  Scenario actif : {formatSandboxScenario(order.sandbox_scenario)}
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
                Scenarios typiques : confirmation lente, echec de conversion, payout bloque, webhook manquant.
              </div>
              <div className="flex flex-wrap gap-2">
                {canSandboxFund && (
                  <SandboxButton
                    loading={sandboxActionLoading}
                    onClick={() => runSandboxAction("fund")}
                    label="Simuler depot confirme"
                  />
                )}
                {canSandboxSwap && (
                  <SandboxButton
                    loading={sandboxActionLoading}
                    onClick={() => runSandboxAction("swap")}
                    label="Simuler conversion effectuee"
                  />
                )}
                {canSandboxPayoutPending && (
                  <SandboxButton
                    loading={sandboxActionLoading}
                    onClick={() => runSandboxAction("payout_pending")}
                    label="Simuler payout en cours"
                  />
                )}
                {canSandboxPayout && (
                  <SandboxButton
                    loading={sandboxActionLoading}
                    onClick={() => runSandboxAction("payout")}
                    label="Simuler payout finalise"
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

async function refreshOrder(id, setOrder, setTracking) {
  const token = getAccessToken();
  if (!token) return suspendForAuthRedirect("expired");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Access-Token": token,
  };

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

  if (freshOrder.ok) setOrder(await freshOrder.json());
  if (freshTracking.ok) setTracking(await freshTracking.json());
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Adresse copiee");
}

function TrackingProgress({ status, tracking, etaSeconds }) {
  const progress = getProgressValue(status, tracking);
  const etaText = formatEta(etaSeconds);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>Progression de l&apos;ordre</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
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
        { key: "FUNDED", label: "Depot USDC confirme", completed: isActive(status, "FUNDED"), at: null },
        { key: "SWAPPED", label: "Conversion effectuee", completed: isActive(status, "SWAPPED"), at: null },
        { key: "PAYOUT_PENDING", label: "Paiement local en cours", completed: isActive(status, "PAYOUT_PENDING"), at: null },
        { key: "PAID_OUT", label: "Paiement local finalise", completed: isActive(status, "PAID_OUT"), at: null },
      ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Timeline du traitement</h2>
      <ul className="space-y-2">
        {steps.map((step) => {
          const active = Boolean(step.completed);
          const stepTime = formatStepTime(step.at);
          return (
            <li key={step.key} className={active ? "text-emerald-700 font-medium" : "text-slate-400"}>
              {active ? "OK" : "O"} {step.label}
              {stepTime && <span className="ml-2 text-xs text-slate-500">({stepTime})</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900 break-all">{value}</div>
    </div>
  );
}

function SandboxButton({ onClick, loading, label }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function formatSandboxScenario(value) {
  return (
    {
      NONE: "Parcours nominal",
      CONFIRMATION_DELAY: "Confirmation lente",
      SWAP_FAILED: "Echec de conversion",
      PAYOUT_BLOCKED: "Payout bloque",
      WEBHOOK_FAILED: "Webhook manquant",
    }[String(value || "").toUpperCase()] || value
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
  if (typeof tracking?.progress === "number") return clampProgress(tracking.progress);
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
  return `${Math.ceil(seconds / 60)} min`;
}

function getEscrowNature(order) {
  const status = String(order?.status || "").toUpperCase();
  const flags = Array.isArray(order?.flags) ? order.flags.map((item) => String(item).toUpperCase()) : [];
  if (order?.is_sandbox) {
    return {
      label: "Simulation QA",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      help: "Ce dossier est une simulation interne. Les actions visibles servent a tester un scenario sandbox.",
    };
  }
  if (status === "REFUND_PENDING" || status === "REFUNDED") {
    return {
      label: "Refund",
      className: "border-rose-200 bg-rose-50 text-rose-800",
      help: "Le dossier est passe dans un parcours de remboursement suite a un blocage ou un echec de traitement.",
    };
  }
  if (flags.some((flag) => flag.includes("RISK")) || status === "PAYOUT_PENDING") {
    return {
      label: "Revue / blocage",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      help: "Le dossier peut necessiter une verification operateur avant paiement local final.",
    };
  }
  return {
    label: "Paiement local standard",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    help: "Parcours nominal : depot USDC confirme, traitement puis paiement local du beneficiaire.",
  };
}
