import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";

function normalizeDirection(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["in", "credit", "cashin", "cash_in", "deposit", "incoming", "entrante"].includes(normalized)) {
    return "in";
  }
  if (["out", "debit", "cashout", "cash_out", "withdraw", "outgoing", "sortante"].includes(normalized)) {
    return "out";
  }
  return "unknown";
}

export default function DirectionBadge({ value, className = "", title }) {
  const direction = normalizeDirection(value);
  if (direction === "in") {
    return (
      <span
        title={title || String(value || "Entrante")}
        className={`inline-flex items-center justify-center rounded-full bg-emerald-100 p-1.5 text-emerald-700 ${className}`}
      >
        <ArrowDownLeft size={14} />
      </span>
    );
  }
  if (direction === "out") {
    return (
      <span
        title={title || String(value || "Sortante")}
        className={`inline-flex items-center justify-center rounded-full bg-rose-100 p-1.5 text-rose-700 ${className}`}
      >
        <ArrowUpRight size={14} />
      </span>
    );
  }
  return (
    <span
      title={title || String(value || "Inconnue")}
      className={`inline-flex items-center justify-center rounded-full bg-slate-100 p-1.5 text-slate-500 ${className}`}
    >
      <Minus size={14} />
    </span>
  );
}

export function formatDirectionSign(value) {
  return normalizeDirection(value) === "in" ? "+" : "-";
}

export function isCreditDirection(value) {
  return normalizeDirection(value) === "in";
}
