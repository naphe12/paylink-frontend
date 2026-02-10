import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

const ORDER_STEPS = ["CREATED", "FUNDED", "SWAPPED", "PAYOUT_PENDING", "PAID_OUT"];

export default function CryptoPayStatusPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchOrder() {
      try {
        const res = await fetch(`/escrow/orders/${id}`, { credentials: "include" });
        if (!res.ok) {
          throw new Error("Impossible de charger la transaction");
        }
        const data = await res.json();
        if (mounted) {
          setOrder(data);
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
      const res = await fetch(`/escrow/orders/${id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Relance impossible");
      }
      const fresh = await fetch(`/escrow/orders/${id}`, { credentials: "include" });
      if (fresh.ok) {
        setOrder(await fresh.json());
      }
      alert("Paiement relance");
    } catch (err) {
      alert(err.message || "Erreur");
    } finally {
      setRetrying(false);
    }
  }

  const canRetry =
    order &&
    ["CREATED", "FUNDED"].includes(String(order.status)) &&
    String(order.status) !== "SWAPPED";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Suivi du paiement</h1>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {order.is_sandbox && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            MODE SANDBOX - AUCUN VRAI FOND
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
          {order.tx_hash && (
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

        <div className="h-px bg-slate-200" />

        <Timeline status={order.status} />
      </section>
    </div>
  );
}

function Timeline({ status }) {
  const steps = [
    { key: "CREATED", label: "Ordre cree" },
    { key: "FUNDED", label: "USDC recus" },
    { key: "SWAPPED", label: "Conversion effectuee" },
    { key: "PAYOUT_PENDING", label: "Paiement en cours" },
    { key: "PAID_OUT", label: "Paiement finalise" },
  ];

  return (
    <ul className="space-y-2">
      {steps.map((step) => {
        const active = isActive(status, step.key);
        return (
          <li key={step.key} className={active ? "text-green-700 font-medium" : "text-slate-400"}>
            {active ? "OK" : "O"} {step.label}
          </li>
        );
      })}
    </ul>
  );
}

function isActive(current, step) {
  return ORDER_STEPS.indexOf(current) >= ORDER_STEPS.indexOf(step);
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
