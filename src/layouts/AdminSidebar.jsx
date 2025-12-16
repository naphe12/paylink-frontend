import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  FileSearch,
  BarChart3,
  LogOut,
  Wallet,
  GitPullRequest,
  UserCheck,
  Briefcase,
  CreditCard,
  Coins,
  BookOpen,
  ArrowLeftRight,
  ShieldCheck,
  TrendingUp,
  Settings,
} from "lucide-react";

export default function AdminSidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/auth", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
      isActive
        ? "bg-white/15 text-white shadow-lg shadow-black/10"
        : "text-slate-200 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <aside className="w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col border-r border-white/5">
        <div className="px-6 py-8 border-b border-white/10">
          <p className="text-xs tracking-[0.4em] uppercase text-slate-400">
            Console
          </p>
          <h1 className="text-2xl font-semibold mt-2 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500 text-base">
              PL
            </span>
            PayLink Admin
          </h1>
          <p className="text-slate-400 text-xs mt-2">
            Supervision temps-réel & conformité
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2">
            Surveillance
          </p>
          <NavLink to="users" className={linkClass}>
            <Users size={18} /> Utilisateurs
          </NavLink>
          <NavLink to="agents" className={linkClass}>
            <Briefcase size={18} /> Agents
          </NavLink>
          <NavLink to="aml" className={linkClass}>
            <FileSearch size={18} /> Alertes AML
          </NavLink>
          <NavLink to="security" className={linkClass}>
            <ShieldAlert size={18} /> Sécurité live
          </NavLink>

          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mt-6">
            Opérations
          </p>
          <NavLink to="wallets" className={linkClass}>
            <Wallet size={18} /> Portefeuilles
          </NavLink>
          <NavLink to="loans" className={linkClass}>
            <CreditCard size={18} /> Crédits
          </NavLink>
          <NavLink to="mobilemoney" className={linkClass}>
            <Wallet size={18} /> Mobile Money
          </NavLink>
          <NavLink to="transfers" className={linkClass}>
            <GitPullRequest size={18} /> Transferts externes
          </NavLink>
          <NavLink to="transfer-gains" className={linkClass}>
            <TrendingUp size={18} /> Gains transferts
          </NavLink>
          <NavLink to="transfer-approvals" className={linkClass}>
            <GitPullRequest size={18} /> Validations transferts
          </NavLink>
          <NavLink to="settings" className={linkClass}>
            <Settings size={18} /> Paramètres
          </NavLink>
          <NavLink to="transactions-audit" className={linkClass}>
            <ShieldCheck size={18} /> Audit transactions
          </NavLink>
          <NavLink to="cash-requests" className={linkClass}>
            <Coins size={18} /> Cash in/out
          </NavLink>
          <NavLink to="credit-history" className={linkClass}>
            <BookOpen size={18} /> Historique crédits
          </NavLink>
          <NavLink to="kyc/reviews" className={linkClass}>
            <UserCheck size={18} /> Vérif KYC
          </NavLink>
          <NavLink to="analytics" className={linkClass}>
            <BarChart3 size={18} /> Statistiques
          </NavLink>
          <NavLink to="tontines-dashboard" className={linkClass}>
            <BarChart3 size={18} /> Dashboard tontines
          </NavLink>
          <NavLink to="tontines-arrears" className={linkClass}>
            <BarChart3 size={18} /> Impayés tontines
          </NavLink>
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mb-3">
              Mode Agent
            </p>
            <NavLink to="/dashboard/agent/dashboard" className={linkClass}>
              <ArrowLeftRight size={18} /> Hub agent
            </NavLink>
          </div>
        </nav>

        <div className="px-4 py-6 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-slate-50 rounded-l-3xl shadow-inner">
        <Outlet />
      </main>
    </div>
  );
}
