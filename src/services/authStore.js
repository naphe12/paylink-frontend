const RAW_API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const RAW_API_FALLBACK_URL = (import.meta.env.VITE_API_FALLBACK_URL || "").trim().replace(/\/+$/, "");
const PROD_API_URL = "https://api.pesapaid.com";
const LEGACY_RAILWAY_API_URL = "https://web-production-448ce.up.railway.app";

const listeners = new Set();
let refreshPromise = null;
let authRedirectInFlight = false;
let state = {
  accessToken: readStoredAccessToken(),
  user: readStoredUser(),
  csrfToken: readStoredCsrfToken(),
  bootstrapped: false,
};

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

function getRuntimePreferredApiUrl() {
  if (typeof window === "undefined") return "";
  const host = String(window.location.hostname || "").toLowerCase();
  if (
    host === "pesapaid.com" ||
    host === "www.pesapaid.com" ||
    host === "app.pesapaid.com"
  ) {
    return PROD_API_URL;
  }
  return "";
}

function resolveApiConfig() {
  const preferred = getRuntimePreferredApiUrl();
  if (!preferred && RAW_API_URL) {
    return {
      apiUrl: RAW_API_URL,
      fallbackApiUrl: RAW_API_FALLBACK_URL,
    };
  }

  if (!RAW_API_URL) {
    return {
      apiUrl: preferred,
      fallbackApiUrl: RAW_API_FALLBACK_URL,
    };
  }

  if (RAW_API_URL === LEGACY_RAILWAY_API_URL && preferred) {
    return {
      apiUrl: preferred,
      fallbackApiUrl: RAW_API_FALLBACK_URL || RAW_API_URL,
    };
  }

  return {
    apiUrl: RAW_API_URL,
    fallbackApiUrl: RAW_API_FALLBACK_URL,
  };
}

function getApiBases() {
  const { apiUrl, fallbackApiUrl } = resolveApiConfig();
  return [...new Set([apiUrl, fallbackApiUrl].filter(Boolean))].length
    ? [...new Set([apiUrl, fallbackApiUrl].filter(Boolean))]
    : [""];
}

function buildTarget(base, path) {
  return base ? `${base}${path}` : path;
}

function readStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredAccessToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem("access_token");
  } catch {
    return null;
  }
}

function readStoredCsrfToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("csrf_token");
  } catch {
    return null;
  }
}

function persistMetadata(user, csrfToken) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("access_token");
    if (user) {
      window.localStorage.setItem("user", JSON.stringify(user));
      if (user.role) window.localStorage.setItem("role", String(user.role));
      if (user.user_id) window.localStorage.setItem("user_id", String(user.user_id));
    } else {
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("role");
      window.localStorage.removeItem("user_id");
    }
    if (csrfToken) {
      window.localStorage.setItem("csrf_token", csrfToken);
    } else {
      window.localStorage.removeItem("csrf_token");
    }
  } catch {}
}

function persistAccessToken(accessToken) {
  if (typeof window === "undefined") return;
  try {
    if (accessToken) {
      window.sessionStorage.setItem("access_token", accessToken);
    } else {
      window.sessionStorage.removeItem("access_token");
    }
  } catch {}
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
  return state;
}

export function getAccessToken() {
  return state.accessToken;
}

export function getCurrentUser() {
  return state.user;
}

export function getCurrentRole() {
  return state.user?.role || "client";
}

export function setSessionFromPayload(payload) {
  state = {
    ...state,
    accessToken: payload?.access_token || null,
    user: payload?.user || null,
    csrfToken: payload?.csrf_token || null,
    bootstrapped: true,
  };
  persistMetadata(state.user, state.csrfToken);
  persistAccessToken(state.accessToken);
  emit();
  return state;
}

export function clearSession() {
  state = {
    accessToken: null,
    user: null,
    csrfToken: null,
    bootstrapped: true,
  };
  persistMetadata(null, null);
  persistAccessToken(null);
  emit();
}

export function redirectToAuth(reason = "expired") {
  clearSession();
  if (typeof window === "undefined" || authRedirectInFlight) return;
  const currentPath = `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
  if (currentPath.startsWith("/auth")) return;
  authRedirectInFlight = true;
  try {
    if (reason) {
      window.sessionStorage.setItem("auth_redirect_reason", String(reason));
    }
  } catch {}
  window.location.replace("/auth");
}

export function suspendForAuthRedirect(reason = "expired") {
  redirectToAuth(reason);
  if (typeof window !== "undefined") {
    return new Promise(() => {});
  }
  return Promise.reject(new Error("Session expiree. Redirection vers la connexion..."));
}

async function fetchAuthEndpoint(path, options = {}) {
  let lastError = null;
  for (const base of getApiBases()) {
    try {
      const res = await fetch(buildTarget(base, path), options);
      if (res.ok) {
        return res;
      }
      if (res.status === 401 || res.status === 403) {
        return res;
      }
      lastError = new Error(`${path} -> ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`${path} -> failed`);
}

export async function refreshAccessToken(options = {}) {
  if (refreshPromise) return refreshPromise;
  const allowStoredSessionFallback = Boolean(options?.allowStoredSessionFallback);

  const csrfToken = state.csrfToken || readStoredCsrfToken();
  if (!csrfToken) {
    if (allowStoredSessionFallback && state.accessToken && state.user) {
      state = { ...state, bootstrapped: true, csrfToken: null };
      emit();
      return {
        access_token: state.accessToken,
        user: state.user,
      };
    }
    clearSession();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetchAuthEndpoint("/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRF-Token": csrfToken,
        },
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const payload = await res.json();
      setSessionFromPayload(payload);
      return payload;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function bootstrapAuth() {
  if (state.bootstrapped) return state;
  const payload = await refreshAccessToken({ allowStoredSessionFallback: true });
  if (!payload) {
    state = { ...state, bootstrapped: true };
    emit();
  }
  return state;
}

export async function logout() {
  const csrfToken = state.csrfToken || readStoredCsrfToken();
  try {
    if (csrfToken) {
      await fetchAuthEndpoint("/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRF-Token": csrfToken,
        },
      });
    }
  } catch {
    // local cleanup still happens below
  } finally {
    clearSession();
  }
}
