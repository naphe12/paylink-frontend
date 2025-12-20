// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || "";

async function parseJsonOrThrow(res, path, method = "GET") {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(
    `${method} ${path} -> non-JSON (${res.status}): ${text?.slice(0, 200) || ""}`
  );
}

const api = {
  async get(path) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return parseJsonOrThrow(res, path, "GET");
  },

  async post(path, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
    return parseJsonOrThrow(res, path, "POST");
  },

  async patch(path, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}`);
    return parseJsonOrThrow(res, path, "PATCH");
  },

  async put(path, data) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(`PUT ${path} -> ${res.status}`);
    return parseJsonOrThrow(res, path, "PUT");
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
  async scanAgentQr(payload) {
    return this.post("/agent/qr/scan", payload);
  },
  async confirmAgentQr(payload) {
    return this.post("/agent/qr/confirm", payload);
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
    return this.get(`/admin/notifications${query ? `?${query}` : ""}`);
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
      if (value !== undefined && value !== null && value !== "") search.append(key, value);
    });
    const query = search.toString();
    return this.get(`/wallet/cash/requests${query ? `?${query}` : ""}`);
  },
  async requestCashDeposit(payload) {
    return this.post("/wallet/cash/deposit", payload);
  },
  async requestCashWithdraw(payload) {
    return this.post("/wallet/cash/withdraw", payload);
  },
  async getAgentAccounts() {
    return this.get("/wallet/cash/agent-accounts");
  },
  async getCreditHistory() {
    return this.get("/wallet/credit/history");
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
      if (value !== undefined && value !== null && value !== "") search.append(key, value);
    });
    const query = search.toString();
    return this.get(`/admin/cash-requests/${query ? `?${query}` : ""}`);
  },
  async approveCashRequest(requestId, payload = {}) {
    return this.post(`/admin/cash-requests/${requestId}/approve`, payload);
  },
  async rejectCashRequest(requestId, payload = {}) {
    return this.post(`/admin/cash-requests/${requestId}/reject`, payload);
  },
  async getAdminCreditHistory(params = {}) {
    const search = new URLSearchParams();
    if (params.user_id) search.append("user_id", params.user_id);
    if (params.limit) search.append("limit", params.limit);
    const query = search.toString();
    return this.get(`/admin/credit-history${query ? `?${query}` : ""}`);
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
  async getPendingExternalTransfers() {
    return this.get("/agent/external/pending");
  },
  async getReadyExternalTransfers() {
    return this.get("/agent/external/ready");
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
    if (params.status) search.append("status", params.status);
    if (typeof params.overdue_only === "boolean") {
      search.append("overdue_only", params.overdue_only ? "1" : "0");
    }
    if (params.limit) search.append("limit", params.limit);
    const query = search.toString();
    const path = `/admin/loans/${query ? `?${query}` : ""}`;
    try {
      return await this.get(path);
    } catch (e) {
      return this.get(`/admin/loans/list${query ? `?${query}` : ""}`);
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

  // ----------- USERS -----------
  async getUsers(query = "") {
    return this.get(`/admin/users${query ? `?q=${query}` : ""}`);
  },
  async getUser(userId) {
    return this.get(`/admin/users/${userId}`);
  },
};

export default api;
