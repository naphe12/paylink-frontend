import { useState } from "react";
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
  LineChart,
  Menu,
  X,
  HandCoins,
  Shield,
} from "lucide-react";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const logout = () => {
    localStorage.clear();
    navigate("/auth", { replace: true });
    setDrawerOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
      isActive ? "bg-white/15 text-white shadow-lg shadow-black/10" : "text-slate-200 hover:bg-white/10"
    }`;

  const SidebarContent = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="text-xs tracking-[0.4em] uppercase text-slate-400">Console</p>
        <h1 className="text-2xl font-semibold mt-2 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500 text-base">
            PL
          </span>
          PayLink Admin
        </h1>
        <p className="text-slate-400 text-xs mt-2">Supervision temps-reel & conformite</p>
        <button
          onClick={logout}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2">Surveillance</p>
        <NavLink to="users" className={linkClass} onClick={onNavigate}>
          <Users size={18} /> Utilisateurs
        </NavLink>
        <NavLink to="agents" className={linkClass} onClick={onNavigate}>
          <Briefcase size={18} /> Agents
        </NavLink>
        <NavLink to="aml" className={linkClass} onClick={onNavigate}>
          <FileSearch size={18} /> Alertes AML
        </NavLink>
        <NavLink to="security" className={linkClass} onClick={onNavigate}>
          <ShieldAlert size={18} /> Securite live
        </NavLink>
        <NavLink to="webhooks" className={linkClass} onClick={onNavigate}>
          <ShieldCheck size={18} /> Logs webhooks
        </NavLink>
        <NavLink to="/backoffice/audit" className={linkClass} onClick={onNavigate}>
          <FileSearch size={18} /> 🧾 Audit Log
        </NavLink>
        <NavLink to="/backoffice/monitoring" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> 📊 Monitoring
        </NavLink>
        <NavLink to="risk" className={linkClass} onClick={onNavigate}>
          <ShieldAlert size={18} /> Risk monitoring
        </NavLink>
        <NavLink to="p2p/trades" className={linkClass} onClick={onNavigate}>
          <ArrowLeftRight size={18} /> P2P Monitoring
        </NavLink>
        <NavLink to="p2p/disputes" className={linkClass} onClick={onNavigate}>
          <FileSearch size={18} /> Disputes
        </NavLink>
        <NavLink to="p2p/risk" className={linkClass} onClick={onNavigate}>
          <ShieldAlert size={18} /> Risk / Flags
        </NavLink>

        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mt-6">Operations</p>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mt-4">Escrow</p>
        <NavLink to="escrow" className={linkClass} onClick={onNavigate}>
          <Coins size={18} /> File Escrow
        </NavLink>
        <NavLink to="escrow/audit" className={linkClass} onClick={onNavigate}>
          <ShieldCheck size={18} /> Audit Escrow
        </NavLink>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mt-4">Ledger</p>
        <NavLink to="ledger/balances" className={linkClass} onClick={onNavigate}>
          <Wallet size={18} /> Balances
        </NavLink>
        <NavLink to="ledger/t-accounts" className={linkClass} onClick={onNavigate}>
          <BookOpen size={18} /> T-Accounts
        </NavLink>

        <NavLink to="wallets" className={linkClass} onClick={onNavigate}>
          <Wallet size={18} /> Portefeuilles
        </NavLink>
        <NavLink to="loans" className={linkClass} onClick={onNavigate}>
          <CreditCard size={18} /> Credits
        </NavLink>
        <NavLink to="mobilemoney" className={linkClass} onClick={onNavigate}>
          <Wallet size={18} /> Mobile Money
        </NavLink>
        <NavLink to="transfers" className={linkClass} onClick={onNavigate}>
          <GitPullRequest size={18} /> Transferts externes
        </NavLink>
        <NavLink to="transfer-gains" className={linkClass} onClick={onNavigate}>
          <TrendingUp size={18} /> Gains transferts
        </NavLink>
        <NavLink to="balance-events" className={linkClass} onClick={onNavigate}>
          <LineChart size={18} /> Balances clients
        </NavLink>
        <NavLink to="transfer-approvals" className={linkClass} onClick={onNavigate}>
          <GitPullRequest size={18} /> Validations transferts
        </NavLink>
        <NavLink to="settings" className={linkClass} onClick={onNavigate}>
          <Settings size={18} /> Parametres
        </NavLink>
        <NavLink to="transactions-audit" className={linkClass} onClick={onNavigate}>
          <ShieldCheck size={18} /> Audit transactions
        </NavLink>
        <NavLink to="cash-requests" className={linkClass} onClick={onNavigate}>
          <Coins size={18} /> Cash in/out
        </NavLink>
        <NavLink to="payment-requests" className={linkClass} onClick={onNavigate}>
          <HandCoins size={18} /> Demandes de paiement
        </NavLink>
        <NavLink to="credit-history" className={linkClass} onClick={onNavigate}>
          <BookOpen size={18} /> Historique credits
        </NavLink>
        <NavLink to="credit-lines" className={linkClass} onClick={onNavigate}>
          <BookOpen size={18} /> Lignes de credit
        </NavLink>
        <NavLink to="credit-lines/repay" className={linkClass} onClick={onNavigate}>
          <BookOpen size={18} /> Remboursement credit
        </NavLink>
        <NavLink to="microfinance" className={linkClass} onClick={onNavigate}>
          <Shield size={18} /> Microfinance
        </NavLink>
        <NavLink to="loan-products" className={linkClass} onClick={onNavigate}>
          <BookOpen size={18} /> Produits pret
        </NavLink>
        <NavLink to="kyc/reviews" className={linkClass} onClick={onNavigate}>
          <UserCheck size={18} /> Verif KYC
        </NavLink>
        <NavLink to="analytics" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> Statistiques
        </NavLink>
        <NavLink to="tontines-dashboard" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> Dashboard tontines
        </NavLink>
        <NavLink to="tontines-arrears" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> Impayes tontines
        </NavLink>
        <NavLink to="tontines/create" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> Creer une tontine
        </NavLink>
        <NavLink to="tontines/members" className={linkClass} onClick={onNavigate}>
          <BarChart3 size={18} /> Membres tontines
        </NavLink>
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 px-2 mb-3">Mode Agent</p>
          <NavLink to="/dashboard/agent/dashboard" className={linkClass} onClick={onNavigate}>
            <ArrowLeftRight size={18} /> Hub agent
          </NavLink>
        </div>
      </nav>

      <div className="px-4 py-6 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-base">
            PL
          </span>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Console</p>
            <p className="font-semibold text-lg">PayLink Admin</p>
          </div>
        </div>
        <button aria-label="Ouvrir le menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={26} />
        </button>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-lg font-semibold">Navigation</span>
              <button aria-label="Fermer le menu" onClick={() => setDrawerOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <aside
        className={`${sidebarVisible ? "hidden lg:flex" : "hidden"} lg:fixed lg:inset-y-0 lg:left-0 w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex-col border-r border-white/5`}
      >
        <SidebarContent />
      </aside>

      <main className={`flex-1 flex flex-col pt-16 lg:pt-0 ${sidebarVisible ? "lg:ml-72" : ""}`}>
        <div className="hidden lg:flex justify-end px-4 pt-4">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setSidebarVisible((v) => !v)}
          >
            <Menu size={18} />
            {sidebarVisible ? "Masquer le menu" : "Afficher le menu"}
          </button>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50 rounded-t-3xl lg:rounded-none lg:rounded-l-3xl shadow-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
