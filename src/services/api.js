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
  async del(path) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}`);
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
  async getCreditLineEvents(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return this.get(`/wallet/credit/line/events${query ? `?${query}` : ""}`);
  },
  async getFinancialSummary() {
    return this.get("/wallet/financial-summary");
  },
  async getAdminFinancialSummary(userId) {
    return this.get(`/wallet/admin/financial-summary/${userId}`);
  },
  async deleteAdminUser(userId) {
    return this.del(`/admin/users/${userId}`);
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
  async getPendingExternalTransfers() {
    return this.get("/agent/external/pending");
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
  async getAdminCreditLineDetail(creditLineId) {
    return this.get(`/admin/credit-lines/${creditLineId}`);
  },
  async increaseAdminCreditLine(creditLineId, amount) {
    return this.post(`/admin/credit-lines/${creditLineId}/increase`, { amount });
  },
  async repayAdminCreditLine(creditLineId, amount) {
    return this.post(`/admin/credit-lines/${creditLineId}/repay`, { amount });
  },
};

export default api;
