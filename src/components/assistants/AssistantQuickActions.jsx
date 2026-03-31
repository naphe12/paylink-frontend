function buildPrompts(assistantKey, summary) {
  if (!summary) return [];

  const prompts = [];
  const push = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (!prompts.includes(text)) prompts.push(text);
  };

  if (assistantKey === "wallet_support") {
    push("quelles sont mes limites restantes aujourd'hui et ce mois ?");
    if (summary.next_step) push("quelle est la prochaine action recommandee ?");
    if (summary.eta_hint) push("quel est le delai probable ?");
    if (summary.account_status) push("pourquoi je ne peux plus envoyer ?");
  }

  if (assistantKey === "transfer_support") {
    if (summary.reference_code) push(`suis la reference ${summary.reference_code}`);
    if (summary.next_step) push("quelle est la prochaine action recommandee pour ce transfert ?");
    if (summary.eta_hint) push("quel est le delai probable pour ce transfert ?");
    push("est-ce une limite journaliere ou mensuelle qui bloque ?");
  }

  if (assistantKey === "escrow") {
    if (summary.order_id) push(`suis la commande ${summary.order_id}`);
    if (summary.next_step) push("que dois-je faire maintenant sur mon escrow ?");
    if (summary.eta_hint) push("quel est le delai probable de mon escrow ?");
    push("pourquoi mon escrow est en attente ?");
  }

  if (assistantKey === "p2p") {
    if (summary.trade_id) push(`suis le trade ${summary.trade_id}`);
    if (summary.next_step) push("qui doit agir maintenant sur mon trade ?");
    if (summary.eta_hint) push("quel est le delai probable pour mon trade ?");
    push("pourquoi mon trade p2p est bloque ?");
  }

  return prompts.slice(0, 4);
}

export default function AssistantQuickActions({ assistantKey, summary, onPick }) {
  const prompts = buildPrompts(assistantKey, summary);
  if (!prompts.length || typeof onPick !== "function") return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Actions suggerees</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:border-slate-300 hover:bg-white"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
