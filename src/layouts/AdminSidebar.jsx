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
  Wifi,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getAccessToken, logout as logoutSession } from "@/services/authStore";
import QuickActions from "@/components/QuickActions";
import { getAdminQuickActions } from "@/constants/adminQuickActions";
import { fetchBackendVersion } from "@/services/api";
import { getFrontendReleaseInfo } from "@/utils/releaseInfo";

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
  if (pathname.includes("/settings") || pathname.includes("/analytics") || pathname.includes("/kyc/reviews")) {
    return "config";
  }
  if (
    pathname.includes("/wallets") ||
    pathname.includes("/client-wallets") ||
    pathname.includes("/wallet-analysis") ||
    pathname.includes("/mobilemoney") ||
    pathname.includes("/transfers") ||
    pathname.includes("/transfer-approvals") ||
    pathname.includes("/transfer-gains") ||
    pathname.includes("/cash-requests") ||
    pathname.includes("/payment-requests") ||
    pathname.includes("/ops/liquidity-bif") ||
    pathname.includes("/ops/errors")
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
  const env = import.meta.env.VITE_APP_ENV || "dev";
  const isOpsMuted = nowTs < Number(opsMutedUntil || 0);
  const frontendRelease = getFrontendReleaseInfo();

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
        <button className={groupButtonClass} onClick={() => toggleGroup("surveillance")}>
          <span>Surveillance</span>
          {collapsedGroups.surveillance ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.surveillance && (
          <div className="space-y-2">
            <NavLink to="users" className={linkClass} onClick={onNavigate}>
              <Users size={18} /> Utilisateurs
            </NavLink>
            <NavLink to="agents" className={linkClass} onClick={onNavigate}>
              <Briefcase size={18} /> Gestion agents
            </NavLink>
            <NavLink to="/dashboard/admin/overview" className={linkClass} onClick={onNavigate}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink to="/dashboard/admin/overview-lite" className={linkClass} onClick={onNavigate}>
              <LayoutDashboard size={18} /> Dashboard Lite
            </NavLink>
            <NavLink to="/dashboard/admin/aml-cases" className={linkClass} onClick={onNavigate}>
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} />
                <span>Cas AML</span>
              </div>
              {amlCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {amlCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/dashboard/admin/risk-heatmap" className={linkClass} onClick={onNavigate}>
              <Activity size={18} /> Carte de risque
            </NavLink>
            <NavLink to="/dashboard/admin/liquidity" className={linkClass} onClick={onNavigate}>
              <Droplets size={18} /> Gestion liquidite
            </NavLink>
            <NavLink to="/dashboard/admin/notifications" className={linkClass} onClick={onNavigate}>
              <Bell size={18} /> Notifications
            </NavLink>
            <NavLink to="/dashboard/admin/arbitrage" className={linkClass} onClick={onNavigate}>
              <TrendingUp size={18} /> Arbitrage
            </NavLink>
            <NavLink
              to="/dashboard/admin/kill-switch"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive ? "bg-white/15 text-red-300 shadow-lg shadow-black/10" : "text-red-400 hover:bg-white/10"
                }`
              }
              onClick={onNavigate}
            >
              <Power size={18} /> Arret d'urgence
            </NavLink>
            <NavLink to="security" className={linkClass} onClick={onNavigate}>
              <ShieldAlert size={18} /> Securite live
            </NavLink>
            <NavLink to="webhooks" className={linkClass} onClick={onNavigate}>
              <ShieldCheck size={18} /> Logs webhooks
            </NavLink>
            <NavLink to="/backoffice/audit" className={linkClass} onClick={onNavigate}>
              <FileSearch size={18} /> Audit Log
            </NavLink>
            <NavLink to="/backoffice/monitoring" className={linkClass} onClick={onNavigate}>
              <BarChart3 size={18} /> Monitoring
            </NavLink>
            <NavLink to="/dashboard/admin/ops-dashboard" className={linkClass} onClick={onNavigate}>
              <Activity size={18} /> Ops Dashboard
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
            </NavLink>
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
            <NavLink to="risk" className={linkClass} onClick={onNavigate}>
              <ShieldAlert size={18} /> Monitoring risque
            </NavLink>
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("assistants")}>
          <span>Assistants admin</span>
          {collapsedGroups.assistants ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.assistants && (
          <div className="space-y-2">
            <NavLink to="/dashboard/admin/assistants-guide" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Guide assistants
            </NavLink>
            <NavLink to="/dashboard/admin/agent-chat" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant transfert
            </NavLink>
            <NavLink to="/dashboard/admin/cash-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant cash
            </NavLink>
            <NavLink to="/dashboard/admin/credit-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant credit
            </NavLink>
            <NavLink to="/dashboard/admin/kyc-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant KYC
            </NavLink>
            <NavLink to="/dashboard/admin/transfer-support-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Support transfert
            </NavLink>
            <NavLink to="/dashboard/admin/wallet-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant wallet
            </NavLink>
            <NavLink to="/dashboard/admin/wallet-support-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Support wallet
            </NavLink>
            <NavLink to="/dashboard/admin/escrow-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant escrow
            </NavLink>
            <NavLink to="/dashboard/admin/p2p-agent" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Assistant P2P
            </NavLink>
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("p2p")}>
          <span>P2P</span>
          {collapsedGroups.p2p ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.p2p && (
          <div className="space-y-2">
            <NavLink to="p2p/trades" className={linkClass} onClick={onNavigate}>
              <ArrowLeftRight size={18} /> Suivi P2P
            </NavLink>
            <NavLink to="p2p/disputes" className={linkClass} onClick={onNavigate}>
              <FileSearch size={18} /> Disputes
            </NavLink>
            <NavLink to="p2p/risk" className={linkClass} onClick={onNavigate}>
              <ShieldAlert size={18} /> Risque / alertes
            </NavLink>
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("escrowLedger")}>
          <span>Escrow et Ledger</span>
          {collapsedGroups.escrowLedger ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.escrowLedger && (
          <div className="space-y-2">
            <NavLink to="escrow" className={linkClass} onClick={onNavigate}>
              <Coins size={18} /> File escrow
            </NavLink>
            <NavLink to="escrow/audit" className={linkClass} onClick={onNavigate}>
              <ShieldCheck size={18} /> Audit Escrow
            </NavLink>
            <NavLink to="ledger/balances" className={linkClass} onClick={onNavigate}>
              <Wallet size={18} /> Balances
            </NavLink>
            <NavLink to="ledger/t-accounts" className={linkClass} onClick={onNavigate}>
              <BookOpen size={18} /> Comptes T
            </NavLink>
            <NavLink to="ledger/unbalanced-journals" className={linkClass} onClick={onNavigate}>
              <LineChart size={18} /> Journaux non equilibres
            </NavLink>
            <NavLink to="ledger/idempotency-scopes" className={linkClass} onClick={onNavigate}>
              <LineChart size={18} /> Idempotence scopes
            </NavLink>
            <NavLink to="onchain-simulator" className={linkClass} onClick={onNavigate}>
              <Activity size={18} /> Simulateur on-chain
            </NavLink>
            <NavLink to="balance-events" className={linkClass} onClick={onNavigate}>
              <LineChart size={18} /> Balances clients
            </NavLink>
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("operations")}>
          <span>Operations</span>
          {collapsedGroups.operations ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.operations && (
          <div className="space-y-2">
            <NavLink to="wallets" className={linkClass} onClick={onNavigate}>
              <Wallet size={18} /> Portefeuilles
            </NavLink>
            <NavLink to="client-wallets" className={linkClass} onClick={onNavigate}>
              <Users size={18} /> Wallets clients
            </NavLink>
            <NavLink to="wallet-analysis" className={linkClass} onClick={onNavigate}>
              <LineChart size={18} /> Analyse wallets
            </NavLink>
            <NavLink to="mobilemoney" className={linkClass} onClick={onNavigate}>
              <Wallet size={18} /> Mobile Money
            </NavLink>
            <NavLink to="transfers" className={linkClass} onClick={onNavigate}>
              <GitPullRequest size={18} /> Transferts externes
            </NavLink>
            <NavLink to="transfer-approvals" className={linkClass} onClick={onNavigate}>
              <GitPullRequest size={18} /> Validations transferts
            </NavLink>
            <NavLink to="transfer-gains" className={linkClass} onClick={onNavigate}>
              <TrendingUp size={18} /> Gains transferts
            </NavLink>
            <NavLink to="cash-requests" className={linkClass} onClick={onNavigate}>
              <Coins size={18} /> Cash in/out
            </NavLink>
            <NavLink to="payment-requests" className={linkClass} onClick={onNavigate}>
              <HandCoins size={18} /> Demandes de paiement
            </NavLink>
            <NavLink to="ops/liquidity-bif" className={linkClass} onClick={onNavigate}>
              <Droplets size={18} /> Liquidite BIF (OPS)
            </NavLink>
            <NavLink to="ops/errors" className={linkClass} onClick={onNavigate}>
              <Activity size={18} /> Erreurs API
            </NavLink>
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("microfinance")}>
          <span>Microfinance</span>
          {collapsedGroups.microfinance ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.microfinance && (
          <div className="space-y-2">
            <NavLink to="loans" className={linkClass} onClick={onNavigate}>
              <CreditCard size={18} /> Credits
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
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("tontines")}>
          <span>Tontines</span>
          {collapsedGroups.tontines ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.tontines && (
          <div className="space-y-2">
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
          </div>
        )}

        <button className={`${groupButtonClass} mt-6`} onClick={() => toggleGroup("config")}>
          <span>Configuration</span>
          {collapsedGroups.config ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsedGroups.config && (
          <div className="space-y-2">
            <NavLink to="settings" className={linkClass} onClick={onNavigate}>
              <Settings size={18} /> Parametres
            </NavLink>
            <NavLink to="kyc/reviews" className={linkClass} onClick={onNavigate}>
              <UserCheck size={18} /> Verif KYC
            </NavLink>
            <NavLink to="analytics" className={linkClass} onClick={onNavigate}>
              <BarChart3 size={18} /> Statistiques
            </NavLink>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <button className={groupButtonClass} onClick={() => toggleGroup("modeAgent")}>
            <span>Mode Agent</span>
            {collapsedGroups.modeAgent ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          {!collapsedGroups.modeAgent && (
            <div className="space-y-2 mt-2">
              <NavLink to="/dashboard/agent/dashboard" className={linkClass} onClick={onNavigate}>
                <ArrowLeftRight size={18} /> Hub agent
              </NavLink>
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
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              UI marker: admin-global-quick-actions-layout-v1
            </div>
            <QuickActions
              title="Actions rapides admin"
              subtitle="Disponible sur toutes les pages admin."
              actions={getAdminQuickActions()}
            />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
