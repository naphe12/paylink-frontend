import {
  Activity,
  ArrowLeftRight,
  Bell,
  BookOpen,
  CreditCard,
  GitPullRequest,
  Scale,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";

export const ADMIN_QUICK_ACTIONS = [
  {
    label: "Utilisateurs",
    description: "Acces direct a la base client",
    to: "/dashboard/admin/users",
    icon: Users,
    className: "border-blue-200 bg-blue-50 hover:bg-blue-100/60",
  },
  {
    label: "Validation cash",
    description: "Depots et retraits a traiter",
    to: "/dashboard/admin/cash-requests",
    icon: Wallet,
    className: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100/60",
  },
  {
    label: "Transferts",
    description: "Vue generale des flux externes",
    to: "/dashboard/admin/transfers",
    icon: GitPullRequest,
    className: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60",
  },
  {
    label: "Approvals",
    description: "Transferts en attente de validation",
    to: "/dashboard/admin/transfer-approvals",
    icon: ShieldAlert,
    className: "border-amber-200 bg-amber-50 hover:bg-amber-100/60",
  },
  {
    label: "Lignes de credit",
    description: "Ajuster les capacites client",
    to: "/dashboard/admin/credit-lines",
    icon: CreditCard,
    className: "border-orange-200 bg-orange-50 hover:bg-orange-100/60",
  },
  {
    label: "Remboursement",
    description: "Rembourser les clients endettes",
    to: "/dashboard/admin/credit-lines/repay",
    icon: BookOpen,
    className: "border-lime-200 bg-lime-50 hover:bg-lime-100/60",
  },
  {
    label: "Risque P2P",
    description: "Tableau de risque des trades",
    to: "/dashboard/admin/p2p/risk",
    icon: ShieldAlert,
    className: "border-rose-200 bg-rose-50 hover:bg-rose-100/60",
  },
  {
    label: "Balance events",
    description: "Historique des variations de solde",
    to: "/dashboard/admin/balance-events",
    icon: Activity,
    className: "border-blue-200 bg-blue-50 hover:bg-blue-100/60",
  },
  {
    label: "Notifications",
    description: "Centre d'alertes admin",
    to: "/dashboard/admin/notifications",
    icon: Bell,
    className: "border-slate-200 bg-slate-50 hover:bg-white",
  },
  {
    label: "Escrow",
    description: "Suivi des dossiers escrow",
    to: "/dashboard/admin/escrow",
    icon: Wallet,
    className: "border-violet-200 bg-violet-50 hover:bg-violet-100/60",
  },
  {
    label: "P2P disputes",
    description: "Gestion des litiges P2P",
    to: "/dashboard/admin/p2p/disputes",
    icon: Scale,
    className: "border-red-200 bg-red-50 hover:bg-red-100/60",
  },
  {
    label: "Ops dashboard",
    description: "Monitoring technique et operations",
    to: "/dashboard/admin/ops-dashboard",
    icon: Activity,
    className: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60",
  },
];

export function getAdminQuickActions() {
  return ADMIN_QUICK_ACTIONS;
}
