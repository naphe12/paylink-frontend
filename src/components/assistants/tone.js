export function getMetricValueClass(tone = "default") {
  switch (tone) {
    case "success":
      return "font-bold text-emerald-700";
    case "danger":
      return "font-bold text-rose-700";
    case "warning":
      return "font-bold text-amber-700";
    case "info":
      return "font-bold text-sky-700";
    default:
      return "font-semibold text-slate-900";
  }
}

export function getStatusBadgeClass(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["approved", "verified", "paid_out", "released", "resolved", "done", "succeeded", "completed", "active"].includes(normalized)) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["pending", "reviewing", "created", "funded", "swapped", "payout_pending", "fiat_sent", "awaiting_fiat", "awaiting_crypto"].includes(normalized)) {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }
  if (["rejected", "failed", "cancelled", "expired", "frozen", "suspended", "disputed"].includes(normalized)) {
    return "border border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border border-slate-200 bg-slate-50 text-slate-700";
}
