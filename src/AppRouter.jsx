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
import WithdrawUSDCPage from "@/pages/dashboard/WithdrawUSDCPage";
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
import P2PAdminTrades from "@/pages/admin/P2PAdminTrades";
import P2PAdminDisputes from "@/pages/admin/P2PAdminDisputes";
import P2PAdminRisk from "@/pages/admin/P2PAdminRisk";
import AdminGlobalDashboard from "@/pages/admin/AdminGlobalDashboard";
import AdminAMLPage from "@/pages/admin/AdminAMLPage";
import AdminLiquidityPage from "@/pages/admin/AdminLiquidityPage";
import AdminArbitragePage from "@/pages/admin/AdminArbitragePage";
import AdminRiskHeatmap from "@/pages/admin/AdminRiskHeatmap";
import AdminKillSwitch from "@/pages/admin/AdminKillSwitch";
import LiquidityBifPage from "@/pages/admin/LiquidityBifPage";

import AgentOperationPage from "@/pages/agent/AgentOperationPage";
import AgentDashboard from "@/pages/agent/AgentDashboard";
import AgentScanPage from "@/pages/agent/AgentScanPage";
import CashInPage from "@/pages/agent/CashInPage";
import CashOutPage from "@/pages/agent/CashOutPage";
import AgentHistoryPage from "@/pages/agent/AgentHistoryPage";
import AgentAssignmentsPage from "@/pages/agent/AgentAssignmentsPage";
import AgentConfirmPage from "@/pages/agent/AgentConfirmPage";
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
import P2PMarket from "@/pages/p2p/P2PMarket";
import CreateOffer from "@/pages/p2p/CreateOffer";
import TradeRoom from "@/pages/p2p/TradeRoom";
import P2PMyTrades from "@/pages/p2p/P2PMyTrades";
import P2PMyOffers from "@/pages/p2p/P2PMyOffers";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["client", "agent", "admin"]}>
            <RoleDashboardRedirect />
          </ProtectedRoute>
        }
      />

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
        <Route path="withdraw/bif" element={<WithdrawPage />} />
        <Route path="withdraw-usdc" element={<WithdrawUSDCPage />} />
        <Route path="withdraw/usdc" element={<WithdrawUSDCPage />} />
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

      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSidebar />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="overview" element={<AdminGlobalDashboard />} />
        <Route path="aml-cases" element={<AdminAMLPage />} />
        <Route path="liquidity" element={<AdminLiquidityPage />} />
        <Route path="arbitrage" element={<AdminArbitragePage />} />
        <Route path="risk-heatmap" element={<AdminRiskHeatmap />} />
        <Route path="kill-switch" element={<AdminKillSwitch />} />
        <Route path="ops/liquidity-bif" element={<LiquidityBifPage />} />
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
        <Route path="trades" element={<P2PAdminTrades />} />
        <Route path="disputes" element={<P2PAdminDisputes />} />
        <Route path="risk-flags" element={<P2PAdminRisk />} />
        <Route path="p2p/trades" element={<P2PAdminTrades />} />
        <Route path="p2p/disputes" element={<P2PAdminDisputes />} />
        <Route path="p2p/risk" element={<P2PAdminRisk />} />
      </Route>

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
        <Route path="assignments" element={<AgentAssignmentsPage />} />
        <Route path="assignments/:assignmentId" element={<AgentConfirmPage />} />
        <Route path="external-transfer" element={<AgentExternalTransferPage />} />
        <Route path="transfers/close" element={<AgentTransferClosurePage />} />
      </Route>

      <Route path="/me/qr" element={<MyQrPage />} />

      <Route path="/admin" element={<Navigate to="/dashboard/admin/overview" replace />} />
      <Route path="/admin/aml" element={<Navigate to="/dashboard/admin/aml-cases" replace />} />
      <Route path="/admin/liquidity" element={<Navigate to="/dashboard/admin/liquidity" replace />} />
      <Route path="/admin/arbitrage" element={<Navigate to="/dashboard/admin/arbitrage" replace />} />
      <Route path="/admin/risk-heatmap" element={<Navigate to="/dashboard/admin/risk-heatmap" replace />} />
      <Route path="/admin/kill-switch" element={<Navigate to="/dashboard/admin/kill-switch" replace />} />
      <Route path="/admin/trades" element={<Navigate to="/dashboard/admin/trades" replace />} />
      <Route path="/admin/disputes" element={<Navigate to="/dashboard/admin/disputes" replace />} />
      <Route path="/admin/risk-flags" element={<Navigate to="/dashboard/admin/risk-flags" replace />} />

      <Route
        path="/admin/p2p/trades"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <P2PAdminTrades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/p2p/disputes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <P2PAdminDisputes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/p2p/risk"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <P2PAdminRisk />
          </ProtectedRoute>
        }
      />

      <Route path="/agent/*" element={<LegacyRouteRedirect from="/agent" to="/dashboard/agent" />} />
      <Route path="/admin/*" element={<LegacyRouteRedirect from="/admin" to="/dashboard/admin" />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="crypto-pay" element={<CryptoPayPage />} />
        <Route path="crypto-pay/:id" element={<CryptoPayStatusPage />} />
        <Route path="p2p" element={<P2PMarket />} />
        <Route path="p2p/my-trades" element={<P2PMyTrades />} />
        <Route path="p2p/my-offers" element={<P2PMyOffers />} />
        <Route path="p2p/offers/new" element={<CreateOffer />} />
        <Route path="p2p/trades/:id" element={<TradeRoom />} />
      </Route>
      <Route
        path="/app/history"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <Navigate to="/dashboard/client/transactions" replace />
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
        path="/backoffice/aml"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/aml" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/agents"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/agents" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/p2p/trades"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/p2p/trades" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/p2p/disputes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/p2p/disputes" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/p2p/risk"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/p2p/risk" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSidebar />
          </ProtectedRoute>
        }
      >
        <Route path="aml" element={<AmlEventsPage />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="risk" element={<RiskMonitoring />} />
      </Route>

      <Route path="*" element={<p>Page non trouvee</p>} />
    </Routes>
  );
}
