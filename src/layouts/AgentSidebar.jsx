import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  QrCode,
  ArrowLeftRight,
  Smartphone,
  Users,
  Send,
  LogOut,
  History,
  ShieldCheck,
  CheckCircle,
  Menu,
  X,
} from "lucide-react";

export default function AgentSidebar() {
  const navigate = useNavigate();
  const isAdmin = (localStorage.getItem("role") || "client").toLowerCase() === "admin";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const logout = () => {
    localStorage.clear();
    navigate("/auth", { replace: true });
    setDrawerOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
      isActive ? "bg-white text-teal-900 shadow-lg" : "text-white/80 hover:bg-white/10"
    }`;

  const SidebarContent = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Mode Agent</p>
        <h1 className="text-2xl font-semibold mt-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-lg">
            AG
          </span>
          PayLink OPS
        </h1>
        <p className="text-white/70 text-xs mt-2">Cash-in/out & opérations assistées.</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <NavLink to="dashboard" className={linkClass} end onClick={onNavigate}>
          <Users size={18} /> Tableau agent
        </NavLink>
        <NavLink to="operation" className={linkClass} onClick={onNavigate}>
          <ArrowLeftRight size={18} /> Opération client
        </NavLink>
        <NavLink to="cash-in" className={linkClass} onClick={onNavigate}>
          <Smartphone size={18} /> Cash-In direct
        </NavLink>
        <NavLink to="cash-out" className={linkClass} onClick={onNavigate}>
          <Smartphone size={18} /> Cash-Out direct
        </NavLink>
        <NavLink to="scan" className={linkClass} onClick={onNavigate}>
          <QrCode size={18} /> Scan QR client
        </NavLink>
        <NavLink to="external-transfer" className={linkClass} onClick={onNavigate}>
          <Send size={18} /> Transfert externe
        </NavLink>
        <NavLink to="history" className={linkClass} onClick={onNavigate}>
          <History size={18} /> Historique
        </NavLink>
        <NavLink to="transfers/close" className={linkClass} onClick={onNavigate}>
          <CheckCircle size={18} /> Transferts à clôturer
        </NavLink>

        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 px-2 mb-3">
              Console admin
            </p>
            <NavLink to="/dashboard/admin/users" className={linkClass} onClick={onNavigate}>
              <ShieldCheck size={18} /> Retour console
            </NavLink>
          </div>
        )}
      </nav>

      <div className="px-4 py-6 border-white/10 border-t">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition"
        >
          <LogOut size={18} /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-lg">
            AG
          </span>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Agent</p>
            <p className="font-semibold text-lg">PayLink OPS</p>
          </div>
        </div>
        <button aria-label="Ouvrir le menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={26} />
        </button>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute top-0 left-0 h-full w-72 bg-gradient-to-b from-teal-900 via-teal-800 to-slate-900 text-white shadow-2xl"
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
        className={`${
          sidebarVisible ? "hidden lg:flex" : "hidden"
        } w-64 bg-gradient-to-b from-teal-900 via-teal-800 to-slate-900 text-white flex-col`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col pt-16 lg:pt-0">
        <div className="hidden lg:flex justify-end px-4 pt-4">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setSidebarVisible((v) => !v)}
          >
            <Menu size={18} />
            {sidebarVisible ? "Masquer le menu" : "Afficher le menu"}
          </button>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
