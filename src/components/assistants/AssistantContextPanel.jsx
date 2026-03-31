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

function push(items, label, value, tone = "slate") {
  if (value === undefined || value === null || value === "") return;
  items.push({ label, value, tone });
}

function joinList(value) {
  if (!Array.isArray(value) || !value.length) return null;
  return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
}

function labelDossierType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "standard") return "Standard";
  if (raw === "review") return "En revue";
  if (raw === "refund") return "Refund";
  if (raw === "failed") return "En echec";
  if (raw === "dispute") return "Litige";
  if (raw === "completed") return "Termine";
  if (raw === "cancelled") return "Annule";
  if (raw === "offers_summary") return "Resume d'offres";
  if (raw === "deposit_follow_up") return "Suivi depot";
  if (raw === "withdraw_blocked") return "Retrait bloque";
  if (raw === "send_blocked") return "Envoi bloque";
  if (raw === "account_review") return "Compte en revue";
  if (raw === "funding") return "Financement requis";
  return value;
}

function labelActor(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "depositor") return "Deposant";
  if (raw === "operations") return "Operations";
  if (raw === "client") return "Client";
  if (raw === "buyer") return "Acheteur";
  if (raw === "seller") return "Vendeur";
  if (raw === "platform") return "Plateforme";
  if (raw === "none") return "Aucune action attendue";
  return value;
}

function buildActions(summary, assistantKey) {
  if (!summary) return [];
  const actions = [];
  const nextStep = String(summary.next_step || "").trim();
  const blockedReason = joinList(summary.pending_reasons || summary.blocked_reasons || summary.review_reasons || summary.aml_reason_codes);

  if (nextStep) {
    actions.push({
      type: "prompt",
      label: "Creuser la prochaine etape",
      prompt:
        assistantKey === "transfer_support"
          ? "quelle est la prochaine action recommandee pour ce transfert ?"
          : assistantKey === "escrow"
          ? "quelle est la prochaine etape de mon escrow ?"
          : assistantKey === "p2p"
          ? "qui doit agir maintenant sur mon trade ?"
          : "quelle est la prochaine action recommandee ?",
    });
  }

  if (blockedReason) {
    actions.push({
      type: "prompt",
      label: "Expliquer le blocage",
      prompt:
        assistantKey === "escrow"
          ? "pourquoi mon escrow est en attente ?"
          : assistantKey === "p2p"
          ? "pourquoi mon trade p2p est bloque ?"
          : assistantKey === "transfer_support"
          ? "pourquoi mon transfert est pending ?"
          : "pourquoi cette operation est-elle bloquee ?",
    });
  }

  if (assistantKey === "escrow" && summary.order_id) {
    actions.push({
      type: "link",
      label: "Ouvrir le suivi escrow",
      href: `/dashboard/client/crypto-pay/${summary.order_id}`,
    });
  }

  if (assistantKey === "p2p" && summary.trade_id) {
    actions.push({
      type: "link",
      label: "Ouvrir la room P2P",
      href: `/app/p2p/trades/${summary.trade_id}`,
    });
  }

  return actions;
}

function buildItems(summary, assistantKey) {
  if (!summary) return [];
  const items = [];
  const currency = summary.wallet_currency || summary.currency || "";

  if (summary.next_step) {
    push(items, "Prochaine action", summary.next_step, "amber");
  }

  if (summary.eta_hint) {
    push(items, "Delai probable", summary.eta_hint, "sky");
  }

  const dailyLimit = toNumber(summary.daily_limit);
  const usedDaily = toNumber(summary.used_daily);
  if (dailyLimit !== null && usedDaily !== null) {
    push(items, "Reste journalier", formatAmount(Math.max(dailyLimit - usedDaily, 0), currency), "emerald");
  }

  const monthlyLimit = toNumber(summary.monthly_limit);
  const usedMonthly = toNumber(summary.used_monthly);
  if (monthlyLimit !== null && usedMonthly !== null) {
    push(items, "Reste mensuel", formatAmount(Math.max(monthlyLimit - usedMonthly, 0), currency), "emerald");
  }

  if (assistantKey === "wallet_support") {
    push(items, "Type de dossier", labelDossierType(summary.dossier_type), "slate");
    push(items, "Acteur attendu", labelActor(summary.who_must_act_now), "sky");
    push(items, "Blocage principal", summary.primary_blocker, "amber");
    push(items, "Statut compte", summary.account_status, "slate");
    push(items, "Statut KYC", summary.kyc_status, "slate");
    push(items, "Capacite totale", formatAmount(summary.total_capacity, currency), "emerald");
  }

  if (assistantKey === "transfer_support") {
    push(items, "Reference", summary.reference_code, "slate");
    push(items, "Type de dossier", labelDossierType(summary.dossier_type), "slate");
    push(items, "Acteur attendu", labelActor(summary.who_must_act_now), "sky");
    push(items, "Statut demande", summary.transfer_status, "slate");
    push(items, "Statut transaction", summary.transaction_status, "slate");
    push(items, "Blocage principal", summary.primary_blocker || joinList(summary.review_reasons || summary.aml_reason_codes), "amber");
    push(items, "Capacite totale", formatAmount(summary.total_capacity, currency), "emerald");
    push(items, "Ecart a couvrir", formatAmount(summary.shortfall_amount, currency), "amber");
  }

  if (assistantKey === "escrow") {
    push(items, "Commande", summary.order_id, "slate");
    push(items, "Type de dossier", labelDossierType(summary.dossier_type), "slate");
    push(items, "Acteur attendu", labelActor(summary.who_must_act_now), "sky");
    push(items, "Statut escrow", summary.status, "slate");
    push(items, "Blocage principal", summary.primary_blocker || joinList(summary.pending_reasons), "amber");
    push(items, "Cause d'attente", joinList(summary.pending_reasons), "amber");
    push(items, "USDC attendu", formatAmount(summary.usdc_expected, "USDC"), "emerald");
    push(items, "Cible payout", formatAmount(summary.bif_target, "BIF"), "emerald");
  }

  if (assistantKey === "p2p") {
    push(items, "Trade", summary.trade_id, "slate");
    push(items, "Type de dossier", labelDossierType(summary.dossier_type), "slate");
    push(items, "Acteur attendu", labelActor(summary.who_must_act_now), "sky");
    push(items, "Role courant", labelActor(summary.current_user_role), "slate");
    push(items, "Statut trade", summary.status, "slate");
    push(items, "Blocage principal", summary.primary_blocker || joinList(summary.blocked_reasons), "amber");
    push(items, "Montant token", summary.token_amount ? `${summary.token_amount} ${summary.token || ""}`.trim() : null, "emerald");
    push(items, "Montant BIF", summary.bif_amount ? `${summary.bif_amount} BIF` : null, "emerald");
    push(items, "Offres actives", summary.open_offers_count, "slate");
  }

  return items;
}

function toneClasses(tone) {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "sky") return "border-sky-200 bg-sky-50 text-sky-900";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

export default function AssistantContextPanel({
  summary,
  assistantKey = "generic",
  title = "Pistes contextuelles",
  onPick,
}) {
  const items = buildItems(summary, assistantKey);
  const actions = buildActions(summary, assistantKey);
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
      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) =>
            action.type === "link" ? (
              <a
                key={`${action.type}-${action.label}`}
                href={action.href}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              >
                {action.label}
              </a>
            ) : (
              <button
                key={`${action.type}-${action.label}`}
                type="button"
                onClick={() => onPick?.(action.prompt)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
