export const ADMIN_UI_MODE_KEY = "admin-ui-mode";
export const ADMIN_UI_MODE_CHANGED_EVENT = "admin-ui-mode-changed";

export const ADMIN_UI_MODES = {
  simple: {
    key: "simple",
    label: "Simple",
    description: "Utilisateurs, wallets, transferts, depots et lignes de credit.",
  },
  intermediate: {
    key: "intermediate",
    label: "Intermediaire",
    description: "Operations courantes avec supervision et configuration de base.",
  },
  expert: {
    key: "expert",
    label: "Expert",
    description: "Console complete avec tous les modules admin.",
  },
};

const DEFAULT_MODE = "simple";

const ADMIN_UI_ALLOWED_PREFIXES = {
  simple: [
    "/dashboard/admin/users",
    "/dashboard/admin/wallets",
    "/dashboard/admin/client-wallets",
    "/dashboard/admin/wallet-corrections",
    "/dashboard/admin/wallet-analysis",
    "/dashboard/admin/transfers",
    "/dashboard/admin/transfer-approvals",
    "/dashboard/admin/transfer-gains",
    "/dashboard/admin/cash-requests",
    "/dashboard/admin/cash-deposits",
    "/dashboard/admin/payment-intents",
    "/dashboard/admin/credit-lines",
    "/dashboard/admin/credit-history",
    "/dashboard/admin/financial-summary",
    "/dashboard/admin/interface-mode",
  ],
  intermediate: [
    "/dashboard/admin/overview",
    "/dashboard/admin/overview-lite",
    "/dashboard/admin/users",
    "/dashboard/admin/agents",
    "/dashboard/admin/security",
    "/dashboard/admin/audit-search",
    "/dashboard/admin/wallets",
    "/dashboard/admin/client-wallets",
    "/dashboard/admin/wallet-corrections",
    "/dashboard/admin/wallet-analysis",
    "/dashboard/admin/mobilemoney",
    "/dashboard/admin/transfers",
    "/dashboard/admin/financial-summary",
    "/dashboard/admin/transfer-approvals",
    "/dashboard/admin/transfer-gains",
    "/dashboard/admin/cash-requests",
    "/dashboard/admin/cash-deposits",
    "/dashboard/admin/payment-intents",
    "/dashboard/admin/payment-requests",
    "/dashboard/admin/ops/liquidity-bif",
    "/dashboard/admin/credit-history",
    "/dashboard/admin/credit-lines",
    "/dashboard/admin/credit-lines/repay",
    "/dashboard/admin/settings",
    "/dashboard/admin/kyc/reviews",
    "/dashboard/admin/analytics",
    "/dashboard/admin/interface-mode",
  ],
  expert: ["*"],
};

const ADMIN_UI_ALLOWED_GROUPS = {
  simple: ["surveillance", "operations", "microfinance", "config", "modeAgent"],
  intermediate: ["surveillance", "operations", "microfinance", "config", "modeAgent"],
  expert: [
    "surveillance",
    "assistants",
    "p2p",
    "escrowLedger",
    "operations",
    "microfinance",
    "tontines",
    "config",
    "modeAgent",
  ],
};

export function normalizeAdminUiMode(value) {
  return ADMIN_UI_MODES[value] ? value : DEFAULT_MODE;
}

export function getAdminUiMode() {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    return normalizeAdminUiMode(window.localStorage.getItem(ADMIN_UI_MODE_KEY));
  } catch {
    return DEFAULT_MODE;
  }
}

export function setAdminUiMode(mode) {
  const normalized = normalizeAdminUiMode(mode);
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(ADMIN_UI_MODE_KEY, normalized);
    window.dispatchEvent(new CustomEvent(ADMIN_UI_MODE_CHANGED_EVENT, { detail: normalized }));
  } catch {}
  return normalized;
}

export function subscribeAdminUiMode(callback) {
  if (typeof window === "undefined") return () => {};
  const handleChange = () => callback(getAdminUiMode());
  const handleCustom = (event) => callback(normalizeAdminUiMode(event?.detail));
  window.addEventListener("storage", handleChange);
  window.addEventListener(ADMIN_UI_MODE_CHANGED_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(ADMIN_UI_MODE_CHANGED_EVENT, handleCustom);
  };
}

export function isAdminPathAllowed(pathname, mode = DEFAULT_MODE) {
  const normalizedMode = normalizeAdminUiMode(mode);
  const allowedPrefixes = ADMIN_UI_ALLOWED_PREFIXES[normalizedMode] || [];
  if (allowedPrefixes.includes("*")) return true;
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`));
}

export function getAdminUiVisibleGroups(mode = DEFAULT_MODE) {
  return ADMIN_UI_ALLOWED_GROUPS[normalizeAdminUiMode(mode)] || ADMIN_UI_ALLOWED_GROUPS[DEFAULT_MODE];
}

export function getDefaultAdminRouteForMode(mode = DEFAULT_MODE) {
  const normalizedMode = normalizeAdminUiMode(mode);
  if (normalizedMode === "simple") return "/dashboard/admin/users";
  if (normalizedMode === "intermediate") return "/dashboard/admin/overview";
  return "/dashboard/admin/overview";
}
