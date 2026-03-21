import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Send,
  RefreshCcw,
  User,
  Smartphone,
  LogOut,
  Globe,
  Menu,
  X,
  Gift,
  ArrowDown,
  ArrowUp,
  CreditCard,
  Shield,
  LineChart,
  Store,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import useNotifications from "@/hooks/useNotifications";
import ToastStream from "@/components/Toast";
import api from "@/services/api";
import { logout as logoutSession } from "@/services/authStore";

const menuGroups = [
  {
    key: "wallet",
    title: "Portefeuille",
    items: [
      { name: "Vue generale", path: "/dashboard/client/overview", icon: <LayoutDashboard size={18} /> },
      { name: "Portefeuille", path: "/dashboard/client/wallet", icon: <Wallet size={18} /> },
      { name: "Transactions", path: "/dashboard/client/transactions", icon: <RefreshCcw size={18} /> },
      { name: "Historique balance", path: "/dashboard/client/balance-history", icon: <LineChart size={18} /> },
    ],
  },
  {
    key: "payments",
    title: "Paiements & transferts",
    items: [
      { name: "Demandes paiement", path: "/dashboard/client/payments", icon: <Send size={18} /> },
      { name: "Transfert interne", path: "/dashboard/client/transfer", icon: <RefreshCcw size={18} /> },
      { name: "Transfert externe", path: "/dashboard/client/external-transfer", icon: <Globe size={18} /> },
      { name: "Mobile Money", path: "/dashboard/client/mobiletopup", icon: <Smartphone size={18} /> },
      { name: "Depot cash", path: "/dashboard/client/deposit", icon: <ArrowDown size={18} /> },
      { name: "Retrait cash", path: "/dashboard/client/withdraw/bif", icon: <ArrowUp size={18} /> },
      { name: "Retrait USDC", path: "/dashboard/client/withdraw/usdc", icon: <ArrowUp size={18} /> },
      { name: "Bonus", path: "/dashboard/client/bonus", icon: <Gift size={18} /> },
    ],
  },
  {
    key: "escrowP2p",
    title: "Escrow et P2P",
    items: [
      { name: "Paiement crypto securise", path: "/dashboard/client/crypto-pay", icon: <Send size={18} /> },
      { name: "P2P Exchange", path: "/app/p2p", icon: <Store size={18} /> },
      { name: "Mes Trades", path: "/app/p2p/my-trades", icon: <Store size={18} /> },
      { name: "Mes Offres", path: "/app/p2p/my-offers", icon: <Store size={18} /> },
    ],
  },
  {
    key: "credit",
    title: "Credit et microfinance",
    items: [
      { name: "Historique credit", path: "/dashboard/client/credit-history", icon: <CreditCard size={18} /> },
      { name: "Ligne de credit", path: "/dashboard/client/credit-line", icon: <CreditCard size={18} /> },
      { name: "Microfinance", path: "/dashboard/client/microfinance", icon: <Shield size={18} /> },
      { name: "Credits", path: "/dashboard/client/loans", icon: <CreditCard size={18} /> },
      { name: "Situation financiere", path: "/dashboard/client/financial", icon: <LineChart size={18} /> },
    ],
  },
  {
    key: "community",
    title: "Communaute",
    items: [
      { name: "Tontines", path: "/dashboard/client/tontines", icon: <RefreshCcw size={18} /> },
    ],
  },
  {
    key: "account",
    title: "Compte",
    items: [{ name: "Profil", path: "/dashboard/client/profile", icon: <User size={18} /> }],
  },
];

const DEFAULT_COLLAPSED_GROUPS = {
  wallet: false,
  payments: true,
  escrowP2p: true,
  credit: true,
  community: true,
  account: true,
};

function getGroupForPath(pathname = "") {
  if (pathname.includes("/overview")) return "wallet";
  if (pathname.includes("/p2p") || pathname.includes("/crypto-pay")) return "escrowP2p";
  if (
    pathname.includes("/credit") ||
    pathname.includes("/microfinance") ||
    pathname.includes("/loans") ||
    pathname.includes("/financial")
  ) {
    return "credit";
  }
  if (pathname.includes("/tontines") || pathname.includes("/bonus")) return "community";
  if (pathname.includes("/profile")) return "account";
  if (
    pathname.includes("/payments") ||
    pathname.includes("/transfer") ||
    pathname.includes("/external-transfer") ||
    pathname.includes("/mobiletopup") ||
    pathname.includes("/deposit") ||
    pathname.includes("/withdraw")
  ) {
    return "payments";
  }
  return "wallet";
}

export default function DashboardLayout() {
  useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [profile, setProfile] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(DEFAULT_COLLAPSED_GROUPS);
  const storedRole = (localStorage.getItem("role") || "client").toLowerCase();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.get("/auth/me");
        setProfile(data);
      } catch (err) {
        console.error("Impossible de charger le profil", err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const activeGroup = getGroupForPath(location.pathname);
    setCollapsedGroups((prev) => {
      if (!prev[activeGroup]) return prev;
      return { ...prev, [activeGroup]: false };
    });
  }, [location.pathname]);

  const handleLogout = () => {
    logoutSession().finally(() => navigate("/"));
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl transition ${
      isActive
        ? "bg-white/15 text-white shadow-lg shadow-indigo-900/40"
        : "text-slate-200 hover:bg-white/10"
    }`;

  const groupButtonClass =
    "w-full flex items-center justify-between px-2 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition";

  const SidebarInner = ({ onNavigate }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">PesaPaid</p>
        <h1 className="text-2xl font-semibold mt-3 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1 shadow-md">
            <img src="/logo.png" alt="PesaPaid" className="h-full w-full object-contain" />
          </span>
          Tableau client
        </h1>
        <p className="text-white/70 text-xs mt-2">Gestion finance et services digitaux</p>
        <span className="inline-flex mt-4 px-3 py-1 rounded-full bg-white/15 text-[11px] uppercase tracking-[0.3em]">
          {storedRole}
        </span>
        {profile?.full_name && (
          <p className="text-sm text-white mt-3 font-semibold">Bienvenue, {profile.full_name}</p>
        )}
        <button
          onClick={handleLogout}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.key}>
            <button className={groupButtonClass} onClick={() => toggleGroup(group.key)}>
              <span className="truncate whitespace-nowrap">{group.title}</span>
              {collapsedGroups[group.key] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsedGroups[group.key] && (
              <div className="flex flex-col gap-2 mt-2">
                {group.items.map((item) => (
                  <NavLink key={item.path} to={item.path} className={linkClass} onClick={onNavigate}>
                    {item.icon} {item.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-4 py-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white text-indigo-900 font-semibold shadow-md hover:shadow-lg transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside
        className={`${sidebarVisible ? "hidden lg:flex" : "hidden"} w-72 bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white`}
      >
        <SidebarInner />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 w-full bg-gradient-to-r from-indigo-950 to-indigo-800 text-white flex items-center justify-between px-4 py-3 shadow-lg z-30">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white p-1 shadow-md">
            <img src="/logo.png" alt="PesaPaid" className="h-full w-full object-contain" />
          </span>
          <h1 className="text-lg font-semibold drop-shadow">PesaPaid</h1>
        </div>
        <button aria-label="Ouvrir le menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={26} />
        </button>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute top-0 left-0 h-full w-72 bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-lg font-semibold">Navigation</span>
              <button onClick={() => setDrawerOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <SidebarInner onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col pt-16 lg:pt-0">
        <header className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 bg-white border-b shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
              onClick={() => setSidebarVisible((v) => !v)}
            >
              <Menu size={18} />
              {sidebarVisible ? "Masquer le menu" : "Afficher le menu"}
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Tableau de bord</h2>
          </div>
          <NotificationsBell />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>

      <ToastStream />
    </div>
  );
}
