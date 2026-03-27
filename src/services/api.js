// src/services/api.js
import { getAccessToken, refreshAccessToken } from "@/services/authStore";

const RAW_API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const RAW_API_FALLBACK_URL = (import.meta.env.VITE_API_FALLBACK_URL || "").trim().replace(/\/+$/, "");
const PROD_API_URL = "https://api.pesapaid.com";
const LEGACY_RAILWAY_API_URL = "https://web-production-448ce.up.railway.app";
const API_FAILURE_TTL_MS = 5 * 60 * 1000;
const API_FAILURE_KEY_PREFIX = "api-failure:";

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

const { apiUrl: API_URL, fallbackApiUrl: API_FALLBACK_URL } = resolveApiConfig();

export function getConfiguredApiUrl() {
  return API_URL;
}

export function getConfiguredApiFallbackUrl() {
  return API_FALLBACK_URL;
}

export function getConfiguredApiBases() {
  const bases = [API_URL, API_FALLBACK_URL].filter(Boolean);
  if (bases.length > 0) {
    const uniqueBases = [...new Set(bases)];
    const healthyBases = [];
    const unhealthyBases = [];
    for (const base of uniqueBases) {
      if (isApiTemporarilyUnhealthy(base)) {
        unhealthyBases.push(base);
      } else {
        healthyBases.push(base);
      }
    }
    return [...healthyBases, ...unhealthyBases];
  }
  return [""];
}

export async function fetchBackendVersion() {
  const res = await fetchPublicApi("/version", { method: "GET" });
  if (!res.ok) {
    throw new Error(`GET /version -> ${res.status}`);
  }
  return parseJsonOrThrow(res, "/version", "GET");
}

function getApiBases() {
  return getConfiguredApiBases();
}

function buildTarget(base, path) {
  if (!base) return path;
  return `${base}${path}`;
}

function getFailureStorageKey(base) {
  return `${API_FAILURE_KEY_PREFIX}${base}`;
}

function markApiFailure(base) {
  if (!base || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(getFailureStorageKey(base), String(Date.now()));
  } catch {}
}

function clearApiFailure(base) {
  if (!base || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(getFailureStorageKey(base));
  } catch {}
}

function isApiTemporarilyUnhealthy(base) {
  if (!base || typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(getFailureStorageKey(base));
    if (!raw) return false;
    const failedAt = Number(raw);
    if (!Number.isFinite(failedAt)) return false;
    if (Date.now() - failedAt < API_FAILURE_TTL_MS) {
      return true;
    }
    clearApiFailure(base);
  } catch {}
  return false;
}

async function fetchWithFallback(path, options) {
  const tried = [];
  let lastErr = null;
  for (const base of getApiBases()) {
    const target = buildTarget(base, path);
    tried.push(target);
    try {
      const response = await fetch(target, options);
      clearApiFailure(base);
      return response;
    } catch (err) {
      markApiFailure(base);
      lastErr = err;
    }
  }
  const error = lastErr || new Error("Failed to fetch");
  error.__triedTargets = tried;
  throw error;
}

export async function fetchPublicApi(path, options = {}) {
  return fetchWithFallback(path, options);
}

function isHtmlResponse(res) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  return contentType.includes("text/html");
}

const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ð)/;

function repairLikelyMojibake(value) {
  if (typeof value !== "string" || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }
  try {
    const bytes = Uint8Array.from(Array.from(value, (ch) => ch.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!repaired || repaired === value) {
      return value;
    }
    const originalNoise = (value.match(MOJIBAKE_PATTERN) || []).length;
    const repairedNoise = (repaired.match(MOJIBAKE_PATTERN) || []).length;
    return repairedNoise < originalNoise ? repaired : value;
  } catch {
    return value;
  }
}

function normalizeApiPayload(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeApiPayload);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeApiPayload(nestedValue)])
    );
  }
  return repairLikelyMojibake(value);
}

async function parseJsonOrThrow(res, path, method = "GET") {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await res.json();
    return normalizeApiPayload(payload);
  }
  const text = await res.text();
  throw new Error(
    `${method} ${path} -> non-JSON (${res.status}): ${text?.slice(0, 200) || ""}`
  );
}

async function readErrorMessage(res, path, method = "GET") {
  const requestIdHeader = res.headers.get("x-request-id") || res.headers.get("X-Request-Id");
  const statusPrefix = `${method} ${path} -> ${res.status}`;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = normalizeApiPayload(await res.json());
      const requestIdPayload = payload?.request_id;
      const requestId = requestIdPayload || requestIdHeader;
      const requestIdSuffix = requestId ? ` [request_id=${requestId}]` : "";
      const detail = payload?.detail;
      if (Array.isArray(detail)) {
        const msg = detail
          .map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
          .join(" | ");
        return `${statusPrefix}: ${msg}${requestIdSuffix}`;
      }
      if (typeof detail === "string" && detail.trim()) {
        return `${statusPrefix}: ${detail}${requestIdSuffix}`;
      }
      const fallback = payload?.error || payload?.message;
      if (typeof fallback === "string" && fallback.trim()) {
        return `${statusPrefix}: ${fallback}${requestIdSuffix}`;
      }
      return `${statusPrefix}${requestIdSuffix}`;
    } catch {
      const requestIdSuffix = requestIdHeader ? ` [request_id=${requestIdHeader}]` : "";
      return `${statusPrefix}${requestIdSuffix}`;
    }
  }
  const text = await res.text();
  const requestIdSuffix = requestIdHeader ? ` [request_id=${requestIdHeader}]` : "";
  return `${statusPrefix}${text ? `: ${text.slice(0, 200)}` : ""}${requestIdSuffix}`;
}

function formatNetworkError(path, method = "GET", err) {
  const tried = Array.isArray(err?.__triedTargets) ? err.__triedTargets.join(" | ") : buildTarget(API_URL, path);
  const reason = err?.message ? ` (${err.message})` : "";
  return `${method} ${path} -> impossible de joindre l'API: ${tried}${reason}. Verifiez l'URL backend, le CORS et la connectivite reseau.`;
}

const api = {
  newIdempotencyKey(scope = "request") {
    const rand =
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${scope}-${rand}`;
  },

  async get(path, allowRefresh = true) {
    const token = getAccessToken();
    let res = null;
    let lastHtmlResponse = null;
    const requestOptions = {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };
    try {
      for (const base of getApiBases()) {
        const target = buildTarget(base, path);
        try {
          const candidate = await fetch(target, requestOptions);
          if (isHtmlResponse(candidate)) {
            lastHtmlResponse = { res: candidate, target };
            continue;
          }
          res = candidate;
          break;
        } catch {
          continue;
        }
      }
    } catch (err) {
      throw new Error(formatNetworkError(path, "GET", err));
    }
    if (!res && lastHtmlResponse) {
      throw new Error(
        `GET ${path} -> reponse HTML recue depuis ${lastHtmlResponse.target}. Verifiez que VITE_API_URL pointe vers le backend et non le frontend.`
      );
    }
    if (!res) {
      try {
        res = await fetchWithFallback(path, requestOptions);
      } catch (err) {
        throw new Error(formatNetworkError(path, "GET", err));
      }
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.get(path, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "GET"));
    return parseJsonOrThrow(res, path, "GET");
  },

  async post(path, data, allowRefresh = true) {
    const token = getAccessToken();
    let res;
    try {
      res = await fetchWithFallback(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      throw new Error(formatNetworkError(path, "POST", err));
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.post(path, data, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "POST"));
    return parseJsonOrThrow(res, path, "POST");
  },

  async postWithHeaders(path, data, extraHeaders = {}, allowRefresh = true) {
    const token = getAccessToken();
    let res;
    try {
      res = await fetchWithFallback(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...extraHeaders,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      throw new Error(formatNetworkError(path, "POST", err));
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.postWithHeaders(path, data, extraHeaders, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "POST"));
    return parseJsonOrThrow(res, path, "POST");
  },

  async postIdempotent(path, data, idempotencyKey, scope = "request") {
    const key = idempotencyKey || this.newIdempotencyKey(scope);
    return this.postWithHeaders(path, data, { "Idempotency-Key": key });
  },

  async patch(path, data, allowRefresh = true) {
    const token = getAccessToken();
    let res;
    try {
      res = await fetchWithFallback(path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      throw new Error(formatNetworkError(path, "PATCH", err));
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.patch(path, data, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "PATCH"));
    return parseJsonOrThrow(res, path, "PATCH");
  },

  async put(path, data, allowRefresh = true) {
    const token = getAccessToken();
    let res;
    try {
      res = await fetchWithFallback(path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
    } catch (err) {
      throw new Error(formatNetworkError(path, "PUT", err));
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.put(path, data, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "PUT"));
    return parseJsonOrThrow(res, path, "PUT");
  },
  async del(path, allowRefresh = true) {
    const token = getAccessToken();
    let res;
    try {
      res = await fetchWithFallback(path, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } catch (err) {
      throw new Error(formatNetworkError(path, "DELETE", err));
    }
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return this.del(path, false);
      }
    }
    if (!res.ok) throw new Error(await readErrorMessage(res, path, "DELETE"));
    return parseJsonOrThrow(res, path, "DELETE");
  },

  // ----------- TONTINES -----------
  async getTontines() {
    return this.get("/tontines/");
  },
  async getTontine(id) {
    return this.get(`/tontines/${id}`);
  },
  async createTontine(data) {
    return this.post("/tontines/", data);
  },
  async contributeTontine(id, amount) {
    return this.post(`/tontines/${id}/contribute`, { amount });
  },
  async claimTontine(id) {
    return this.post(`/tontines/${id}/claim`);
  },

  async getWalletLedger(walletId, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, value);
      }
    });
    const query = search.toString();
    return this.get(`/wallet/ledger/${walletId}${query ? `?${query}` : ""}`);
  },

  async getAgentHistory(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, value);
      }
    });
    const query = search.toString();
    return this.get(`/agent/history${query ? `?${query}` : ""}`);
  },

  async getAgentDashboard() {
    return this.get("/agent/dashboard");
  },
  async getAgentAssignments(agentId) {
    const query = new URLSearchParams();
    if (agentId) query.append("agent_id", agentId);
    return this.get(`/agent/assignments${query.toString() ? `?${query.toString()}` : ""}`);
  },
  async confirmAgentAssignment(assignmentId, payload) {
    return this.post(`/agent/assignments/${assignmentId}/confirm`, payload);
  },
  async scanAgentQr(payload) {
    return this.post("/agent/qr/scan", payload);
  },
  async confirmAgentQr(payload) {
    return this.post("/agent/qr/confirm", payload);
  },
  async getOpsLiquidityBif() {
    return this.get("/ops/liquidity/bif");
  },

  async getExchangeRate(origin = "EUR", destination) {
    const search = new URLSearchParams();
    if (origin) search.append("origin", origin);
    if (destination) search.append("destination", destination);
    const query = search.toString();
    return this.get(`/api/exchange-rate/${query ? `?${query}` : ""}`);
  },

  // ----------- ADMIN / ANALYTICS -----------
  async getAdminPremiumAnalytics() {
    return this.get("/admin/analytics/premium");
  },
  async getAdminTontineAnalytics() {
    return this.get("/admin/analytics/tontines");
  },
  async getAdminNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/notifications/${query ? `?${query}` : ""}`);
  },

  // ----------- AGENTS -----------
  async getAgents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/agents${query ? `?${query}` : ""}`);
  },
  async toggleAgent(agentId) {
    return this.patch(`/admin/agents/${agentId}/toggle`);
  },
  async updateAgentCommission(agentId, payload) {
    return this.patch(`/admin/agents/${agentId}/commission`, payload);
  },
  async getAgentAdminHistory(agentId, limit = 50) {
    return this.get(`/admin/agents/${agentId}/history?limit=${limit}`);
  },

  // ----------- WALLET / CASH / CREDIT -----------
  async getCashRequests(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "type") {
        search.append("request_type", String(value).toUpperCase());
        return;
      }
      if (key === "request_type") {
        search.append("request_type", String(value).toUpperCase());
        return;
      }
      search.append(key, value);
    });
    const query = search.toString();
    return this.get(`/wallet/cash/requests${query ? `?${query}` : ""}`);
  },
  async requestCashDeposit(payload, idempotencyKey = null) {
    return this.postIdempotent("/wallet/cash/deposit", payload, idempotencyKey, "wallet-cash-deposit");
  },
  async requestCashWithdraw(payload, idempotencyKey = null) {
    return this.postIdempotent("/wallet/cash/withdraw", payload, idempotencyKey, "wallet-cash-withdraw");
  },
  async requestUsdcWithdraw(payload) {
    return this.post("/wallet/usdc/withdraw", payload);
  },
  async getUsdcWallet() {
    return this.get("/wallet/usdc");
  },
  async getCryptoWalletBalances() {
    return this.get("/wallet/crypto/balances");
  },
  async getCryptoWalletHistory(tokenSymbol, params = {}) {
    const search = new URLSearchParams({ token_symbol: tokenSymbol });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, value);
      }
    });
    return this.get(`/wallet/crypto/history?${search.toString()}`);
  },
  async getCryptoDepositInstructions(tokenSymbol, network = "POLYGON") {
    const query = new URLSearchParams({
      token_symbol: tokenSymbol,
      network,
    }).toString();
    return this.get(`/wallet/crypto/deposit-instructions?${query}`);
  },
  async getCryptoDepositRequests(tokenSymbol) {
    const query = tokenSymbol
      ? `?${new URLSearchParams({ token_symbol: tokenSymbol }).toString()}`
      : "";
    return this.get(`/wallet/crypto/deposit-requests${query}`);
  },
  async createCryptoDepositRequest(payload) {
    return this.post("/wallet/crypto/deposit-requests", payload);
  },
  async cancelCryptoDepositRequest(requestId) {
    return this.post(`/wallet/crypto/deposit-requests/${requestId}/cancel`, {});
  },
  async getAgentAccounts() {
    return this.get("/wallet/cash/agent-accounts");
  },
  async getCreditHistory() {
    return this.get("/wallet/credit/history");
  },
  async getCreditLineEvents(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/wallet/credit/line/events${query ? `?${query}` : ""}`);
  },
  async getFinancialSummary() {
    return this.get("/wallet/financial-summary");
  },
  async getClientDashboardOverview() {
    return this.get("/wallet/overview");
  },
  async getAdminFinancialSummary(userId) {
    return this.get(`/wallet/admin/financial-summary/${userId}`);
  },
  async getAdminDashboardSummary() {
    return this.get("/api/admin/dashboard/summary");
  },
  async getAdminDashboardTimeseries(days = 14) {
    return this.get(`/api/admin/dashboard/timeseries?days=${days}`);
  },
  async getAdminDashboardTimeseries30d() {
    return this.get("/api/admin/dashboard/timeseries?days=30");
  },
  async getAdminAnalyticsOverview() {
    return this.get("/admin/analytics/overview");
  },
  async deleteAdminUser(userId) {
    return this.del(`/admin/users/${userId}`);
  },
  async createAdminClient(payload = {}) {
    return this.post("/admin/users/clients", payload);
  },
  async repairAdminUserFinancialAccounts(userId) {
    return this.post(`/admin/users/${userId}/repair-financial-accounts`, {});
  },
  async getBalanceEvents(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/wallet/balance-events${query ? `?${query}` : ""}`);
  },

  // ----------- ADMIN CASH / CREDIT -----------
  async getAdminCashRequests(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "type") {
        search.append("request_type", String(value).toUpperCase());
        return;
      }
      if (key === "request_type") {
        search.append("request_type", String(value).toUpperCase());
        return;
      }
      if (key === "created_from" || key === "created_to") {
        search.append(key, value);
        return;
      }
      search.append(key, value);
    });
    const query = search.toString();
    return this.get(`/admin/cash-requests/${query ? `?${query}` : ""}`);
  },
  async approveCashRequest(requestId, payload = {}, idempotencyKey = null) {
    return this.postIdempotent(
      `/admin/cash-requests/${requestId}/approve`,
      payload,
      idempotencyKey,
      `admin-cash-approve-${requestId}`
    );
  },
  async rejectCashRequest(requestId, payload = {}, idempotencyKey = null) {
    return this.postIdempotent(
      `/admin/cash-requests/${requestId}/reject`,
      payload,
      idempotencyKey,
      `admin-cash-reject-${requestId}`
    );
  },
  async searchAdminCashUsers(q = "", limit = 50) {
    const search = new URLSearchParams();
    if (q) search.append("q", q);
    if (limit) search.append("limit", String(limit));
    return this.get(`/admin/cash-requests/users${search.toString() ? `?${search.toString()}` : ""}`);
  },
  async adminCashDeposit(payload = {}, idempotencyKey = null) {
    return this.postIdempotent("/admin/cash-requests/deposit", payload, idempotencyKey, "admin-cash-deposit");
  },
  async adminCashWithdraw(payload = {}, idempotencyKey = null) {
    return this.postIdempotent("/admin/cash-requests/withdraw", payload, idempotencyKey, "admin-cash-withdraw");
  },
  async getAdminCreditHistory(params = {}) {
    const search = new URLSearchParams();
    if (params.user_id) search.append("user_id", params.user_id);
    if (params.limit) search.append("limit", params.limit);
    if (params.offset !== undefined && params.offset !== null) search.append("offset", params.offset);
    const query = search.toString();
    return this.get(`/admin/credit-history${query ? `?${query}` : ""}`);
  },
  async getAdminCreditLineEvents(params = {}) {
    const search = new URLSearchParams();
    if (params.user_id) search.append("user_id", params.user_id);
    if (params.limit) search.append("limit", params.limit);
    if (params.offset !== undefined && params.offset !== null) search.append("offset", params.offset);
    const query = search.toString();
    return this.get(`/admin/credit-history/events${query ? `?${query}` : ""}`);
  },
  async getAdminBalanceEvents(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/transfers/balance-events${query ? `?${query}` : ""}`);
  },
  async getAdminUserBalanceEvents(userId, params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(
      `/admin/transfers/users/${userId}/balance-events${query ? `?${query}` : ""}`
    );
  },
  async getAdminWallets(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/wallets/${query ? `?${query}` : ""}`);
  },
  async getAdminWalletHistory(walletId, params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/wallets/${walletId}/history${query ? `?${query}` : ""}`);
  },
  async getAdminCryptoWalletSummary(userId) {
    return this.get(`/admin/wallets/crypto/${userId}/summary`);
  },
  async ensureAdminCryptoWallet(userId, tokenSymbol) {
    const query = new URLSearchParams({ token_symbol: tokenSymbol }).toString();
    return this.post(`/admin/wallets/crypto/${userId}/ensure${query ? `?${query}` : ""}`, {});
  },
  async getAdminCryptoWalletHistory(userId, tokenSymbol, params = {}) {
    const query = new URLSearchParams(
      Object.entries({ ...params, token_symbol: tokenSymbol }).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    ).toString();
    return this.get(`/admin/wallets/crypto/${userId}/history${query ? `?${query}` : ""}`);
  },
  async getAdminPaymentRequests(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/payment-requests${query ? `?${query}` : ""}`);
  },
  async getAdminDebtors(limit = 200) {
    const search = new URLSearchParams();
    if (limit) search.append("limit", limit);
    const q = search.toString();
    return this.get(`/admin/payment-requests/debtors${q ? `?${q}` : ""}`);
  },
  async createAdminPaymentRequest(payload = {}) {
    return this.post("/admin/payment-requests", payload);
  },

  // ----------- TRANSFERS / TX -----------
  async getAdminTransferGains(period = "day") {
    const search = new URLSearchParams();
    if (period) search.append("period", period);
    const query = search.toString();
    return this.get(`/admin/transfers/gains${query ? `?${query}` : ""}`);
  },
  async getAdminTransactionsAudit(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/transactions-audit${query ? `?${query}` : ""}`);
  },
  async getAdminErrors(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/errors${query ? `?${query}` : ""}`);
  },
  async getAdminWalletAnalysis(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/wallet-analysis${query ? `?${query}` : ""}`);
  },
  async getUnbalancedJournals(limit = 100) {
    const search = new URLSearchParams();
    if (limit) search.append("limit", String(limit));
    return this.get(`/backoffice/monitoring/unbalanced-journals${search.toString() ? `?${search.toString()}` : ""}`);
  },
  async getUnbalancedJournalEntries(journalId) {
    return this.get(`/backoffice/monitoring/unbalanced-journals/${journalId}/entries`);
  },
  async getIdempotencyScopes(params = {}) {
    const search = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/backoffice/monitoring/idempotency-scopes${search ? `?${search}` : ""}`);
  },
  async p2pSandboxCryptoLocked(tradeId, payload = {}) {
    return this.post(`/api/p2p/trades/${tradeId}/sandbox/crypto-locked`, payload);
  },
  async escrowSandboxAction(orderId, action) {
    return this.post(`/escrow/orders/${orderId}/sandbox/${action}`, {});
  },
  async escrowSandboxUsdcWebhook(payload = {}) {
    return this.post("/backoffice/webhooks/sandbox/usdc", payload);
  },
  async getPendingExternalTransfers() {
    return this.get("/agent/external/pending");
  },
  async searchAgentCashUsers(q = "", limit = 50) {
    const search = new URLSearchParams();
    if (q) search.append("q", q);
    if (limit) search.append("limit", String(limit));
    return this.get(`/agent/cash/users${search.toString() ? `?${search.toString()}` : ""}`);
  },
  async agentCashDeposit(payload = {}, idempotencyKey = null) {
    return this.postIdempotent("/agent/cash/deposit", payload, idempotencyKey, "agent-cash-deposit");
  },
  async createAgentClient(payload = {}) {
    return this.post("/agent/clients", payload);
  },
  async getReadyExternalTransfers() {
    return this.get("/agent/external/ready");
  },
  async getExternalUsers() {
    return this.get("/agent/external/users");
  },
  async getExternalBeneficiariesByUser(userId) {
    return this.get(`/agent/external/beneficiaries?user_id=${userId}`);
  },
  async createAgentExternalTransfer(payload = {}, idempotencyKey = null) {
    return this.postIdempotent(
      "/agent/external/create",
      payload,
      idempotencyKey,
      "agent-external-transfer"
    );
  },
  async completeExternalTransfer(transferId) {
    return this.post(`/agent/external/${transferId}/close`, {});
  },
  async approveExternalTransfer(transferId) {
    return this.post(`/wallet/transfer/transfer/external/${transferId}/approve`, {});
  },

  // ----------- LOANS -----------
  async getLoanPortfolio() {
    return this.get("/loans/me");
  },
  async applyLoan(payload) {
    return this.post("/loans/apply", payload);
  },
  async repayLoan(loanId, amount) {
    return this.post(`/loans/${loanId}/repay`, { amount });
  },
  async getAdminLoans(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, value);
      }
    });
    const query = search.toString();
    const path = `/admin/loans/${query ? `?${query}` : ""}`;
    try {
      const res = await this.get(path);
      if (res && typeof res === "object" && "items" in res && "total" in res) {
        return res;
      }
      return { items: Array.isArray(res) ? res : [], total: Array.isArray(res) ? res.length : 0 };
    } catch (e) {
      const legacy = await this.get(`/admin/loans/list${query ? `?${query}` : ""}`);
      if (legacy && typeof legacy === "object" && "items" in legacy && "total" in legacy) {
        return legacy;
      }
      return { items: Array.isArray(legacy) ? legacy : [], total: Array.isArray(legacy) ? legacy.length : 0 };
    }
  },
  async analyzeLoan(loanId) {
    return this.post(`/loans/${loanId}/analyze`, {});
  },
  async approveAdminLoan(loanId) {
    return this.post(`/admin/loans/${loanId}/approve`, {});
  },
  async disburseLoan(loanId) {
    return this.post(`/loans/${loanId}/disburse`, {});
  },
  async remindLoan(loanId, message) {
    return this.post(`/loans/${loanId}/remind`, { message });
  },
  async recomputeLoanPenalty(loanId) {
    return this.post(`/admin/loans/${loanId}/penalties/recompute`, {});
  },
  async getLoanCollaterals(loanId) {
    return this.get(`/admin/loans/${loanId}/collaterals`);
  },
  async addLoanCollateral(loanId, payload) {
    return this.post(`/admin/loans/${loanId}/collaterals`, payload);
  },
  async deleteLoanCollateral(loanId, collateralId) {
    return this.del(`/admin/loans/${loanId}/collaterals/${collateralId}`);
  },
  async getLoanDocuments(loanId) {
    return this.get(`/admin/loans/${loanId}/documents`);
  },
  async validateLoanDocuments(loanId, payload) {
    return this.post(`/admin/loans/${loanId}/documents/validate`, payload);
  },
  async getAdminLoanProducts(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/loan-products${query ? `?${query}` : ""}`);
  },
  async createAdminLoanProduct(payload) {
    return this.post("/admin/loan-products", payload);
  },
  async updateAdminLoanProduct(productId, payload) {
    return this.patch(`/admin/loan-products/${productId}`, payload);
  },
  async deleteAdminLoanProduct(productId) {
    return this.del(`/admin/loan-products/${productId}`);
  },
  async getLoanStats() {
    return this.get("/admin/loans/stats");
  },

  // ----------- KYC / AML / SECURITY -----------
  async getAdminPremiumAnalytics() {
    return this.get("/admin/analytics/premium");
  },
  async getMobileMoneyJournal(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/mobilemoney/journal${query ? `?${query}` : ""}`);
  },
  async getAmlEvents() {
    return this.get("/admin/aml/events");
  },
  async getKycSummary() {
    return this.get("/admin/kyc/summary");
  },
  async getKycPending() {
    return this.get("/admin/kyc/pending");
  },
  async validateKyc(userId) {
    return this.post(`/admin/kyc/${userId}/validate`);
  },
  async rejectKyc(userId, reason) {
    return this.post(`/admin/kyc/${userId}/reject`, { reason });
  },

  // ----------- SETTINGS / FX -----------
  async getAdminSettings() {
    return this.get("/admin/settings/general");
  },
  async updateAdminSettings(payload = {}) {
    const search = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") search.append(k, v);
    });
    const query = search.toString();
    return this.put(`/admin/settings/general${query ? `?${query}` : ""}`);
  },
  async listFxCustomRates() {
    return this.get("/admin/settings/fx-custom");
  },
  async updateFxCustomRate(currency, rate, opts = {}) {
    const search = new URLSearchParams();
    if (rate !== undefined && rate !== null) search.append("new_rate", rate);
    if (opts.is_active !== undefined) search.append("is_active", opts.is_active);
    if (opts.origin) search.append("origin", opts.origin);
    const query = search.toString();
    return this.put(`/admin/settings/fx-custom/${currency}${query ? `?${query}` : ""}`);
  },
  async createAdminTontine(payload = {}) {
    return this.post("/admin/tontines", payload);
  },

  // ----------- USERS -----------
  async getUsers(query = "") {
    return this.get(`/admin/users${query ? `?q=${query}` : ""}`);
  },
  async getUser(userId) {
    return this.get(`/admin/users/${userId}`);
  },
  async getAdminTontineMembers(tontineId) {
    return this.get(`/admin/tontines/${tontineId}/members`);
  },
  async addAdminTontineMembers(tontineId, memberIds = []) {
    return this.post(`/admin/tontines/${tontineId}/members`, { member_ids: memberIds });
  },
  async removeAdminTontineMember(tontineId, userId) {
    return this.del(`/admin/tontines/${tontineId}/members/${userId}`);
  },
  async listAdminTontines(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/tontines${query ? `?${query}` : ""}`);
  },
  async listAdminCreditLines(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/credit-lines${query ? `?${query}` : ""}`);
  },
  async createAdminCreditLine(payload) {
    return this.post("/admin/credit-lines", payload);
  },
  async getAdminCreditLineDetail(creditLineId) {
    return this.get(`/admin/credit-lines/${creditLineId}`);
  },
  async increaseAdminCreditLine(creditLineId, amount) {
    return this.post(`/admin/credit-lines/${creditLineId}/increase`, { amount });
  },
  async decreaseAdminCreditLine(creditLineId, amount) {
    return this.post(`/admin/credit-lines/${creditLineId}/decrease`, { amount });
  },
  async listAdminCreditDebtors(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/admin/credit-lines/debtors${query ? `?${query}` : ""}`);
  },
  async repayAdminCreditLine(creditLineId, amount) {
    return this.post(`/admin/credit-lines/${creditLineId}/repay`, { amount });
  },
  async repayAdminClientDebt(userId, amount) {
    return this.post(`/admin/credit-lines/users/${userId}/repay`, { amount });
  },
};

export default api;
