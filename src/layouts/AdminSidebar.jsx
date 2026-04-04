import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
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
  Bell,
  TrendingUp,
  Settings,
  LineChart,
  Menu,
  X,
  ArrowLeft,
  HandCoins,
  Shield,
  LayoutDashboard,
  Activity,
  Droplets,
  Power,
  SlidersHorizontal,
  Wifi,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getAccessToken, logout as logoutSession, redirectToAuth } from "@/services/authStore";
import QuickActions from "@/components/QuickActions";
import AdminOperatorPrioritiesPanel from "@/components/admin/AdminOperatorPrioritiesPanel";
import { getAdminQuickActionGroups } from "@/constants/adminQuickActionGroups";
import { fetchBackendVersion } from "@/services/api";
import { getFrontendReleaseInfo } from "@/utils/releaseInfo";
import {
  ADMIN_UI_MODES,
  getAdminUiMode,
  getAdminUiVisibleGroups,
  getDefaultAdminRouteForMode,
  isAdminPathAllowed,
  setAdminUiMode,
  subscribeAdminUiMode,
} from "@/utils/adminUiMode";

const API_BASE = import.meta.env.VITE_API_URL || "";
const OPS_ALERT_MUTE_KEY = "ops_alert_muted_until";
const DEFAULT_COLLAPSED_GROUPS = {
  surveillance: false,
  assistants: false,
  p2p: true,
  escrowLedger: true,
  operations: true,
  microfinance: true,
  tontines: true,
  config: true,
  modeAgent: true,
};

function computeOpsLevel(metrics) {
  const unbalanced = Number(metrics?.ledger?.unbalanced_journals || 0);
  const err5xx = Number(metrics?.api?.errors_5xx || 0);
  const errRate = Number(metrics?.api?.error_rate_percent || 0);
  const p95 = Number(metrics?.api?.latency_p95_ms || 0);
  const failedRetry = Number(metrics?.webhooks?.failed_retry || 0);
  const retryQueue = Number(metrics?.webhooks?.retry_queue_size || 0);

  if (unbalanced > 0 || err5xx >= 10 || errRate >= 10 || p95 >= 2000 || failedRetry > 0 || retryQueue >= 30) {
    return "CRITICAL";
  }
  if (err5xx >= 1 || errRate >= 3 || p95 >= 1000 || retryQueue >= 10) {
    return "WARN";
  }
  return "OK";
}

function getGroupForPath(pathname = "") {
  if (pathname.startsWith("/dashboard/agent")) return "modeAgent";
  if (
      pathname.includes("/assistants-guide") ||
      pathname.includes("/ai-feedback") ||
      pathname.includes("/ai-synonyms") ||
      pathname.includes("/dispute-codes") ||
      pathname.includes("/agent-chat") ||
    pathname.includes("/cash-agent") ||
    pathname.includes("/credit-agent") ||
    pathname.includes("/kyc-agent") ||
    pathname.includes("/transfer-support-agent") ||
    pathname.includes("/wallet-agent") ||
    pathname.includes("/wallet-support-agent") ||
    pathname.includes("/escrow-agent") ||
    pathname.includes("/p2p-agent")
  ) {
    return "assistants";
  }
  if (pathname.includes("/p2p/") || pathname.endsWith("/trades") || pathname.endsWith("/disputes")) return "p2p";
  if (
    pathname.includes("/escrow") ||
    pathname.includes("/ledger/") ||
    pathname.includes("/balance-events") ||
    pathname.includes("/unbalanced-journals")
  ) {
    return "escrowLedger";
  }
  if (
    pathname.includes("/loans") ||
    pathname.includes("/credit-history") ||
    pathname.includes("/credit-lines") ||
    pathname.includes("/microfinance") ||
    pathname.includes("/loan-products")
  ) {
    return "microfinance";
  }
  if (pathname.includes("/tontines")) return "tontines";
  if (
    pathname.includes("/settings") ||
    pathname.includes("/analytics") ||
    pathname.includes("/kyc/reviews") ||
    pathname.includes("/interface-mode")
  ) {
    return "config";
  }
  if (
    pathname.includes("/wallets") ||
    pathname.includes("/client-wallets") ||
    pathname.includes("/wallet-analysis") ||
    pathname.includes("/mobilemoney") ||
    pathname.includes("/payment-intents") ||
    pathname.includes("/transfers") ||
    pathname.includes("/transfer-approvals") ||
    pathname.includes("/transfer-gains") ||
    pathname.includes("/cash-requests") ||
    pathname.includes("/payment-requests") ||
    pathname.includes("/ops/liquidity-bif") ||
    pathname.includes("/ops/errors") ||
    pathname.includes("/ops-urgencies")
  ) {
    return "operations";
  }
  return "surveillance";
}

function getAuthToken() {
  return getAccessToken();
}

async function api(url) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401 || res.status === 403) {
    redirectToAuth("expired");
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

function resolveAdminWsUrl() {
  if (API_BASE) {
    try {
      const u = new URL(API_BASE);
      u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
      u.pathname = "/ws/admin";
      u.search = "";
      return u.toString();
    } catch {
      // fallback below
    }
  }
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/admin`;
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [amlCount, setAmlCount] = useState(0);
  const [wsLive, setWsLive] = useState(false);
  const [opsLevel, setOpsLevel] = useState("OK");
  const [opsMutedUntil, setOpsMutedUntil] = useState(() => {
    const raw = localStorage.getItem(OPS_ALERT_MUTE_KEY);
    const ts = Number(raw || 0);
    return Number.isFinite(ts) ? ts : 0;
  });
  const [nowTs, setNowTs] = useState(Date.now());
  const [collapsedGroups, setCollapsedGroups] = useState(DEFAULT_COLLAPSED_GROUPS);
  const [backendVersion, setBackendVersion] = useState(null);
  const [uiMode, setUiMode] = useState(getAdminUiMode());
  const env = import.meta.env.VITE_APP_ENV || "dev";
  const isOpsMuted = nowTs < Number(opsMutedUntil || 0);
  const frontendRelease = getFrontendReleaseInfo();
  const visibleGroups = new Set(getAdminUiVisibleGroups(uiMode));

  useEffect(() => {
    api("/api/admin/aml/cases?status=OPEN").then((data) => {
      if (Array.isArray(data)) setAmlCount(data.length);
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetchBackendVersion()
      .then((data) => {
        if (active) setBackendVersion(data);
      })
      .catch(() => {
        if (active) setBackendVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket(resolveAdminWsUrl());
    ws.onopen = () => setWsLive(true);
    ws.onclose = () => setWsLive(false);
    ws.onerror = () => setWsLive(false);
    return () => ws.close();
  }, []);

  useEffect(() => {
    let alive = true;
    let previousLevel = null;
    const refreshOpsLevel = async () => {
      const metrics = await api("/backoffice/monitoring/ops-metrics?window_hours=24");
      if (alive && metrics) {
        const nextLevel = computeOpsLevel(metrics);
        setOpsLevel(nextLevel);
        if (
          previousLevel !== null &&
          previousLevel !== "CRITICAL" &&
          nextLevel === "CRITICAL" &&
          !isOpsMuted
        ) {
          playCriticalBeep();
          toast.error("Alerte OPS: statut CRITICAL detecte. Ouvre Ops Dashboard.");
        }
        previousLevel = nextLevel;
      }
    };
    refreshOpsLevel();
    const id = setInterval(refreshOpsLevel, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isOpsMuted]);

  useEffect(() => {
    const activeGroup = getGroupForPath(location.pathname);
    setCollapsedGroups((prev) => {
      if (!prev[activeGroup]) return prev;
      return { ...prev, [activeGroup]: false };
    });
  }, [location.pathname]);

  useEffect(() => subscribeAdminUiMode(setUiMode), []);

  useEffect(() => {
    if (!location.pathname.startsWith("/dashboard/admin")) return;
    if (isAdminPathAllowed(location.pathname, uiMode)) return;
    navigate(getDefaultAdminRouteForMode(uiMode), { replace: true });
  }, [location.pathname, navigate, uiMode]);

  const logout = () => {
    logoutSession().finally(() => {
      navigate("/auth", { replace: true });
      setDrawerOpen(false);
    });
  };

  const playCriticalBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 220);
    } catch {
      // noop
    }
  };

  const muteOpsAlerts = (minutes = 15) => {
    const until = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(OPS_ALERT_MUTE_KEY, String(until));
    setOpsMutedUntil(until);
    toast.success(`Alertes OPS silencieuses pendant ${minutes} min.`);
  };

  const unmuteOpsAlerts = () => {
    localStorage.removeItem(OPS_ALERT_MUTE_KEY);
    setOpsMutedUntil(0);
    toast.success("Alertes OPS reactives.");
  };

  const mutedRemainingMinutes = Math.max(0, Math.ceil((Number(opsMutedUntil || 0) - nowTs) / 60000));

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
      isActive ? "bg-white/15 text-white shadow-lg shadow-black/10" : "text-slate-200 hover:bg-white/10"
    }`;

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groupButtonClass =
    "w-full flex items-center justify-between px-2 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-500 hover:text-slate-300 transition";

  const renderNavLink = (to, icon, label, onNavigate, extra = null, customClass = linkClass) => {
    const target = String(to || "");
    const isAdminTarget = !target.startsWith("/") || target.startsWith("/dashboard/admin");
    const accessPath = target.startsWith("/")
      ? target
      : `/dashboard/admin/${target.replace(/^\/+/, "")}`;
    if (isAdminTarget && !isAdminPathAllowed(accessPath, uiMode)) return null;
    const Icon = icon;
    return (
      <NavLink to={to} className={customClass} onClick={onNavigate}>
        <div className="flex items-center gap-3">
          <Icon size={18} />
          <span>{label}</span>
        </div>
        {extra}
      </NavLink>
    );
  };

  const renderGroupHeader = (key, label) => {
    if (!visibleGroups.has(key)) return null;
    return (
      <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup(key)}>
        <span>{label}</span>
        {collapsedGroups[key] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
    );
  };

  const SidebarContent = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
      <div className="px-6 py-8 border-b border-white/10">
        <p className="text-xs tracking-[0.4em] uppercase text-slate-400">Console</p>
        <h1 className="text-2xl font-semibold mt-2 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md">
            <img src="/apple-touch-icon.png?v=1" alt="PesaPaid" className="h-full w-full rounded-[1rem] object-cover scale-125" />
          </span>
          PesaPaid Admin
        </h1>
        {env !== "prod" && (
          <div className="mt-2 inline-block rounded-md bg-amber-400 px-2 py-1 text-[11px] font-semibold text-black">
            ENV: {String(env).toUpperCase()}
          </div>
        )}
        <p className="text-slate-400 text-xs mt-2">Supervision temps-reel & conformite</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Mode interface</p>
            <NavLink to="/dashboard/admin/interface-mode" className="text-xs text-cyan-300 hover:text-cyan-200" onClick={onNavigate}>
              Configurer
            </NavLink>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(ADMIN_UI_MODES).map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setAdminUiMode(mode.key)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                  uiMode === mode.key
                    ? "bg-white text-slate-900"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[11px] text-slate-300">
          <p className="font-semibold text-white">Release</p>
          <p className="mt-1">Front: {frontendRelease.version}</p>
          {frontendRelease.releaseSha && <p>SHA front: {String(frontendRelease.releaseSha).slice(0, 7)}</p>}
          {backendVersion?.version && <p>Back: {backendVersion.version}</p>}
          {backendVersion?.commit_sha && <p>SHA back: {String(backendVersion.commit_sha).slice(0, 7)}</p>}
          <p className="mt-1 text-slate-400">Env: {String(backendVersion?.env || env).toUpperCase()}</p>
        </div>
        <button
          onClick={logout}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {renderGroupHeader("surveillance", "Surveillance")}
        {visibleGroups.has("surveillance") && !collapsedGroups.surveillance && (
          <div className="space-y-2">
            {renderNavLink("users", Users, "Utilisateurs", onNavigate)}
            {renderNavLink("users/limits", SlidersHorizontal, "Limites clients", onNavigate)}
            {renderNavLink("agents", Briefcase, "Gestion agents", onNavigate)}
            {renderNavLink("/dashboard/admin/overview", LayoutDashboard, "Dashboard", onNavigate)}
            {renderNavLink("/dashboard/admin/overview-lite", LayoutDashboard, "Dashboard Lite", onNavigate)}
            {renderNavLink("/dashboard/admin/aml-cases", ShieldAlert, "Cas AML", onNavigate, amlCount > 0 ? (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {amlCount}
              </span>
            ) : null)}
            {renderNavLink("/dashboard/admin/risk-heatmap", Activity, "Carte de risque", onNavigate)}
            {renderNavLink("/dashboard/admin/liquidity", Droplets, "Gestion liquidite", onNavigate)}
            {renderNavLink("security", Bell, "Centre securite", onNavigate)}
            {renderNavLink("audit-search", FileSearch, "Recherche audit", onNavigate)}
            {renderNavLink("/dashboard/admin/arbitrage", TrendingUp, "Arbitrage", onNavigate)}
            {renderNavLink(
              "/dashboard/admin/kill-switch",
              Power,
              "Arret d'urgence",
              onNavigate,
              null,
              ({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive ? "bg-white/15 text-red-300 shadow-lg shadow-black/10" : "text-red-400 hover:bg-white/10"
                }`
            )}
            {renderNavLink("webhooks", ShieldCheck, "Logs webhooks", onNavigate)}
            {renderNavLink("/backoffice/audit", FileSearch, "Audit Log", onNavigate)}
            {renderNavLink("/backoffice/monitoring", BarChart3, "Monitoring", onNavigate)}
            {renderNavLink("/dashboard/admin/ops-dashboard", Activity, "Ops Dashboard", onNavigate, (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  opsLevel === "CRITICAL"
                    ? "bg-rose-500 text-white"
                    : opsLevel === "WARN"
                      ? "bg-amber-400 text-black"
                      : "bg-emerald-500 text-white"
                }`}
              >
                {opsLevel}
              </span>
            ))}
            {opsLevel === "CRITICAL" && (
              <div className="space-y-2">
                {!isOpsMuted ? (
                  <button
                    type="button"
                    onClick={() => muteOpsAlerts(15)}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Silencier alertes OPS 15 min
                  </button>
                ) : (
                  <>
                    <div className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-left text-xs font-semibold text-slate-700">
                      Alertes OPS silencieuses ({mutedRemainingMinutes} min restantes)
                    </div>
                    <button
                      type="button"
                      onClick={unmuteOpsAlerts}
                      className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Reactiver alertes maintenant
                    </button>
                  </>
                )}
              </div>
            )}
            {renderNavLink("risk", ShieldAlert, "Monitoring risque", onNavigate)}
          </div>
        )}

        {renderGroupHeader("assistants", "Assistants admin")}
        {visibleGroups.has("assistants") && !collapsedGroups.assistants && (
          <div className="space-y-2">
            {renderNavLink("/dashboard/admin/assistants-guide", BookOpen, "Guide assistants", onNavigate)}
            {renderNavLink("/dashboard/admin/ai-feedback", BookOpen, "Feedback IA", onNavigate)}
            {renderNavLink("/dashboard/admin/ai-synonyms", BookOpen, "Synonymes IA", onNavigate)}
            {renderNavLink("/dashboard/admin/dispute-codes", BookOpen, "Codes litiges", onNavigate)}
            {renderNavLink("/dashboard/admin/agent-chat", BookOpen, "Assistant transfert", onNavigate)}
            {renderNavLink("/dashboard/admin/cash-agent", BookOpen, "Assistant cash", onNavigate)}
            {renderNavLink("/dashboard/admin/credit-agent", BookOpen, "Assistant credit", onNavigate)}
            {renderNavLink("/dashboard/admin/kyc-agent", BookOpen, "Assistant KYC", onNavigate)}
            {renderNavLink("/dashboard/admin/transfer-support-agent", BookOpen, "Support transfert", onNavigate)}
            {renderNavLink("/dashboard/admin/wallet-agent", BookOpen, "Assistant wallet", onNavigate)}
            {renderNavLink("/dashboard/admin/wallet-support-agent", BookOpen, "Support wallet", onNavigate)}
            {renderNavLink("/dashboard/admin/escrow-agent", BookOpen, "Assistant escrow", onNavigate)}
            {renderNavLink("/dashboard/admin/p2p-agent", BookOpen, "Assistant P2P", onNavigate)}
          </div>
        )}

        {renderGroupHeader("p2p", "P2P")}
        {visibleGroups.has("p2p") && !collapsedGroups.p2p && (
          <div className="space-y-2">
            {renderNavLink("p2p/trades", ArrowLeftRight, "Suivi P2P", onNavigate)}
            {renderNavLink("p2p/disputes", FileSearch, "Disputes", onNavigate)}
            {renderNavLink("p2p/risk", ShieldAlert, "Risque / alertes", onNavigate)}
          </div>
        )}

        {renderGroupHeader("escrowLedger", "Escrow et Ledger")}
        {visibleGroups.has("escrowLedger") && !collapsedGroups.escrowLedger && (
          <div className="space-y-2">
            {renderNavLink("escrow", Coins, "File escrow", onNavigate)}
            {renderNavLink("escrow/audit", ShieldCheck, "Audit Escrow", onNavigate)}
            {renderNavLink("ledger/balances", Wallet, "Balances", onNavigate)}
            {renderNavLink("ledger/t-accounts", BookOpen, "Comptes T", onNavigate)}
            {renderNavLink("ledger/unbalanced-journals", LineChart, "Journaux non equilibres", onNavigate)}
            {renderNavLink("ledger/idempotency-scopes", LineChart, "Idempotence scopes", onNavigate)}
            {renderNavLink("onchain-simulator", Activity, "Simulateur on-chain", onNavigate)}
            {renderNavLink("balance-events", LineChart, "Balances clients", onNavigate)}
            {renderNavLink("legacy-transfers", GitPullRequest, "Transferts legacy", onNavigate)}
          </div>
        )}

        {renderGroupHeader("operations", "Operations")}
        {visibleGroups.has("operations") && !collapsedGroups.operations && (
          <div className="space-y-2">
            {renderNavLink("wallets", Wallet, "Portefeuilles", onNavigate)}
            {renderNavLink("client-wallets", Users, "Wallets clients", onNavigate)}
            {renderNavLink("wallet-corrections", Wallet, "Corrections wallet", onNavigate)}
            {renderNavLink("wallet-analysis", LineChart, "Analyse wallets", onNavigate)}
            {renderNavLink("mobilemoney", Wallet, "Mobile Money", onNavigate)}
            {renderNavLink("transfers", GitPullRequest, "Transferts externes", onNavigate)}
            {renderNavLink("transfer-approvals", GitPullRequest, "Validations transferts", onNavigate)}
            {renderNavLink("transfer-gains", TrendingUp, "Gains transferts", onNavigate)}
            {renderNavLink("cash-requests", Coins, "Cash in/out", onNavigate)}
            {renderNavLink("cash-deposits", Coins, "Depots admin", onNavigate)}
            {renderNavLink("payment-intents", HandCoins, "Depots mobile money BIF", onNavigate)}
            {renderNavLink("payment-requests", HandCoins, "Demandes de paiement", onNavigate)}
            {renderNavLink("ops-urgencies", ShieldAlert, "Urgences OPS", onNavigate)}
            {renderNavLink("ops/liquidity-bif", Droplets, "Liquidite BIF (OPS)", onNavigate)}
            {renderNavLink("ops/errors", Activity, "Erreurs API", onNavigate)}
          </div>
        )}

        {renderGroupHeader("microfinance", "Microfinance")}
        {visibleGroups.has("microfinance") && !collapsedGroups.microfinance && (
          <div className="space-y-2">
            {renderNavLink("loans", CreditCard, "Credits", onNavigate)}
            {renderNavLink("credit-history", BookOpen, "Historique credits", onNavigate)}
            {renderNavLink("credit-lines", BookOpen, "Lignes de credit", onNavigate)}
            {renderNavLink("credit-lines/repay", BookOpen, "Remboursement credit", onNavigate)}
            {renderNavLink("microfinance", Shield, "Microfinance", onNavigate)}
            {renderNavLink("loan-products", BookOpen, "Produits pret", onNavigate)}
          </div>
        )}

        {renderGroupHeader("tontines", "Tontines")}
        {visibleGroups.has("tontines") && !collapsedGroups.tontines && (
          <div className="space-y-2">
            {renderNavLink("tontines-dashboard", BarChart3, "Dashboard tontines", onNavigate)}
            {renderNavLink("tontines-arrears", BarChart3, "Impayes tontines", onNavigate)}
            {renderNavLink("tontines/create", BarChart3, "Creer une tontine", onNavigate)}
            {renderNavLink("tontines/members", BarChart3, "Membres tontines", onNavigate)}
          </div>
        )}

        {renderGroupHeader("config", "Configuration")}
        {visibleGroups.has("config") && !collapsedGroups.config && (
          <div className="space-y-2">
            {renderNavLink("interface-mode", Settings, "Mode interface", onNavigate)}
            {renderNavLink("settings", Settings, "Parametres", onNavigate)}
            {renderNavLink("kyc/reviews", UserCheck, "Verif KYC", onNavigate)}
            {renderNavLink("analytics", BarChart3, "Statistiques", onNavigate)}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          {renderGroupHeader("modeAgent", "Mode Agent")}
          {visibleGroups.has("modeAgent") && !collapsedGroups.modeAgent && (
            <div className="space-y-2 mt-2">
              {renderNavLink("/dashboard/agent/dashboard", ArrowLeftRight, "Hub agent", onNavigate)}
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 py-6 border-t border-white/10">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-300/90">
          <Wifi size={16} color={wsLive ? "#22c55e" : "#ef4444"} />
          <span>{wsLive ? "LIVE" : "OFFLINE"}</span>
        </div>
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
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md">
            <img src="/apple-touch-icon.png?v=1" alt="PesaPaid" className="h-full w-full rounded-[1rem] object-cover scale-125" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Console</p>
            <p className="font-semibold text-lg">PesaPaid Admin</p>
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
        className={`${sidebarVisible ? "hidden lg:flex" : "hidden"} w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex-col border-r border-white/5`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col pt-16 lg:pt-0">
        <div className="hidden lg:flex justify-between px-4 pt-4">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setSidebarVisible((v) => !v)}
          >
            <Menu size={18} />
            {sidebarVisible ? "Masquer le menu" : "Afficher le menu"}
          </button>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 rounded-t-3xl lg:rounded-none lg:rounded-l-3xl shadow-inner">
          <div className="mb-4 lg:hidden">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100 transition"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={18} />
              Retour
            </button>
          </div>
          <div className="mb-6 space-y-3">
            {uiMode === "expert" ? <AdminOperatorPrioritiesPanel /> : null}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              UI marker: admin-global-quick-actions-layout-v2 / mode={uiMode}
            </div>
            <QuickActions
              title="Actions rapides admin"
              subtitle={`Les groupes suivent le mode ${ADMIN_UI_MODES[uiMode]?.label?.toLowerCase() || "expert"} de la console admin.`}
              groups={getAdminQuickActionGroups(uiMode)}
            />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
