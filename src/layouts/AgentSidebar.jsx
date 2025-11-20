import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  QrCode,
  ArrowLeftRight,
  Smartphone,
  Users,
  LogOut,
  History,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export default function AgentSidebar() {
  const navigate = useNavigate();
  const isAdmin = (localStorage.getItem("role") || "client").toLowerCase() === "admin";

  const logout = () => {
    localStorage.clear();
    navigate("/auth", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
      isActive
        ? "bg-white text-teal-900 shadow-lg"
        : "text-white/80 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-gradient-to-b from-teal-900 via-teal-800 to-slate-900 text-white flex flex-col">
        <div className="px-6 py-8 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            Mode Agent
          </p>
          <h1 className="text-2xl font-semibold mt-3 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-lg">
              AG
            </span>
            PayLink OPS
          </h1>
          <p className="text-white/70 text-xs mt-2">
            Cash-in/out & opérations assistées.
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavLink to="dashboard" className={linkClass} end>
            <Users size={18} /> Tableau agent
          </NavLink>
          <NavLink to="operation" className={linkClass}>
            <ArrowLeftRight size={18} /> Opération client
          </NavLink>
          <NavLink to="cash-in" className={linkClass}>
            <Smartphone size={18} /> Cash-In direct
          </NavLink>
          <NavLink to="cash-out" className={linkClass}>
            <Smartphone size={18} /> Cash-Out direct
          </NavLink>
          <NavLink to="scan" className={linkClass}>
            <QrCode size={18} /> Scan QR client
          </NavLink>
          <NavLink to="history" className={linkClass}>
            <History size={18} /> Historique
          </NavLink>
          <NavLink to="transfers/close" className={linkClass}>
            <CheckCircle size={18} /> Transferts à clôturer
          </NavLink>

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 px-2 mb-3">
                Console admin
              </p>
              <NavLink to="/dashboard/admin/users" className={linkClass}>
                <ShieldCheck size={18} /> Retour console
              </NavLink>
            </div>
          )}
        </nav>

        <div className="px-4 py-6 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
