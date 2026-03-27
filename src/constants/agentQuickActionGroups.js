import {
  ArrowLeftRight,
  BookOpen,
  Briefcase,
  CheckCircle,
  GraduationCap,
  History,
  QrCode,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

export const AGENT_QUICK_ACTION_GROUPS = [
  {
    key: "pilotage",
    title: "Pilotage agent",
    description: "Dashboard, historique et suivi.",
    icon: Users,
    className: "border-slate-200 bg-slate-50 hover:bg-white",
    actions: [
      { label: "Tableau agent", to: "/dashboard/agent/dashboard", icon: Users, description: "Vue generale agent" },
      { label: "Historique", to: "/dashboard/agent/history", icon: History, description: "Operations recentes" },
      { label: "Assignments payout", to: "/dashboard/agent/assignments", icon: CheckCircle, description: "Affectations de paiement" },
    ],
  },
  {
    key: "operations",
    title: "Operations terrain",
    description: "Parcours terrain et encaissement.",
    icon: ArrowLeftRight,
    className: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60",
    actions: [
      { label: "Operation client", to: "/dashboard/agent/operation", icon: ArrowLeftRight, description: "Flux assiste" },
      { label: "Cash-In direct", to: "/dashboard/agent/cash-in", icon: Smartphone, description: "Crediter un client" },
      { label: "Cash-Out direct", to: "/dashboard/agent/cash-out", icon: Smartphone, description: "Debiter un client" },
      { label: "Scan QR client", to: "/dashboard/agent/scan", icon: QrCode, description: "Encaissement rapide" },
      { label: "Transfert externe", to: "/dashboard/agent/external-transfer", icon: Send, description: "Assistance transfert" },
      { label: "Transferts a cloturer", to: "/dashboard/agent/transfers/close", icon: CheckCircle, description: "Finaliser les dossiers" },
    ],
  },
  {
    key: "assistants",
    title: "Assistants agent",
    description: "Onboarding et aide terrain.",
    icon: BookOpen,
    className: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100/60",
    actions: [
      { label: "Assistant onboarding", to: "/dashboard/agent/onboarding", icon: GraduationCap, description: "Onboarding client" },
      { label: "Guide assistants", to: "/dashboard/agent/assistants-guide", icon: BookOpen, description: "Guide d'utilisation" },
    ],
  },
  {
    key: "admin",
    title: "Console admin",
    description: "Retour a l'administration.",
    icon: ShieldCheck,
    className: "border-amber-200 bg-amber-50 hover:bg-amber-100/60",
    actions: [
      { label: "Retour console", to: "/dashboard/admin/users", icon: Briefcase, description: "Basculer vers l'admin" },
    ],
  },
];
