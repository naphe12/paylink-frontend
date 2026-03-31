function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value, currency = "") {
  const parsed = toNumber(value);
  if (parsed === null) return value || "-";
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
  return currency ? `${formatted} ${currency}` : formatted;
}

function buildItems(summary) {
  if (!summary) return [];
  const items = [];
  const currency = summary.wallet_currency || summary.currency || "";

  if (summary.next_step) {
    items.push({
      label: "Prochaine action",
      value: summary.next_step,
      tone: "amber",
    });
  }

  if (summary.eta_hint) {
    items.push({
      label: "Delai probable",
      value: summary.eta_hint,
      tone: "sky",
    });
  }

  const dailyLimit = toNumber(summary.daily_limit);
  const usedDaily = toNumber(summary.used_daily);
  if (dailyLimit !== null && usedDaily !== null) {
    items.push({
      label: "Reste journalier",
      value: formatAmount(Math.max(dailyLimit - usedDaily, 0), currency),
      tone: "emerald",
    });
  }

  const monthlyLimit = toNumber(summary.monthly_limit);
  const usedMonthly = toNumber(summary.used_monthly);
  if (monthlyLimit !== null && usedMonthly !== null) {
    items.push({
      label: "Reste mensuel",
      value: formatAmount(Math.max(monthlyLimit - usedMonthly, 0), currency),
      tone: "emerald",
    });
  }

  return items;
}

function toneClasses(tone) {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "sky") return "border-sky-200 bg-sky-50 text-sky-900";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

export default function AssistantContextPanel({ summary, title = "Pistes contextuelles" }) {
  const items = buildItems(summary);
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className={`rounded-xl border px-3 py-3 ${toneClasses(item.tone)}`}>
            <p className="text-[11px] uppercase tracking-wide opacity-70">{item.label}</p>
            <p className="mt-1 text-sm font-medium">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
