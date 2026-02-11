import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import WalletPage from "@/pages/dashboard/WalletPage";
import PaymentPage from "@/pages/dashboard/PaymentPage";
import TransferPage from "@/pages/dashboard/TransferPage";
import TransactionsPage from "@/pages/dashboard/TransactionsPage";
import MobileTopupPage from "@/pages/dashboard/MobileTopupPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";
import DepositPage from "@/pages/dashboard/DepositPage";
import WithdrawPage from "@/pages/dashboard/WithdrawPage";
import CreditHistoryPage from "@/pages/dashboard/CreditHistoryPage";
import CreditLinePage from "@/pages/dashboard/CreditLinePage";
import ProtectedRoute from "@/components/ProtectedRoute";
import FinancialSituationPage from "@/pages/dashboard/FinancialSituationPage";

import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/auth/AuthPage";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import ChangePasswordPage from "@/pages/dashboard/ChangePasswordPage";

import AgentTransfersPage from "@/pages/dashboard/AgentTransfersPage";
import ExternalTransferPage from "@/pages/dashboard/ExternalTransferPage";
import FxRatesPage from "@/pages/dashboard/FxRatesPage";
import BonusPage from "@/pages/dashboard/BonusPage";

import TontineCreatePage from "@/pages/tontines/TontineCreatePage";
import TontineListPage from "@/pages/tontines/TontineListPage";
import TontineDetailPage from "@/pages/tontines/TontineDetailPage";

import KYCPage from "@/pages/account/KYCPage";
import WalletLedgerPage from "@/pages/wallet/WalletLedgerPage";
import LoansPage from "@/pages/dashboard/LoansPage";

import SecurityDashboard from "@/pages/admin/SecurityDashboard";
import AdminSidebar from "@/layouts/AdminSidebar";
import AdminUsersList from "@/pages/admin/AdminUsersList";
import AdminUserProfilePanel from "@/pages/admin/AdminUserProfilePanel";
import AmlEventsPage from "@/pages/admin/AmlEventsPage";
import KYCReviewPage from "@/pages/admin/KYCReviewPage";
import RiskMonitorPage from "@/pages/admin/RiskMonitorPage";
import AdminWalletsPage from "@/pages/admin/AdminWalletsPage";
import AdminTransfersPage from "@/pages/admin/AdminTransfersPage";
import ExternalTransferApprovalsPage from "@/pages/admin/ExternalTransferApprovalsPage";
import AdminAgentsPage from "@/pages/admin/AdminAgentsPage";
import AdminFinancialSummaryPage from "@/pages/admin/AdminFinancialSummaryPage";
import MobileMoneyJournalPage from "@/pages/admin/MobileMoneyJournalPage";
import AdminTontineDashboardPage from "@/pages/admin/AdminTontineDashboardPage";
import TontineArrearsPage from "@/pages/admin/TontineArrearsPage";
import AdminLoansPage from "@/pages/admin/AdminLoansPage";
import CashRequestsPage from "@/pages/admin/CashRequestsPage";
import AdminCreditHistoryPage from "@/pages/admin/AdminCreditHistoryPage";
import AdminCreditLinesPage from "@/pages/admin/AdminCreditLinesPage";
import AdminCreditRepayPage from "@/pages/admin/AdminCreditRepayPage";
import TransactionAuditPage from "@/pages/admin/TransactionAuditPage";
import TransferGainsPage from "@/pages/admin/TransferGainsPage";
import AdminPaymentRequestsPage from "@/pages/admin/AdminPaymentRequestsPage";
import AdminMicroFinancePage from "@/pages/admin/AdminMicroFinancePage";
import AdminLoanProductsPage from "@/pages/admin/AdminLoanProductsPage";
import AdminTontineCreatePage from "@/pages/admin/AdminTontineCreatePage";
import AdminTontineMembersPage from "@/pages/admin/AdminTontineMembersPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminBalanceEventsPage from "@/pages/admin/AdminBalanceEventsPage";
import AdminUserBalanceEventsPage from "@/pages/admin/AdminUserBalanceEventsPage";

import AgentOperationPage from "@/pages/agent/AgentOperationPage";
import AgentDashboard from "@/pages/agent/AgentDashboard";
import AgentScanPage from "@/pages/agent/AgentScanPage";
import CashInPage from "@/pages/agent/CashInPage";
import CashOutPage from "@/pages/agent/CashOutPage";
import AgentHistoryPage from "@/pages/agent/AgentHistoryPage";
import AgentSidebar from "@/layouts/AgentSidebar";
import MyQrPage from "@/pages/profile/MyQrPage";
import AgentTransferClosurePage from "@/pages/agent/AgentTransferClosurePage";
import AgentExternalTransferPage from "@/pages/agent/AgentExternalTransferPage";
import RoleDashboardRedirect from "@/pages/dashboard/RoleDashboardRedirect";
import LegacyRouteRedirect from "@/components/LegacyRouteRedirect";
import BalanceHistoryPage from "@/pages/dashboard/BalanceHistoryPage";
import EscrowQueue from "@/pages/EscrowQueue";
import LedgerBalances from "@/pages/LedgerBalances";
import TAccounts from "@/pages/TAccounts";
import EscrowAuditPage from "@/pages/EscrowAuditPage";
import CryptoPayPage from "@/pages/dashboard/CryptoPayPage";
import CryptoPayStatusPage from "@/pages/dashboard/CryptoPayStatusPage";
import WebhookLogs from "@/pages/WebhookLogs";
import AuditLog from "@/pages/AuditLog";
import Monitoring from "@/pages/Monitoring";
import RiskMonitoring from "@/pages/RiskMonitoring";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />

      {/* Role-based dashboard entry */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["client", "agent", "admin"]}>
            <RoleDashboardRedirect />
          </ProtectedRoute>
        }
      />

      {/* Client dashboard */}
      <Route
        path="/dashboard/client"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="wallet" replace />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="payments" element={<PaymentPage />} />
        <Route path="transfer" element={<TransferPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="mobiletopup" element={<MobileTopupPage />} />
        <Route path="deposit" element={<DepositPage />} />
        <Route path="withdraw" element={<WithdrawPage />} />
        <Route path="credit-history" element={<CreditHistoryPage />} />
        <Route path="credit-line" element={<CreditLinePage />} />
        <Route path="microfinance" element={<LoansPage />} />
        <Route path="financial" element={<FinancialSituationPage />} />
        <Route path="balance-history" element={<BalanceHistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/change-password" element={<ChangePasswordPage />} />
        <Route path="agent-transfers" element={<AgentTransfersPage />} />
        <Route path="external-transfer" element={<ExternalTransferPage />} />
        <Route path="fx-rates" element={<FxRatesPage />} />
        <Route path="bonus" element={<BonusPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="tontines" element={<TontineListPage />} />
        <Route path="tontines/create" element={<TontineCreatePage />} />
        <Route path="tontines/:id" element={<TontineDetailPage />} />
        <Route path="account/kyc" element={<KYCPage />} />
        <Route path="wallet/:id/ledger" element={<WalletLedgerPage />} />
        <Route path="crypto-pay" element={<CryptoPayPage />} />
        <Route path="crypto-pay/:id" element={<CryptoPayStatusPage />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSidebar />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsersList />} />
        <Route path="users/:user_id" element={<AdminUserProfilePanel />} />
        <Route path="agents" element={<AdminAgentsPage />} />
        <Route path="aml" element={<AmlEventsPage />} />
        <Route path="security" element={<SecurityDashboard />} />
        <Route path="wallets" element={<AdminWalletsPage />} />
        <Route path="mobilemoney" element={<MobileMoneyJournalPage />} />
        <Route path="transfers" element={<AdminTransfersPage />} />
        <Route path="financial-summary" element={<AdminFinancialSummaryPage />} />
        <Route path="tontines-dashboard" element={<AdminTontineDashboardPage />} />
        <Route path="tontines-arrears" element={<TontineArrearsPage />} />
        <Route path="transfer-approvals" element={<ExternalTransferApprovalsPage />} />
        <Route path="transfer-gains" element={<TransferGainsPage />} />
        <Route path="tontines/create" element={<AdminTontineCreatePage />} />
        <Route path="tontines/members" element={<AdminTontineMembersPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="kyc/reviews" element={<KYCReviewPage />} />
        <Route path="analytics" element={<RiskMonitorPage />} />
        <Route path="loans" element={<AdminLoansPage />} />
        <Route path="cash-requests" element={<CashRequestsPage />} />
        <Route path="credit-history" element={<AdminCreditHistoryPage />} />
        <Route path="credit-lines" element={<AdminCreditLinesPage />} />
        <Route path="credit-lines/repay" element={<AdminCreditRepayPage />} />
        <Route path="transactions-audit" element={<TransactionAuditPage />} />
        <Route path="payment-requests" element={<AdminPaymentRequestsPage />} />
        <Route path="microfinance" element={<AdminMicroFinancePage />} />
        <Route path="loan-products" element={<AdminLoanProductsPage />} />
        <Route path="balance-events" element={<AdminBalanceEventsPage />} />
        <Route path="users/:user_id/balance-events" element={<AdminUserBalanceEventsPage />} />
        <Route path="escrow" element={<EscrowQueue />} />
        <Route path="escrow/audit" element={<EscrowAuditPage />} />
        <Route path="ledger/balances" element={<LedgerBalances />} />
        <Route path="ledger/t-accounts" element={<TAccounts />} />
        <Route path="webhooks" element={<WebhookLogs />} />
        <Route path="risk" element={<RiskMonitoring />} />
      </Route>

      {/* Agent dashboard */}
      <Route
        path="/dashboard/agent"
        element={
          <ProtectedRoute allowedRoles={["agent", "admin"]}>
            <AgentSidebar />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentDashboard />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="operation" element={<AgentOperationPage />} />
        <Route path="scan" element={<AgentScanPage />} />
        <Route path="cash-in" element={<CashInPage />} />
        <Route path="cash-out" element={<CashOutPage />} />
        <Route path="history" element={<AgentHistoryPage />} />
        <Route path="external-transfer" element={<AgentExternalTransferPage />} />
        <Route path="transfers/close" element={<AgentTransferClosurePage />} />
      </Route>

      {/* Profile QR */}
      <Route path="/me/qr" element={<MyQrPage />} />

      {/* Legacy support for old deep-links */}
      <Route
        path="/agent/*"
        element={<LegacyRouteRedirect from="/agent" to="/dashboard/agent" />}
      />
      <Route
        path="/admin/*"
        element={<LegacyRouteRedirect from="/admin" to="/dashboard/admin" />}
      />

      {/* Friendly aliases */}
      <Route
        path="/app/crypto-pay"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <CryptoPayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/history"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <Navigate to="/dashboard/client/transactions" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/crypto-pay/:id"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <CryptoPayStatusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/escrow"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/escrow" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/escrow/audit"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/escrow/audit" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/ledger/balances"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/ledger/balances" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/ledger/t-accounts"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/ledger/t-accounts" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/webhooks"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/webhooks" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/audit"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AuditLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/monitoring"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Monitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/risk"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <RiskMonitoring />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<p>Page non trouvée</p>} />
    </Routes>
  );
}
