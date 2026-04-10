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
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Settings,
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import useNotifications from "@/hooks/useNotifications";
import ToastStream from "@/components/Toast";
import api from "@/services/api";
import { logout as logoutSession } from "@/services/authStore";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import {
  CLIENT_UI_MODES,
  getClientUiMode,
  getClientUiVisibleGroups,
  getDefaultClientRouteForMode,
  isClientPathAllowed,
  setClientUiMode,
  subscribeClientUiMode,
} from "@/utils/clientUiMode";

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
      { name: "Transfert programme", path: "/dashboard/client/scheduled-transfers", icon: <RefreshCcw size={18} /> },
      {
        name: "Transfert externe programme",
        path: "/dashboard/client/scheduled-transfers/external",
        icon: <Globe size={18} />,
      },
      { name: "Epargne", path: "/dashboard/client/savings", icon: <Wallet size={18} /> },
      { name: "Cartes virtuelles", path: "/dashboard/client/cards", icon: <CreditCard size={18} /> },
      { name: "Business", path: "/dashboard/client/business", icon: <Store size={18} /> },
      { name: "API marchande", path: "/dashboard/client/merchant-api", icon: <Globe size={18} /> },
      { name: "Cagnottes", path: "/dashboard/client/pots", icon: <Gift size={18} /> },
      { name: "Transfert externe", path: "/dashboard/client/external-transfer", icon: <Globe size={18} /> },
      { name: "Mobile Money", path: "/dashboard/client/mobiletopup", icon: <Smartphone size={18} /> },
      { name: "Depot cash", path: "/dashboard/client/deposit", icon: <ArrowDown size={18} /> },
      { name: "Retrait cash", path: "/dashboard/client/withdraw/bif", icon: <ArrowUp size={18} /> },
      { name: "Retrait USDC", path: "/dashboard/client/withdraw/usdc", icon: <ArrowUp size={18} /> },
      { name: "Bonus", path: "/dashboard/client/bonus", icon: <Gift size={18} /> },
    ],
  },
  {
    key: "assistants",
    title: "Assistants",
    items: [
      { name: "Guide assistants", path: "/dashboard/client/assistants-guide", icon: <BookOpen size={18} /> },
      { name: "Assistant transfert", path: "/dashboard/client/agent-chat", icon: <MessageSquare size={18} /> },
      { name: "Support transfert", path: "/dashboard/client/transfer-support-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant cash", path: "/dashboard/client/cash-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant credit", path: "/dashboard/client/credit-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant KYC", path: "/dashboard/client/kyc-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant wallet", path: "/dashboard/client/wallet-agent", icon: <MessageSquare size={18} /> },
      { name: "Support wallet", path: "/dashboard/client/wallet-support-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant escrow", path: "/dashboard/client/escrow-agent", icon: <MessageSquare size={18} /> },
      { name: "Assistant P2P", path: "/dashboard/client/p2p-agent", icon: <MessageSquare size={18} /> },
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
    items: [
      { name: "Profil", path: "/dashboard/client/profile", icon: <User size={18} /> },
      { name: "Mode interface", path: "/dashboard/client/interface-mode", icon: <Settings size={18} /> },
    ],
  },
];

const PATHNAME_VARIANTS = (() => {
  const seen = new Map();
  for (const group of menuGroups) {
    for (const item of group.items) {
      const pathname = String(item.path || "").split("?")[0];
      if (!pathname) continue;
      const prev = seen.get(pathname) || { count: 0, hasQuery: false };
      seen.set(pathname, {
        count: prev.count + 1,
        hasQuery: prev.hasQuery || String(item.path || "").includes("?"),
      });
    }
  }
  const variants = new Set();
  for (const [pathname, meta] of seen.entries()) {
    if (meta.count > 1 && meta.hasQuery) variants.add(pathname);
  }
  return variants;
})();

const DEFAULT_COLLAPSED_GROUPS = {
  wallet: true,
  payments: true,
  assistants: true,
  escrowP2p: true,
  credit: true,
  community: true,
  account: true,
};

export default function DashboardLayout() {
  useNotifications();
  const { updateAvailable, reloadNow, dismissUpdate, isSafeToReloadNow } = useVersionCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [profile, setProfile] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(DEFAULT_COLLAPSED_GROUPS);
  const [uiMode, setUiMode] = useState(getClientUiMode());
  const storedRole = (localStorage.getItem("role") || "client").toLowerCase();
  const visibleGroups = new Set(getClientUiVisibleGroups(uiMode));

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

  useEffect(() => subscribeClientUiMode(setUiMode), []);

  useEffect(() => {
    if (!location.pathname.startsWith("/dashboard/client") && !location.pathname.startsWith("/app")) return;
    if (isClientPathAllowed(location.pathname, uiMode)) return;
    navigate(getDefaultClientRouteForMode(uiMode), { replace: true });
  }, [location.pathname, navigate, uiMode]);

  const handleLogout = () => {
    logoutSession().finally(() => navigate("/"));
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isMenuItemActive = (itemPath) => {
    const [itemPathname, itemQuery = ""] = String(itemPath || "").split("?");
    if (!itemPathname) return false;
    if (location.pathname !== itemPathname) return false;
    if (itemQuery) return location.search === `?${itemQuery}`;
    if (PATHNAME_VARIANTS.has(itemPathname)) return !location.search;
    return true;
  };

  const linkClass = (active) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl transition ${
      active ? "bg-white/15 text-white shadow-lg shadow-indigo-900/40" : "text-slate-200 hover:bg-white/10"
    }`;

  const assistantLinkClass = (active) =>
    `flex items-center gap-3 px-4 py-2 rounded-2xl border transition ${
      active
        ? "border-cyan-200 bg-white text-indigo-950 shadow-lg shadow-cyan-900/20"
        : "border-white/10 bg-white/5 text-white hover:bg-white/12 hover:border-cyan-200/40"
    }`;

  const modeTabs = Object.values(CLIENT_UI_MODES);

  const groupButtonClass =
    "w-full flex items-center justify-between px-2 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition";

  const SidebarInner = ({ onNavigate }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">PesaPaid</p>
        <h1 className="text-2xl font-semibold mt-3 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md">
            <img src="/apple-touch-icon.png?v=1" alt="PesaPaid" className="h-full w-full rounded-[1rem] object-cover scale-125" />
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
        {updateAvailable ? (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-2 text-[10px] text-slate-100">
            <p className="font-semibold">Nouvelle version</p>
            {!isSafeToReloadNow ? (
              <p className="mt-1 text-[10px] text-amber-300">
                Termine l&apos;operation en cours avant actualisation.
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  dismissUpdate();
                  reloadNow({ force: true });
                }}
                disabled={!isSafeToReloadNow}
                className="rounded-md border border-slate-600 bg-white px-1.5 py-0.5 font-semibold text-slate-900 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Actualiser
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="rounded-md px-1.5 py-0.5 text-slate-200 hover:bg-slate-800"
              >
                Plus tard
              </button>
            </div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {menuGroups
          .filter((group) => visibleGroups.has(group.key))
          .map((group) => {
            const allowedItems = (group.items || []).filter((item) =>
              isClientPathAllowed(String(item.path || "").split("?")[0], uiMode)
            );
            if (!allowedItems.length) return null;
            return (
          <div key={group.key}>
            <button className={groupButtonClass} onClick={() => toggleGroup(group.key)}>
              <span className="truncate whitespace-nowrap">{group.title}</span>
              {collapsedGroups[group.key] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsedGroups[group.key] && (
              <div className={`mt-2 ${group.key === "assistants" ? "grid gap-2" : "flex flex-col gap-2"}`}>
                {allowedItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={group.key === "assistants" ? assistantLinkClass(isMenuItemActive(item.path)) : linkClass(isMenuItemActive(item.path))}
                    onClick={onNavigate}
                  >
                    {item.icon} {item.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
            );
          })}
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
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md">
            <img src="/apple-touch-icon.png?v=1" alt="PesaPaid" className="h-full w-full rounded-[1rem] object-cover scale-125" />
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={18} />
              Retour
            </button>
            <button
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
              onClick={() => setSidebarVisible((v) => !v)}
            >
              <Menu size={18} />
              {sidebarVisible ? "Masquer le menu" : "Afficher le menu"}
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Tableau de bord</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {modeTabs.map((modeOption) => {
                const selected = uiMode === modeOption.key;
                return (
                  <button
                    key={modeOption.key}
                    type="button"
                    onClick={() => setClientUiMode(modeOption.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      selected
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                    aria-pressed={selected}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </div>
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>

      <ToastStream />
    </div>
  );
}
