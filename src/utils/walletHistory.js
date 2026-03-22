const OPERATION_LABELS = {
  external_transfer: "Extern transfer",
  external_transfer_close: "Extern transfer",
  agent_cash_in: "Deposit credit",
  cash_deposit_admin: "Deposit credit",
  cash_deposit_admin_direct: "Deposit credit",
  user_topup: "Deposit credit",
  mobile_topup: "Deposit credit",
  agent_cash_out: "Withdraw",
  cash_withdraw_admin: "Withdraw",
  withdraw: "Withdraw",
};

const CREDIT_OPERATIONS = new Set([
  "agent_cash_in",
  "cash_deposit_admin",
  "cash_deposit_admin_direct",
  "user_topup",
  "mobile_topup",
  "transfer_receive",
  "wallet_receive",
  "internal_transfer_receive",
  "payment_request_receive",
  "merchant_settlement_receive",
  "loan_disbursement",
  "tontine_payout",
]);

const DEBIT_OPERATIONS = new Set([
  "external_transfer",
  "external_transfer_close",
  "agent_cash_out",
  "cash_withdraw_admin",
  "withdraw",
  "transfer_send",
  "wallet_send",
  "internal_transfer_send",
  "payment_request_send",
  "invoice_payment",
  "invoice_payment_agent",
  "merchant_settlement",
  "loan_repayment",
  "credit_line_repay",
  "tontine_contribution",
]);

export function formatWalletOperationLabel(operationType) {
  const normalized = String(operationType || "").trim().toLowerCase();
  if (!normalized) return "-";
  return OPERATION_LABELS[normalized] || operationType;
}

export function inferWalletEntryIsCredit(entry) {
  const direction = String(entry?.direction || "").trim().toLowerCase();
  const operation = String(entry?.operation_type || "").trim().toLowerCase();
  const amount = Number(entry?.amount || 0);

  if (direction === "credit" || direction === "in") return true;
  if (direction === "debit" || direction === "out") return false;
  if (CREDIT_OPERATIONS.has(operation)) return true;
  if (DEBIT_OPERATIONS.has(operation)) return false;
  return amount >= 0;
}
