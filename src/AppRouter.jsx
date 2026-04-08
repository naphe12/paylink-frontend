import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminSidebar from "@/layouts/AdminSidebar";
import AgentSidebar from "@/layouts/AgentSidebar";
import LegacyRouteRedirect from "@/components/LegacyRouteRedirect";

const ClientOverviewPage = lazy(() => import("@/pages/dashboard/ClientOverviewPage"));
const WalletPage = lazy(() => import("@/pages/dashboard/WalletPage"));
const PaymentPage = lazy(() => import("@/pages/dashboard/PaymentPage"));
const SupportCasesPage = lazy(() => import("@/pages/dashboard/SupportCasesPage"));
const TransferPage = lazy(() => import("@/pages/dashboard/TransferPage"));
const ScheduledTransfersPage = lazy(() => import("@/pages/dashboard/ScheduledTransfersPage"));
const SavingsGoalsPage = lazy(() => import("@/pages/dashboard/SavingsGoalsPage"));
const BusinessAccountsPage = lazy(() => import("@/pages/dashboard/BusinessAccountsPage"));
const MerchantApiPage = lazy(() => import("@/pages/dashboard/MerchantApiPage"));
const PotsPage = lazy(() => import("@/pages/dashboard/PotsPage"));
const VirtualCardsPage = lazy(() => import("@/pages/dashboard/VirtualCardsPage"));
const TransactionsPage = lazy(() => import("@/pages/dashboard/TransactionsPage"));
const MobileTopupPage = lazy(() => import("@/pages/dashboard/MobileTopupPage"));
const ProfilePage = lazy(() => import("@/pages/dashboard/ProfilePage"));
const DepositPage = lazy(() => import("@/pages/dashboard/DepositPage"));
const WithdrawPage = lazy(() => import("@/pages/dashboard/WithdrawPage"));
const WithdrawUSDCPage = lazy(() => import("@/pages/dashboard/WithdrawUSDCPage"));
const CreditHistoryPage = lazy(() => import("@/pages/dashboard/CreditHistoryPage"));
const CreditLinePage = lazy(() => import("@/pages/dashboard/CreditLinePage"));
const FinancialSituationPage = lazy(() => import("@/pages/dashboard/FinancialSituationPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const PublicPaymentRequestPage = lazy(() => import("@/pages/public/PublicPaymentRequestPage"));
const AuthPage = lazy(() => import("@/pages/auth/AuthPage"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const ChangePasswordPage = lazy(() => import("@/pages/dashboard/ChangePasswordPage"));
const AgentTransfersPage = lazy(() => import("@/pages/dashboard/AgentTransfersPage"));
const ExternalTransferPage = lazy(() => import("@/pages/dashboard/ExternalTransferPage"));
const FxRatesPage = lazy(() => import("@/pages/dashboard/FxRatesPage"));
const BonusPage = lazy(() => import("@/pages/dashboard/BonusPage"));
const AgentChatPage = lazy(() => import("@/pages/dashboard/AgentChatPage"));
const CashAgentPage = lazy(() => import("@/pages/dashboard/CashAgentPage"));
const CreditAgentPage = lazy(() => import("@/pages/dashboard/CreditAgentPage"));
const KycAgentPage = lazy(() => import("@/pages/dashboard/KycAgentPage"));
const TransferSupportAgentPage = lazy(() => import("@/pages/dashboard/TransferSupportAgentPage"));
const WalletAgentPage = lazy(() => import("@/pages/dashboard/WalletAgentPage"));
const WalletSupportAgentPage = lazy(() => import("@/pages/dashboard/WalletSupportAgentPage"));
const EscrowAgentPage = lazy(() => import("@/pages/dashboard/EscrowAgentPage"));
const P2PAgentPage = lazy(() => import("@/pages/dashboard/P2PAgentPage"));
const TontineCreatePage = lazy(() => import("@/pages/tontines/TontineCreatePage"));
const TontineListPage = lazy(() => import("@/pages/tontines/TontineListPage"));
const TontineDetailPage = lazy(() => import("@/pages/tontines/TontineDetailPage"));
const KYCPage = lazy(() => import("@/pages/account/KYCPage"));
const WalletLedgerPage = lazy(() => import("@/pages/wallet/WalletLedgerPage"));
const LoansPage = lazy(() => import("@/pages/dashboard/LoansPage"));
const SecurityDashboard = lazy(() => import("@/pages/admin/SecurityDashboard"));
const AdminAuditSearchPage = lazy(() => import("@/pages/admin/AdminAuditSearchPage"));
const AdminUsersList = lazy(() => import("@/pages/admin/AdminUsersList"));
const AdminUserProfilePanel = lazy(() => import("@/pages/admin/AdminUserProfilePanel"));
const AmlEventsPage = lazy(() => import("@/pages/admin/AmlEventsPage"));
const KYCReviewPage = lazy(() => import("@/pages/admin/KYCReviewPage"));
const RiskMonitorPage = lazy(() => import("@/pages/admin/RiskMonitorPage"));
const AdminWalletsPage = lazy(() => import("@/pages/admin/AdminWalletsPage"));
const AdminClientWalletPage = lazy(() => import("@/pages/admin/AdminClientWalletPage"));
const AdminWalletAnalysisPage = lazy(() => import("@/pages/admin/AdminWalletAnalysisPage"));
const AdminWalletCorrectionPage = lazy(() => import("@/pages/admin/AdminWalletCorrectionPage"));
const AdminTransfersPage = lazy(() => import("@/pages/admin/AdminTransfersPage"));
const AdminTransferNotePage = lazy(() => import("@/pages/admin/AdminTransferNotePage"));
const ExternalTransferApprovalsPage = lazy(() => import("@/pages/admin/ExternalTransferApprovalsPage"));
const AdminAgentsPage = lazy(() => import("@/pages/admin/AdminAgentsPage"));
const AdminFinancialSummaryPage = lazy(() => import("@/pages/admin/AdminFinancialSummaryPage"));
const MobileMoneyJournalPage = lazy(() => import("@/pages/admin/MobileMoneyJournalPage"));
const AdminTontineDashboardPage = lazy(() => import("@/pages/admin/AdminTontineDashboardPage"));
const TontineArrearsPage = lazy(() => import("@/pages/admin/TontineArrearsPage"));
const AdminLoansPage = lazy(() => import("@/pages/admin/AdminLoansPage"));
const CashRequestsPage = lazy(() => import("@/pages/admin/CashRequestsPage"));
const AdminCashDepositsPage = lazy(() => import("@/pages/admin/AdminCashDepositsPage"));
const AdminCreditHistoryPage = lazy(() => import("@/pages/admin/AdminCreditHistoryPage"));
const AdminCreditLinesPage = lazy(() => import("@/pages/admin/AdminCreditLinesPage"));
const AdminCreditRepayPage = lazy(() => import("@/pages/admin/AdminCreditRepayPage"));
const TransactionAuditPage = lazy(() => import("@/pages/admin/TransactionAuditPage"));
const TransferGainsPage = lazy(() => import("@/pages/admin/TransferGainsPage"));
const AdminPaymentRequestsPage = lazy(() => import("@/pages/admin/AdminPaymentRequestsPage"));
const AdminSupportCasesPage = lazy(() => import("@/pages/admin/AdminSupportCasesPage"));
const AdminVirtualCardsPage = lazy(() => import("@/pages/admin/AdminVirtualCardsPage"));
const AdminAgentOfflineOpsPage = lazy(() => import("@/pages/admin/AdminAgentOfflineOpsPage"));
const AdminPaymentIntentsPage = lazy(() => import("@/pages/admin/AdminPaymentIntentsPage"));
const AdminMicroFinancePage = lazy(() => import("@/pages/admin/AdminMicroFinancePage"));
const AdminLoanProductsPage = lazy(() => import("@/pages/admin/AdminLoanProductsPage"));
const AdminTontineCreatePage = lazy(() => import("@/pages/admin/AdminTontineCreatePage"));
const AdminTontineMembersPage = lazy(() => import("@/pages/admin/AdminTontineMembersPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminBalanceEventsPage = lazy(() => import("@/pages/admin/AdminBalanceEventsPage"));
const AdminLegacyTransfersPage = lazy(() => import("@/pages/admin/AdminLegacyTransfersPage"));
const AdminUserBalanceEventsPage = lazy(() => import("@/pages/admin/AdminUserBalanceEventsPage"));
const AdminUserLimitsPage = lazy(() => import("@/pages/admin/AdminUserLimitsPage"));
const P2PAdminTrades = lazy(() => import("@/pages/admin/P2PAdminTrades"));
const P2PAdminDisputes = lazy(() => import("@/pages/admin/P2PAdminDisputes"));
const P2PAdminRisk = lazy(() => import("@/pages/admin/P2PAdminRisk"));
const AdminGlobalDashboard = lazy(() => import("@/pages/admin/AdminGlobalDashboard"));
const AdminAMLPage = lazy(() => import("@/pages/admin/AdminAMLPage"));
const AdminLiquidityPage = lazy(() => import("@/pages/admin/AdminLiquidityPage"));
const AdminArbitragePage = lazy(() => import("@/pages/admin/AdminArbitragePage"));
const AdminRiskHeatmap = lazy(() => import("@/pages/admin/AdminRiskHeatmap"));
const AdminKillSwitch = lazy(() => import("@/pages/admin/AdminKillSwitch"));
const LiquidityBifPage = lazy(() => import("@/pages/admin/LiquidityBifPage"));
const UnbalancedJournalsPage = lazy(() => import("@/pages/admin/UnbalancedJournalsPage"));
const IdempotencyScopesPage = lazy(() => import("@/pages/admin/IdempotencyScopesPage"));
const OpsDashboardPage = lazy(() => import("@/pages/admin/OpsDashboardPage"));
const OnChainSimulatorPage = lazy(() => import("@/pages/admin/OnChainSimulatorPage"));
const AdminErrorLogsPage = lazy(() => import("@/pages/admin/AdminErrorLogsPage"));
const AdminAiFeedbackPage = lazy(() => import("@/pages/admin/AdminAiFeedbackPage"));
const AdminAiSynonymsPage = lazy(() => import("@/pages/admin/AdminAiSynonymsPage"));
const AdminDisputeCodesPage = lazy(() => import("@/pages/admin/AdminDisputeCodesPage"));
const AdminOpsUrgenciesPage = lazy(() => import("@/pages/admin/AdminOpsUrgenciesPage"));
const AdminInterfaceModePage = lazy(() => import("@/pages/admin/AdminInterfaceModePage"));
const AgentOperationPage = lazy(() => import("@/pages/agent/AgentOperationPage"));
const AgentDashboard = lazy(() => import("@/pages/agent/AgentDashboard"));
const AgentScanPage = lazy(() => import("@/pages/agent/AgentScanPage"));
const CashInPage = lazy(() => import("@/pages/agent/CashInPage"));
const CashOutPage = lazy(() => import("@/pages/agent/CashOutPage"));
const AgentHistoryPage = lazy(() => import("@/pages/agent/AgentHistoryPage"));
const AgentAssignmentsPage = lazy(() => import("@/pages/agent/AgentAssignmentsPage"));
const AgentConfirmPage = lazy(() => import("@/pages/agent/AgentConfirmPage"));
const AgentOfflineOpsPage = lazy(() => import("@/pages/agent/AgentOfflineOpsPage"));
const AgentBonusTransferPage = lazy(() => import("@/pages/agent/AgentBonusTransferPage"));
const AgentOnboardingPage = lazy(() => import("@/pages/agent/AgentOnboardingPage"));
const MyQrPage = lazy(() => import("@/pages/profile/MyQrPage"));
const AgentTransferClosurePage = lazy(() => import("@/pages/agent/AgentTransferClosurePage"));
const AgentExternalTransferPage = lazy(() => import("@/pages/agent/AgentExternalTransferPage"));
const RoleDashboardRedirect = lazy(() => import("@/pages/dashboard/RoleDashboardRedirect"));
const BalanceHistoryPage = lazy(() => import("@/pages/dashboard/BalanceHistoryPage"));
const EscrowQueue = lazy(() => import("@/pages/EscrowQueue"));
const LedgerBalances = lazy(() => import("@/pages/LedgerBalances"));
const TAccounts = lazy(() => import("@/pages/TAccounts"));
const EscrowAuditPage = lazy(() => import("@/pages/EscrowAuditPage"));
const CryptoPayPage = lazy(() => import("@/pages/dashboard/CryptoPayPage"));
const CryptoPayStatusPage = lazy(() => import("@/pages/dashboard/CryptoPayStatusPage"));
const WebhookLogs = lazy(() => import("@/pages/WebhookLogs"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const Monitoring = lazy(() => import("@/pages/Monitoring"));
const RiskMonitoring = lazy(() => import("@/pages/RiskMonitoring"));
const P2PMarket = lazy(() => import("@/pages/p2p/P2PMarket"));
const CreateOffer = lazy(() => import("@/pages/p2p/CreateOffer"));
const TradeRoom = lazy(() => import("@/pages/p2p/TradeRoom"));
const P2PMyTrades = lazy(() => import("@/pages/p2p/P2PMyTrades"));
const P2PMyOffers = lazy(() => import("@/pages/p2p/P2PMyOffers"));
const AssistantsGuidePage = lazy(() => import("@/pages/shared/AssistantsGuidePage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10 text-sm text-slate-500">
      Chargement...
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pay/request/:shareToken" element={<PublicPaymentRequestPage />} />

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
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ClientOverviewPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="payments" element={<PaymentPage />} />
        <Route path="support" element={<SupportCasesPage />} />
        <Route path="transfer" element={<TransferPage />} />
        <Route path="scheduled-transfers" element={<ScheduledTransfersPage />} />
        <Route path="scheduled-transfers/external" element={<ScheduledTransfersPage />} />
        <Route path="savings" element={<SavingsGoalsPage />} />
        <Route path="business" element={<BusinessAccountsPage />} />
        <Route path="merchant-api" element={<MerchantApiPage />} />
        <Route path="pots" element={<PotsPage />} />
        <Route path="cards" element={<VirtualCardsPage />} />
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
        <Route path="agent-chat" element={<AgentChatPage />} />
        <Route path="cash-agent" element={<CashAgentPage />} />
        <Route path="credit-agent" element={<CreditAgentPage />} />
        <Route path="kyc-agent" element={<KycAgentPage />} />
        <Route path="transfer-support-agent" element={<TransferSupportAgentPage />} />
        <Route path="wallet-agent" element={<WalletAgentPage />} />
        <Route path="wallet-support-agent" element={<WalletSupportAgentPage />} />
        <Route path="escrow-agent" element={<EscrowAgentPage />} />
        <Route path="p2p-agent" element={<P2PAgentPage />} />
        <Route path="assistants-guide" element={<AssistantsGuidePage />} />
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
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminGlobalDashboard />} />
        <Route path="overview-lite" element={<AdminGlobalDashboard />} />
        <Route path="aml-cases" element={<AdminAMLPage />} />
        <Route path="liquidity" element={<AdminLiquidityPage />} />
        <Route path="arbitrage" element={<AdminArbitragePage />} />
        <Route path="risk-heatmap" element={<AdminRiskHeatmap />} />
        <Route path="kill-switch" element={<AdminKillSwitch />} />
        <Route path="ops/liquidity-bif" element={<LiquidityBifPage />} />
        <Route path="users" element={<AdminUsersList />} />
        <Route path="users/limits" element={<AdminUserLimitsPage />} />
        <Route path="users/:user_id" element={<AdminUserProfilePanel />} />
        <Route path="agents" element={<AdminAgentsPage />} />
        <Route path="notifications" element={<Navigate to="../security" replace />} />
        <Route path="aml" element={<AmlEventsPage />} />
        <Route path="security" element={<SecurityDashboard />} />
        <Route path="audit-search" element={<AdminAuditSearchPage />} />
        <Route path="wallets" element={<AdminWalletsPage />} />
        <Route path="client-wallets" element={<AdminClientWalletPage />} />
        <Route path="wallet-corrections" element={<AdminWalletCorrectionPage />} />
        <Route path="wallet-analysis" element={<AdminWalletAnalysisPage />} />
        <Route path="mobilemoney" element={<MobileMoneyJournalPage />} />
        <Route path="transfers" element={<AdminTransfersPage />} />
        <Route path="transfers/:transferId/note" element={<AdminTransferNotePage />} />
        <Route path="financial-summary" element={<AdminFinancialSummaryPage />} />
        <Route path="tontines-dashboard" element={<AdminTontineDashboardPage />} />
        <Route path="tontines-arrears" element={<TontineArrearsPage />} />
        <Route path="transfer-approvals" element={<ExternalTransferApprovalsPage />} />
        <Route path="transfer-gains" element={<TransferGainsPage />} />
        <Route path="tontines/create" element={<AdminTontineCreatePage />} />
        <Route path="tontines/members" element={<AdminTontineMembersPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="interface-mode" element={<AdminInterfaceModePage />} />
        <Route path="kyc/reviews" element={<KYCReviewPage />} />
        <Route path="analytics" element={<RiskMonitorPage />} />
        <Route path="loans" element={<AdminLoansPage />} />
        <Route path="cash-requests" element={<CashRequestsPage />} />
        <Route path="cash-deposits" element={<AdminCashDepositsPage />} />
        <Route path="credit-history" element={<AdminCreditHistoryPage />} />
        <Route path="credit-lines" element={<AdminCreditLinesPage />} />
        <Route path="credit-lines/repay" element={<AdminCreditRepayPage />} />
        <Route path="transactions-audit" element={<TransactionAuditPage />} />
        <Route path="payment-requests" element={<AdminPaymentRequestsPage />} />
        <Route path="support-cases" element={<AdminSupportCasesPage />} />
        <Route path="virtual-cards" element={<AdminVirtualCardsPage />} />
        <Route path="agent-offline-ops" element={<AdminAgentOfflineOpsPage />} />
        <Route path="payment-intents" element={<AdminPaymentIntentsPage />} />
        <Route path="microfinance" element={<AdminMicroFinancePage />} />
        <Route path="loan-products" element={<AdminLoanProductsPage />} />
        <Route path="balance-events" element={<AdminBalanceEventsPage />} />
        <Route path="legacy-transfers" element={<AdminLegacyTransfersPage />} />
        <Route path="users/:user_id/balance-events" element={<AdminUserBalanceEventsPage />} />
        <Route path="escrow" element={<EscrowQueue />} />
        <Route path="escrow/audit" element={<EscrowAuditPage />} />
        <Route path="ledger/balances" element={<LedgerBalances />} />
        <Route path="ledger/t-accounts" element={<TAccounts />} />
        <Route path="ledger/unbalanced-journals" element={<UnbalancedJournalsPage />} />
        <Route path="ledger/idempotency-scopes" element={<IdempotencyScopesPage />} />
        <Route path="ops/errors" element={<AdminErrorLogsPage />} />
        <Route path="ai-feedback" element={<AdminAiFeedbackPage />} />
        <Route path="ai-synonyms" element={<AdminAiSynonymsPage />} />
        <Route path="dispute-codes" element={<AdminDisputeCodesPage />} />
        <Route path="ops-dashboard" element={<OpsDashboardPage />} />
        <Route path="ops-urgencies" element={<AdminOpsUrgenciesPage />} />
        <Route path="onchain-simulator" element={<OnChainSimulatorPage />} />
        <Route path="webhooks" element={<WebhookLogs />} />
        <Route path="risk" element={<RiskMonitoring />} />
        <Route path="assistants-guide" element={<AssistantsGuidePage />} />
        <Route path="agent-chat" element={<AgentChatPage />} />
        <Route path="cash-agent" element={<CashAgentPage />} />
        <Route path="credit-agent" element={<CreditAgentPage />} />
        <Route path="kyc-agent" element={<KycAgentPage />} />
        <Route path="transfer-support-agent" element={<TransferSupportAgentPage />} />
        <Route path="wallet-agent" element={<WalletAgentPage />} />
        <Route path="wallet-support-agent" element={<WalletSupportAgentPage />} />
        <Route path="escrow-agent" element={<EscrowAgentPage />} />
        <Route path="p2p-agent" element={<P2PAgentPage />} />
        <Route path="trades" element={<P2PAdminTrades />} />
        <Route path="disputes" element={<P2PAdminDisputes />} />
        <Route path="risk-flags" element={<P2PAdminRisk />} />
        <Route path="p2p/trades" element={<P2PAdminTrades />} />
        <Route path="p2p/disputes" element={<P2PAdminDisputes />} />
        <Route path="p2p/risk" element={<P2PAdminRisk />} />
      </Route>

      <Route
        path="/print/admin/transfers/:transferId/note"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <div className="min-h-screen bg-stone-100 p-6">
              <AdminTransferNotePage standalone />
            </div>
          </ProtectedRoute>
        }
      />

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
        <Route path="offline" element={<AgentOfflineOpsPage />} />
        <Route path="bonus-transfer" element={<AgentBonusTransferPage />} />
        <Route path="external-transfer" element={<AgentExternalTransferPage />} />
        <Route path="transfers/close" element={<AgentTransferClosurePage />} />
        <Route path="onboarding" element={<AgentOnboardingPage />} />
        <Route path="assistants-guide" element={<AssistantsGuidePage />} />
      </Route>

      <Route path="/me/qr" element={<MyQrPage />} />

      <Route path="/admin" element={<Navigate to="/dashboard/admin/overview" replace />} />
      <Route path="/admin/aml" element={<Navigate to="/dashboard/admin/aml-cases" replace />} />
      <Route path="/admin/notifications" element={<Navigate to="/dashboard/admin/security" replace />} />
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
        <Route path="p2p/offers/:id/edit" element={<CreateOffer />} />
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
        path="/backoffice/ops/errors"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/ops/errors" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backoffice/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Navigate to="/dashboard/admin/security" replace />
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
    </Suspense>
  );
}
