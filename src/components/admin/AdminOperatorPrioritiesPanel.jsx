import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Coins, HandCoins, ShieldAlert } from "lucide-react";

import api from "@/services/api";
import { isOlderThanHours } from "@/utils/opsSla";

function priorityTone(level) {
  if (level === "critical") return "border-rose-200 bg-rose-50 text-rose-900";
  if (level === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function priorityPill(level) {
  if (level === "critical") return "bg-rose-600 text-white";
  if (level === "warning") return "bg-amber-500 text-black";
  return "bg-emerald-600 text-white";
}

export default function AdminOperatorPrioritiesPanel() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [escrowOrders, disputes, paymentIntents] = await Promise.all([
          api.get("/backoffice/escrow/orders").catch(() => []),
          api.get("/api/admin/p2p/disputes").catch(() => []),
          api.getAdminPaymentIntents({ limit: 100 }).catch(() => []),
        ]);

        if (!active) return;

        const escrowList = Array.isArray(escrowOrders) ? escrowOrders : [];
        const disputeList = Array.isArray(disputes) ? disputes : [];
        const paymentList = Array.isArray(paymentIntents) ? paymentIntents : [];

        const refundPending = escrowList.filter(
          (item) => String(item.status || "").toUpperCase() === "REFUND_PENDING"
        ).length;
        const payoutPending = escrowList.filter(
          (item) => String(item.status || "").toUpperCase() === "PAYOUT_PENDING"
        ).length;
        const highRiskEscrow = escrowList.filter((item) => Number(item.risk_score || 0) >= 80).length;
        const staleEscrow = escrowList.filter((item) => {
          const status = String(item.status || "").toUpperCase();
          return ["REFUND_PENDING", "PAYOUT_PENDING"].includes(status) && isOlderThanHours(item.updated_at || item.created_at, 6);
        }).length;
        const openDisputes = disputeList.filter((item) =>
          ["OPEN", "UNDER_REVIEW"].includes(String(item.status || "").toUpperCase())
        ).length;
        const staleDisputes = disputeList.filter((item) => {
          const status = String(item.status || "").toUpperCase();
          return ["OPEN", "UNDER_REVIEW"].includes(status) && isOlderThanHours(item.updated_at || item.created_at, 12);
        }).length;
        const actionablePayments = paymentList.filter(
          (item) => !["credited", "cancelled"].includes(String(item.status || "").toLowerCase())
        ).length;
        const stalePayments = paymentList.filter((item) => {
          const status = String(item.status || "").toLowerCase();
          return ["pending_provider", "settled", "failed"].includes(status) && isOlderThanHours(item.updated_at || item.created_at, 2);
        }).length;

        setItems([
          {
            key: "refunds",
            title: "Refund escrow",
            count: refundPending,
            detail: "Dossiers refund a traiter",
            to: "/dashboard/admin/escrow?queue=refund_pending",
            icon: Coins,
            level: refundPending > 0 ? "critical" : "ok",
          },
          {
            key: "payouts",
            title: "Payout escrow",
            count: payoutPending,
            detail: "Payouts en attente de validation",
            to: "/dashboard/admin/escrow?queue=payout_pending",
            icon: Coins,
            level: payoutPending > 0 ? "warning" : "ok",
          },
          {
            key: "disputes",
            title: "Litiges P2P",
            count: openDisputes,
            detail: "Litiges a arbitrer",
            to: "/dashboard/admin/p2p/disputes?queue=to_review",
            icon: ShieldAlert,
            level: openDisputes > 0 ? "critical" : "ok",
          },
          {
            key: "stale-disputes",
            title: "Litiges stale",
            count: staleDisputes,
            detail: "Ouverts depuis >= 12h",
            to: "/dashboard/admin/p2p/disputes?queue=stale",
            icon: ShieldAlert,
            level: staleDisputes > 0 ? "critical" : "ok",
          },
          {
            key: "payments",
            title: "Paiements BIF",
            count: actionablePayments,
            detail: "Intents a suivre ou reprendre",
            to: "/dashboard/admin/payment-intents?queue=actionable",
            icon: HandCoins,
            level: actionablePayments > 0 ? "warning" : "ok",
          },
          {
            key: "stale-payments",
            title: "Paiements stale",
            count: stalePayments,
            detail: "Bloques depuis >= 2h",
            to: "/dashboard/admin/payment-intents?queue=stale",
            icon: HandCoins,
            level: stalePayments > 0 ? "warning" : "ok",
          },
          {
            key: "high-risk",
            title: "Escrow risque eleve",
            count: highRiskEscrow,
            detail: "Ordres >= 80 de score risque",
            to: "/dashboard/admin/escrow?queue=high_risk",
            icon: AlertTriangle,
            level: highRiskEscrow > 0 ? "critical" : "ok",
          },
          {
            key: "stale-escrow",
            title: "Escrow stale",
            count: staleEscrow,
            detail: "Refund/payout >= 6h",
            to: "/dashboard/admin/escrow?queue=stale",
            icon: Coins,
            level: staleEscrow > 0 ? "critical" : "ok",
          },
        ]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.count || 0), 0),
    [items]
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Priorites operateur</h2>
          <p className="text-sm text-slate-500">
            Acces direct aux files critiques du backoffice.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {loading ? "Chargement..." : `${summary} element(s) sous surveillance`}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`rounded-2xl border p-4 transition hover:shadow-sm ${priorityTone(item.level)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70">
                  <Icon size={18} />
                </span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priorityPill(item.level)}`}>
                  {item.level === "critical" ? "Critique" : item.level === "warning" ? "Attention" : "OK"}
                </span>
              </div>
              <div className="mt-4 text-3xl font-semibold">{loading ? "..." : item.count}</div>
              <div className="mt-1 text-sm font-medium">{item.title}</div>
              <div className="mt-1 text-xs opacity-80">{item.detail}</div>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">
                Ouvrir la file <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
