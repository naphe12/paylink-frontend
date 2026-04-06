import { useEffect, useState } from "react";
import api from "@/services/api";

const CARD_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "single_use", label: "Usage unique" },
];

function formatAmount(value, currency = "") {
  const amount = Number(value || 0);
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : "0";
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatLimit(value, currency = "") {
  return Number(value || 0) > 0 ? formatAmount(value, currency) : "Aucun";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function parseBlockedCategories(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function controlsFormFromCard(card) {
  return {
    daily_limit: card?.daily_limit ? String(card.daily_limit) : "",
    monthly_limit: card?.monthly_limit ? String(card.monthly_limit) : "",
    blocked_categories: Array.isArray(card?.blocked_categories) ? card.blocked_categories.join(", ") : "",
  };
}

function formatPanForDisplay(value, fallbackLast4 = "") {
  const raw = String(value || "").trim();
  const compact = raw.replace(/\s+/g, "");
  if (!compact && fallbackLast4) return `**** **** **** ${fallbackLast4}`;
  return (compact.match(/.{1,4}/g) || [raw]).join(" ");
}

function getBrandLabel(brand) {
  const normalized = String(brand || "").toLowerCase();
  if (normalized === "visa") return "VISA";
  if (normalized === "mastercard") return "MASTERCARD";
  return normalized ? normalized.toUpperCase() : "PAYLINK";
}

function getStatusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "bg-emerald-100 text-emerald-800";
  if (normalized === "frozen") return "bg-amber-100 text-amber-800";
  if (normalized === "consumed") return "bg-sky-100 text-sky-800";
  if (normalized === "cancelled") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function getTransactionTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "authorized") {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      accent: "from-emerald-500 via-teal-500 to-cyan-500",
      panel: "border-emerald-100 bg-emerald-50/40",
    };
  }
  return {
    badge: "bg-rose-100 text-rose-700",
    accent: "from-rose-500 via-orange-500 to-amber-400",
    panel: "border-rose-100 bg-rose-50/40",
  };
}

function getCardTheme(card = {}) {
  const status = String(card.status || "").toLowerCase();
  const brand = String(card.brand || "").toLowerCase();
  if (status === "frozen") return "from-slate-700 via-slate-800 to-slate-950";
  if (status === "cancelled") return "from-rose-900 via-slate-900 to-black";
  if (status === "consumed") return "from-emerald-700 via-teal-700 to-cyan-950";
  if (brand === "visa") return "from-sky-600 via-cyan-500 to-indigo-900";
  if (brand === "mastercard") return "from-orange-500 via-rose-500 to-slate-950";
  if (card.card_type === "single_use") return "from-emerald-500 via-teal-500 to-[#102542]";
  return "from-[#102542] via-[#2b3f69] to-[#7c2d12]";
}

function getCardTypeDescription(cardType) {
  if (cardType === "single_use") return "Une autorisation web, puis la carte se consomme automatiquement.";
  return "Une carte web reutilisable avec plafonds et categories sous controle.";
}

function CardVisual({ card, revealedCard = null, compact = false }) {
  const cardNumber = revealedCard?.plain_pan || card?.plain_pan || card?.masked_pan;
  const expMonth = String(card?.exp_month || 4).padStart(2, "0");
  const expYear = String(card?.exp_year || 2029).slice(-2);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${getCardTheme(card)} text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] ${
        compact ? "aspect-[1.65/1] p-4" : "aspect-[1.58/1] p-5 sm:p-6"
      }`}
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_45%,transparent_100%)]" />
      <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-white/10" />
      <div className="absolute right-10 top-8 h-24 w-24 rounded-full border border-white/10" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
              <div className="grid grid-cols-2 gap-1">
                <span className="h-2.5 w-7 rounded-full bg-white/80" />
                <span className="h-2.5 w-4 rounded-full bg-white/35" />
                <span className="h-2.5 w-5 rounded-full bg-white/45" />
                <span className="h-2.5 w-6 rounded-full bg-white/70" />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/70">Virtual</p>
              <p className="text-xs text-white/90">{card?.card_type === "single_use" ? "Single use" : "Web card"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/60">{getBrandLabel(card?.brand)}</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadgeClass(card?.status || "active")}`}>
              {card?.status || "active"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">{card?.currency_code || "USD"}</p>
          <p className={`mt-3 font-mono tracking-[0.18em] ${compact ? "text-base" : "text-[1.65rem] sm:text-[1.85rem]"}`}>
            {formatPanForDisplay(cardNumber, card?.last4)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.1fr,0.7fr,0.65fr]">
          <CardInfo label="Cardholder" value={card?.cardholder_name || "Carte virtuelle"} />
          <CardInfo label="Expires" value={`${expMonth}/${expYear}`} />
          <CardInfo label="CVV" value={revealedCard?.plain_cvv || "•••"} />
        </div>

        {!compact ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CardGlass label="Spent" value={formatAmount(card?.spent_amount, card?.currency_code)} />
            <CardGlass label="Limit" value={formatLimit(card?.spending_limit, card?.currency_code)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CardInfo({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/58">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function CardGlass({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SignalCard({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-900"
            : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-[22px] border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function CreateField({ label, hint, children, fullWidth = false }) {
  return (
    <label className={`block rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm ${fullWidth ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-3">{children}</div>
    </label>
  );
}

function RuleChip({ value }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
      {value}
    </span>
  );
}

export default function VirtualCardsPage() {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revealedCard, setRevealedCard] = useState(null);
  const [createForm, setCreateForm] = useState({
    cardholder_name: "",
    card_type: "standard",
    spending_limit: "",
    daily_limit: "",
    monthly_limit: "",
    blocked_categories: "",
  });
  const [chargeForm, setChargeForm] = useState({
    merchant_name: "",
    merchant_category: "",
    amount: "",
  });
  const [controlsForm, setControlsForm] = useState(controlsFormFromCard(null));

  const mergeCardIntoList = (card) => {
    if (!card?.card_id) return;
    setCards((prev) => {
      const existing = prev.some((item) => item.card_id === card.card_id);
      if (!existing) return [card, ...prev];
      return prev.map((item) => (item.card_id === card.card_id ? { ...item, ...card } : item));
    });
  };

  const loadCards = async (targetCardId = "") => {
    try {
      setLoading(true);
      setError("");
      const rows = await api.listVirtualCards();
      const items = Array.isArray(rows) ? rows : [];
      setCards(items);
      const nextCardId = targetCardId || selectedCardId || items[0]?.card_id || "";
      setSelectedCardId(nextCardId);
      if (nextCardId) {
        const detail = await api.getVirtualCardDetail(nextCardId);
        setSelectedCard(detail || null);
      } else {
        setSelectedCard(null);
      }
    } catch (err) {
      setError(err?.message || "Impossible de charger les cartes virtuelles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    setControlsForm(controlsFormFromCard(selectedCard));
  }, [selectedCard]);

  const handleSelectCard = async (cardId) => {
    try {
      setSelectedCardId(cardId);
      setLoading(true);
      setError("");
      setSuccess("");
      setRevealedCard(null);
      const detail = await api.getVirtualCardDetail(cardId);
      setSelectedCard(detail || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger cette carte.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    try {
      setError("");
      setSuccess("");
      const created = await api.createVirtualCard({
        cardholder_name: createForm.cardholder_name || null,
        card_type: createForm.card_type,
        spending_limit: Number(createForm.spending_limit || 0),
        daily_limit: Number(createForm.daily_limit || 0),
        monthly_limit: Number(createForm.monthly_limit || 0),
        blocked_categories: parseBlockedCategories(createForm.blocked_categories),
      });
      setRevealedCard({ plain_pan: created?.plain_pan || "", plain_cvv: created?.plain_cvv || "" });
      setSuccess("Carte virtuelle emise.");
      mergeCardIntoList(created);
      setSelectedCardId(created.card_id);
      setSelectedCard(created);
      setCreateForm({
        cardholder_name: "",
        card_type: "standard",
        spending_limit: "",
        daily_limit: "",
        monthly_limit: "",
        blocked_categories: "",
      });
    } catch (err) {
      setError(err?.message || "Creation de carte impossible.");
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedCard?.card_id) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.updateVirtualCardStatus(selectedCard.card_id, { status });
      mergeCardIntoList(updated);
      setSelectedCard(updated);
      setSuccess(`Carte ${status === "active" ? "activee" : status === "frozen" ? "gelee" : "annulee"}.`);
    } catch (err) {
      setError(err?.message || "Mise a jour de la carte impossible.");
    }
  };

  const handleSaveControls = async () => {
    if (!selectedCard?.card_id) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.updateVirtualCardControls(selectedCard.card_id, {
        daily_limit: Number(controlsForm.daily_limit || 0),
        monthly_limit: Number(controlsForm.monthly_limit || 0),
        blocked_categories: parseBlockedCategories(controlsForm.blocked_categories),
      });
      mergeCardIntoList(updated);
      setSelectedCard(updated);
      setSuccess("Regles de carte mises a jour.");
    } catch (err) {
      setError(err?.message || "Mise a jour des regles carte impossible.");
    }
  };

  const handleCharge = async () => {
    if (!selectedCard?.card_id) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.chargeVirtualCard(selectedCard.card_id, {
        merchant_name: chargeForm.merchant_name,
        merchant_category: chargeForm.merchant_category || null,
        amount: Number(chargeForm.amount || 0),
      });
      mergeCardIntoList(updated);
      setSelectedCard(updated);
      setSuccess("Paiement en ligne simule avec succes.");
      setChargeForm({ merchant_name: "", merchant_category: "", amount: "" });
    } catch (err) {
      setError(err?.message || "Paiement carte impossible.");
    }
  };

  const previewCard = {
    cardholder_name: createForm.cardholder_name || "Nom du porteur",
    brand: "visa",
    card_type: createForm.card_type,
    currency_code: selectedCard?.currency_code || "USD",
    masked_pan: createForm.card_type === "single_use" ? "4971 **** **** 9042" : "4263 **** **** 1234",
    last4: createForm.card_type === "single_use" ? "9042" : "1234",
    exp_month: 4,
    exp_year: 2029,
    status: "active",
    spending_limit: Number(createForm.spending_limit || 0),
    spent_amount: 0,
  };
  const previewBlockedCategories = parseBlockedCategories(createForm.blocked_categories);
  const selectedBlockedCategories = Array.isArray(selectedCard?.blocked_categories)
    ? selectedCard.blocked_categories.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : [];
  const chargeCategory = String(chargeForm.merchant_category || "").trim().toLowerCase();
  const chargeAmount = Number(chargeForm.amount || 0);
  const categoryWouldBeBlocked = Boolean(chargeCategory) && selectedBlockedCategories.includes(chargeCategory);
  const chargeSignals = selectedCard
    ? [
        {
          label: "Statut carte",
          value:
            selectedCard.status === "active"
              ? "Carte prete"
              : selectedCard.status === "frozen"
                ? "Carte gelee"
                : selectedCard.status,
          tone:
            selectedCard.status === "active"
              ? "emerald"
              : selectedCard.status === "frozen"
                ? "amber"
                : "slate",
        },
        {
          label: "Reste jour",
          value:
            selectedCard.daily_remaining == null
              ? "Aucun"
              : formatAmount(selectedCard.daily_remaining, selectedCard.currency_code),
          tone: "sky",
        },
        {
          label: "Verification categorie",
          value: chargeCategory
            ? categoryWouldBeBlocked
              ? "Categorie actuellement bloquee"
              : "Categorie autorisable"
            : "Saisis une categorie",
          tone: categoryWouldBeBlocked ? "rose" : chargeCategory ? "emerald" : "slate",
        },
      ]
    : [];
  const createSignals = [
    {
      label: "Mode",
      value: createForm.card_type === "single_use" ? "Usage unique" : "Standard web",
      tone: createForm.card_type === "single_use" ? "emerald" : "sky",
    },
    {
      label: "Plafond cible",
      value: formatLimit(createForm.spending_limit, previewCard.currency_code),
      tone: "amber",
    },
    {
      label: "Protection",
      value:
        previewBlockedCategories.length > 0
          ? `${previewBlockedCategories.length} categories bloquees`
          : "Aucune restriction",
      tone: previewBlockedCategories.length > 0 ? "rose" : "slate",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#f8fafc_0%,#ffffff_38%,#eff6ff_100%)] p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr,1.15fr]">
          <div className="space-y-4">
            <div>
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-800">
                Studio emission
              </span>
              <h1 className="text-2xl font-semibold text-slate-900">Cartes virtuelles</h1>
              <p className="mt-2 text-sm text-slate-500">
                Cree une carte web, fixe des plafonds par fenetre et bloque les categories sensibles avant de simuler un paiement.
              </p>
            </div>
            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {createSignals.map((signal) => (
                <SignalCard key={signal.label} label={signal.label} value={signal.value} tone={signal.tone} />
              ))}
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-slate-950/70 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <CardVisual card={previewCard} />
            </div>
          </div>

          <div className="space-y-4">
            {revealedCard?.plain_pan ? (
              <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
                <CardVisual
                  card={{ ...selectedCard, masked_pan: revealedCard.plain_pan, plain_pan: revealedCard.plain_pan }}
                  revealedCard={revealedCard}
                />
                <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fff9db_0%,#fff4bf_100%)] p-4 text-sm text-amber-950 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Affichage unique</p>
                  <p className="mt-3 text-sm text-amber-800">
                    Le numero complet n'est plus re-affiche ensuite. Conserve ces informations maintenant.
                  </p>
                  <div className="mt-4 space-y-3 rounded-2xl bg-white/80 p-4 shadow-inner">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">Numero</p>
                      <p className="mt-1 break-all font-mono text-base">{revealedCard.plain_pan}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">CVV</p>
                      <p className="mt-1 font-mono text-base">{revealedCard.plain_cvv}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-[30px] border border-slate-200 bg-white/95 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="grid gap-5 lg:grid-cols-[1.18fr,0.82fr]">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Configurer l'emission</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Renseigne le porteur, le mode de carte et les garde-fous wallet avant emission.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <CreateField label="Porteur" hint="Nom visible sur la carte">
                      <input
                        aria-label="Nom porteur carte virtuelle"
                        type="text"
                        placeholder="Nom du porteur"
                        value={createForm.cardholder_name}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, cardholder_name: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </CreateField>
                    <CreateField label="Type" hint="Standard ou usage unique">
                      <select
                        aria-label="Type carte virtuelle"
                        value={createForm.card_type}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, card_type: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      >
                        {CARD_TYPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </CreateField>
                    <CreateField label="Plafond total" hint="Budget maximum autorise">
                      <input
                        aria-label="Plafond carte virtuelle"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Plafond total"
                        value={createForm.spending_limit}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, spending_limit: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </CreateField>
                    <CreateField label="Plafond jour" hint="Controle par fenetre quotidienne">
                      <input
                        aria-label="Plafond journalier carte virtuelle"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Plafond jour"
                        value={createForm.daily_limit}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, daily_limit: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </CreateField>
                    <CreateField label="Plafond mois" hint="Verrou longue duree">
                      <input
                        aria-label="Plafond mensuel carte virtuelle"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Plafond mois"
                        value={createForm.monthly_limit}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, monthly_limit: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </CreateField>
                    <CreateField label="Categories bloquees" hint="Liste separee par des virgules" fullWidth>
                      <input
                        aria-label="Categories bloquees carte virtuelle"
                        type="text"
                        placeholder="streaming, gaming, betting"
                        value={createForm.blocked_categories}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, blocked_categories: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </CreateField>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm text-white shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Emission</p>
                      <p className="mt-1 font-medium">Le PAN complet est affiche une seule fois apres creation.</p>
                    </div>
                    <button onClick={handleCreateCard} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
                      Emettre la carte
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)] p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pre-validation</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">Brief emission</h3>
                  <p className="mt-1 text-sm text-slate-500">{getCardTypeDescription(createForm.card_type)}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <StatCard label="Jour" value={formatLimit(createForm.daily_limit, previewCard.currency_code)} />
                    <StatCard label="Mois" value={formatLimit(createForm.monthly_limit, previewCard.currency_code)} />
                  </div>

                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Parcours</p>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <p className="rounded-2xl bg-slate-50 px-3 py-2">1. Emission instantanee et activation immediate.</p>
                      <p className="rounded-2xl bg-slate-50 px-3 py-2">2. Debit wallet au moment du paiement web.</p>
                      <p className="rounded-2xl bg-slate-50 px-3 py-2">
                        3. {createForm.card_type === "single_use" ? "Cloture automatique apres la premiere autorisation." : "Reutilisation possible tant que les plafonds restent valides."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Categories bloquees</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {previewBlockedCategories.length > 0 ? (
                        previewBlockedCategories.map((category) => <RuleChip key={category} value={category} />)
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Aucune categorie bloquee
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.45fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mes cartes</h2>
              <p className="text-sm text-slate-500">Standard ou usage unique.</p>
            </div>
            <button onClick={() => loadCards(selectedCardId)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Rafraichir</button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          ) : cards.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune carte virtuelle pour le moment.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {cards.map((card) => (
                <button key={card.card_id} onClick={() => handleSelectCard(card.card_id)} className={`w-full rounded-[24px] border p-4 text-left transition ${selectedCardId === card.card_id ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="grid gap-4 lg:grid-cols-[1fr,0.9fr]">
                    <CardVisual card={card} compact />
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{card.cardholder_name || "Carte virtuelle"}</p>
                          <p className="text-xs text-slate-500">{card.card_type === "single_use" ? "Usage unique" : "Standard"} - {card.currency_code}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(card.status)}`}>{card.status}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <StatCard label="Depenses" value={formatAmount(card.spent_amount, card.currency_code)} />
                        <StatCard label="Jour" value={formatAmount(card.daily_spent, card.currency_code)} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {!selectedCard ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">Selectionne une carte pour consulter son detail et simuler un paiement.</div>
          ) : (
            <>
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-6 2xl:grid-cols-[1.05fr,0.95fr]">
                  <div className="space-y-4">
                    <CardVisual card={selectedCard} />
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p>Categories bloquees: <span className="font-medium text-slate-900">{(selectedCard.blocked_categories || []).length > 0 ? selectedCard.blocked_categories.join(", ") : "Aucune"}</span></p>
                      {selectedCard.last_decline_reason ? <p className="mt-1">Dernier refus: <span className="font-medium text-rose-700">{selectedCard.last_decline_reason}</span></p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.status !== "cancelled" && selectedCard.status !== "consumed" ? <button onClick={() => handleUpdateStatus(selectedCard.status === "frozen" ? "active" : "frozen")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{selectedCard.status === "frozen" ? "Degeler" : "Geler"}</button> : null}
                      {selectedCard.status !== "cancelled" && selectedCard.status !== "consumed" ? <button onClick={() => handleUpdateStatus("cancelled")} className="rounded-xl border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">Annuler</button> : null}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{selectedCard.cardholder_name}</h2>
                      <p className="text-sm text-slate-500">{selectedCard.masked_pan}</p>
                      <p className="text-xs text-slate-500">Exp {String(selectedCard.exp_month).padStart(2, "0")}/{selectedCard.exp_year} - {selectedCard.brand}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      <StatCard label="Statut" value={selectedCard.status} />
                      <StatCard label="Type" value={selectedCard.card_type} />
                      <StatCard label="Plafond" value={formatAmount(selectedCard.spending_limit, selectedCard.currency_code)} />
                      <StatCard label="Depense" value={formatAmount(selectedCard.spent_amount, selectedCard.currency_code)} />
                      <StatCard label="Jour" value={formatAmount(selectedCard.daily_spent, selectedCard.currency_code)} />
                      <StatCard label="Mois" value={formatAmount(selectedCard.monthly_spent, selectedCard.currency_code)} />
                      <StatCard label="Plafond jour" value={formatLimit(selectedCard.daily_limit, selectedCard.currency_code)} />
                      <StatCard label="Reste jour" value={selectedCard.daily_remaining == null ? "Aucun" : formatAmount(selectedCard.daily_remaining, selectedCard.currency_code)} />
                      <StatCard label="Reste mois" value={selectedCard.monthly_remaining == null ? "Aucun" : formatAmount(selectedCard.monthly_remaining, selectedCard.currency_code)} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Regles avancees</h3>
                  <p className="text-sm text-slate-500">Fixe un plafond journalier, un plafond mensuel et bloque des categories marchandes.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[0.9fr,0.9fr,1.4fr,auto]">
                  <input aria-label="Edition plafond journalier carte virtuelle" type="number" min="0" step="0.01" placeholder="Plafond jour" value={controlsForm.daily_limit} onChange={(e) => setControlsForm((prev) => ({ ...prev, daily_limit: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <input aria-label="Edition plafond mensuel carte virtuelle" type="number" min="0" step="0.01" placeholder="Plafond mois" value={controlsForm.monthly_limit} onChange={(e) => setControlsForm((prev) => ({ ...prev, monthly_limit: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <input aria-label="Edition categories bloquees carte virtuelle" type="text" placeholder="streaming, gaming, betting" value={controlsForm.blocked_categories} onChange={(e) => setControlsForm((prev) => ({ ...prev, blocked_categories: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={handleSaveControls} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Enregistrer</button>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Simulation paiement en ligne</h3>
                  <p className="text-sm text-slate-500">Utilise ce parcours pour valider le debit wallet, les plafonds journaliers et le comportement usage unique.</p>
                </div>
                <div className="grid gap-5 xl:grid-cols-[1.12fr,0.88fr]">
                  <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <CreateField label="Marchand" hint="Nom affiche dans l'autorisation">
                        <input
                          aria-label="Marchand carte virtuelle"
                          type="text"
                          placeholder="Nom du marchand"
                          value={chargeForm.merchant_name}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, merchant_name: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                        />
                      </CreateField>
                      <CreateField label="Categorie" hint="MCC simplifiee ou famille marchande">
                        <input
                          aria-label="Categorie marchand carte virtuelle"
                          type="text"
                          placeholder="Categorie"
                          value={chargeForm.merchant_category}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, merchant_category: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                        />
                      </CreateField>
                      <CreateField label="Montant" hint="Valeur simulee sur le wallet">
                        <input
                          aria-label="Montant paiement carte virtuelle"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Montant"
                          value={chargeForm.amount}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, amount: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                        />
                      </CreateField>
                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Lecture operateur</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p className="rounded-2xl bg-slate-50 px-3 py-2">
                            {chargeAmount > 0
                              ? `Montant teste: ${formatAmount(chargeAmount, selectedCard.currency_code)}`
                              : "Renseigne un montant pour projeter l'autorisation."}
                          </p>
                          <p className="rounded-2xl bg-slate-50 px-3 py-2">
                            {selectedCard.card_type === "single_use"
                              ? "Cette carte sera consommee apres une autorisation reussie."
                              : "Cette carte restera reutilisable si les plafonds le permettent."}
                          </p>
                          <p className="rounded-2xl bg-slate-50 px-3 py-2">
                            {categoryWouldBeBlocked
                              ? "La categorie saisie est actuellement dans la liste bloquee."
                              : "Aucun blocage explicite detecte sur la categorie saisie."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm text-white shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Simulation</p>
                        <p className="mt-1 font-medium">Teste debit wallet, filtres categories et comportement du type de carte.</p>
                      </div>
                      <button onClick={handleCharge} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">Simuler l'achat</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                      {chargeSignals.map((signal) => (
                        <SignalCard key={signal.label} label={signal.label} value={signal.value} tone={signal.tone} />
                      ))}
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_40%,#f8fafc_100%)] p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Feu vert</p>
                      <h4 className="mt-2 text-base font-semibold text-slate-900">Lecture avant execution</h4>
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <p className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                          Marchand: <span className="font-medium text-slate-900">{chargeForm.merchant_name || "Non renseigne"}</span>
                        </p>
                        <p className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                          Categorie: <span className="font-medium text-slate-900">{chargeForm.merchant_category || "Non renseignee"}</span>
                        </p>
                        <p className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                          Reste mois:{" "}
                          <span className="font-medium text-slate-900">
                            {selectedCard.monthly_remaining == null
                              ? "Aucun"
                              : formatAmount(selectedCard.monthly_remaining, selectedCard.currency_code)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)] p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                  <h3 className="text-lg font-semibold text-slate-900">Historique carte</h3>
                  <p className="text-sm text-slate-500">Autorisations et refus enregistres sur cette carte.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SignalCard
                      label="Transactions"
                      value={`${(selectedCard.transactions || []).length}`}
                      tone={(selectedCard.transactions || []).length > 0 ? "sky" : "slate"}
                    />
                    <SignalCard
                      label="Dernier etat"
                      value={(selectedCard.transactions || [])[0]?.status || "Aucune activite"}
                      tone={(selectedCard.transactions || [])[0]?.status === "authorized" ? "emerald" : "slate"}
                    />
                  </div>
                </div>
                {(selectedCard.transactions || []).length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
                    Aucune transaction carte pour le moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(selectedCard.transactions || []).map((tx) => (
                      <div key={tx.card_tx_id} className={`relative overflow-hidden rounded-[26px] border p-4 shadow-sm ${getTransactionTone(tx.status).panel}`}>
                        <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${getTransactionTone(tx.status).accent}`} />
                        <div className="ml-2 grid gap-4 lg:grid-cols-[1fr,auto]">
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{tx.merchant_name}</p>
                                <p className="text-xs text-slate-500">
                                  {tx.merchant_category || "Categorie non renseignee"} - {formatAmount(tx.amount, tx.currency_code)}
                                </p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getTransactionTone(tx.status).badge}`}>
                                {tx.status}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-white px-3 py-1 shadow-sm">{formatDateTime(tx.created_at)}</span>
                              <span className="rounded-full bg-white px-3 py-1 font-mono shadow-sm">{tx.reference || "Sans reference"}</span>
                            </div>
                            {tx.decline_reason ? (
                              <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-rose-600 shadow-sm">
                                Raison refus: {tx.decline_reason}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-[22px] border border-white/60 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Montant</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatAmount(tx.amount, tx.currency_code)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
