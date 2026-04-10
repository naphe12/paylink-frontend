export const CLIENT_UI_MODE_KEY = "client-ui-mode";
export const CLIENT_UI_MODE_CHANGED_EVENT = "client-ui-mode-changed";

export const CLIENT_UI_MODES = {
  simple: {
    key: "simple",
    label: "Simple",
    description: "Fonctions essentielles au quotidien.",
  },
  expert: {
    key: "expert",
    label: "Expert",
    description: "Interface complete avec tous les modules avances.",
  },
};

const DEFAULT_MODE = "simple";

const EXPERT_ONLY_PATH_PREFIXES = [
  "/dashboard/client/savings",
  "/dashboard/client/cards",
  "/dashboard/client/business",
  "/dashboard/client/merchant-api",
  "/dashboard/client/pots",
  "/dashboard/client/tontines",
  "/dashboard/client/crypto-pay",
  "/dashboard/client/escrow-agent",
  "/dashboard/client/p2p-agent",
  "/app/p2p",
];

const CLIENT_UI_VISIBLE_GROUPS = {
  simple: ["wallet", "payments", "assistants", "credit", "account"],
  expert: ["wallet", "payments", "assistants", "escrowP2p", "credit", "community", "account"],
};

export function normalizeClientUiMode(value) {
  return CLIENT_UI_MODES[value] ? value : DEFAULT_MODE;
}

export function getClientUiMode() {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    return normalizeClientUiMode(window.localStorage.getItem(CLIENT_UI_MODE_KEY));
  } catch {
    return DEFAULT_MODE;
  }
}

export function setClientUiMode(mode) {
  const normalized = normalizeClientUiMode(mode);
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(CLIENT_UI_MODE_KEY, normalized);
    window.dispatchEvent(new CustomEvent(CLIENT_UI_MODE_CHANGED_EVENT, { detail: normalized }));
  } catch (error) {
    console.debug("Client UI mode storage unavailable", error);
  }
  return normalized;
}

export function subscribeClientUiMode(callback) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = () => callback(getClientUiMode());
  const handleCustom = (event) => callback(normalizeClientUiMode(event?.detail));
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CLIENT_UI_MODE_CHANGED_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CLIENT_UI_MODE_CHANGED_EVENT, handleCustom);
  };
}

function pathStartsWithPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`);
}

export function isClientPathAllowed(pathname, mode = DEFAULT_MODE) {
  const normalizedMode = normalizeClientUiMode(mode);
  if (normalizedMode === "expert") return true;
  return !EXPERT_ONLY_PATH_PREFIXES.some((prefix) => pathStartsWithPrefix(pathname, prefix));
}

export function getClientUiVisibleGroups(mode = DEFAULT_MODE) {
  return CLIENT_UI_VISIBLE_GROUPS[normalizeClientUiMode(mode)] || CLIENT_UI_VISIBLE_GROUPS[DEFAULT_MODE];
}

export function getDefaultClientRouteForMode(mode = DEFAULT_MODE) {
  const normalizedMode = normalizeClientUiMode(mode);
  if (normalizedMode === "simple") return "/dashboard/client/overview";
  return "/dashboard/client/overview";
}
