export const PROOF_TYPE_OPTIONS = [
  { value: "", label: "Type de preuve (optionnel)" },
  { value: "screenshot", label: "Screenshot" },
  { value: "pdf", label: "PDF" },
  { value: "receipt_id", label: "Receipt ID" },
  { value: "bank_reference", label: "Bank reference" },
  { value: "mobile_money_reference", label: "Mobile money reference" },
  { value: "other", label: "Other" },
];

export const ESCROW_REFUND_REASON_CODE_OPTIONS = [
  { value: "", label: "Code motif (optionnel)" },
  { value: "payout_failed", label: "Payout failed" },
  { value: "customer_cancelled", label: "Customer cancelled" },
  { value: "compliance_hold", label: "Compliance hold" },
  { value: "operator_error", label: "Operator error" },
  { value: "other", label: "Other" },
];

export const ESCROW_REFUND_RESOLUTION_CODE_OPTIONS = [
  { value: "", label: "Code resolution (optionnel)" },
  { value: "refund_approved", label: "Refund approved" },
  { value: "refund_rejected", label: "Refund rejected" },
  { value: "manual_operator_decision", label: "Manual operator decision" },
  { value: "other", label: "Other" },
];

export const P2P_DISPUTE_RESOLUTION_CODE_OPTIONS = [
  { value: "", label: "Code resolution admin (optionnel)" },
  { value: "payment_proof_validated", label: "Payment proof validated" },
  { value: "payment_not_proven", label: "Payment not proven" },
  { value: "seller_confirmed_non_receipt", label: "Seller confirmed non receipt" },
  { value: "manual_operator_decision", label: "Manual operator decision" },
  { value: "other", label: "Other" },
];

export function asSelectOptions(values = [], blankLabel = "Tous") {
  return [{ value: "", label: blankLabel }, ...values.map((value) => ({ value, label: value }))];
}

export function prependBlankOption(options = [], blankLabel = "Tous") {
  return [{ value: "", label: blankLabel }, ...options];
}

export function buildOptionLabelMap(options = []) {
  return Object.fromEntries(
    (Array.isArray(options) ? options : [])
      .filter((item) => item && item.value)
      .map((item) => [item.value, item.label || item.value])
  );
}
