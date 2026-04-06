import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

function formatAmount(value, currency = "") {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatLimit(value, currency = "") {
  return Number(value || 0) > 0 ? formatAmount(value, currency) : "Aucun";
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

function badgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (normalized === "frozen") return "bg-amber-100 text-amber-700 border-amber-200";
  if (normalized === "cancelled") return "bg-rose-100 text-rose-700 border-rose-200";
  if (normalized === "consumed") return "bg-sky-100 text-sky-700 border-sky-200";
  if (normalized === "authorized") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
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

export default function AdminVirtualCardsPage() {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [status, setStatus] = useState("");
  const [cardType, setCardType] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [success, setSuccess] = useState("");
  const [controlsForm, setControlsForm] = useState(controlsFormFromCard(null));

  const loadCards = async (preserveSelection = true) => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getAdminVirtualCards({
        status: status || undefined,
        card_type: cardType || undefined,
        q: query.trim() || undefined,
      });
      const items = Array.isArray(data) ? data : [];
      setCards(items);
      if (!preserveSelection || !items.some((item) => item.card_id === selectedCardId)) {
        setSelectedCardId(items[0]?.card_id || "");
      }
    } catch (err) {
      setCards([]);
      setError(err?.message || "Impossible de charger les cartes virtuelles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards(false);
  }, [status, cardType]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedCardId) {
        setSelectedCard(null);
        setDetailError("");
        return;
      }
      try {
        setDetailLoading(true);
        setDetailError("");
        const data = await api.getAdminVirtualCardDetail(selectedCardId);
        setSelectedCard(data || null);
      } catch (err) {
        setSelectedCard(null);
        setDetailError(err?.message || "Impossible de charger le detail de la carte.");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedCardId]);

  useEffect(() => {
    setControlsForm(controlsFormFromCard(selectedCard));
  }, [selectedCard]);

  const handleApplyFilters = async () => {
    await loadCards(false);
  };

  const handleStatusAction = async (nextStatus) => {
    if (!selectedCard?.card_id) return;
    try {
      setError("");
      setDetailError("");
      setSuccess("");
      const updated = await api.updateAdminVirtualCardStatus(selectedCard.card_id, { status: nextStatus });
      setSelectedCard(updated);
      setCards((prev) => prev.map((item) => (item.card_id === updated.card_id ? { ...item, ...updated } : item)));
      setSuccess(
        nextStatus === "active"
          ? "Carte reactivee."
          : nextStatus === "frozen"
            ? "Carte gelee."
            : "Carte annulee."
      );
    } catch (err) {
      setDetailError(err?.message || "Action sur la carte impossible.");
    }
  };

  const handleSaveControls = async () => {
    if (!selectedCard?.card_id) return;
    try {
      setError("");
      setDetailError("");
      setSuccess("");
      const updated = await api.updateAdminVirtualCardControls(selectedCard.card_id, {
        daily_limit: Number(controlsForm.daily_limit || 0),
        monthly_limit: Number(controlsForm.monthly_limit || 0),
        blocked_categories: parseBlockedCategories(controlsForm.blocked_categories),
      });
      setSelectedCard(updated);
      setCards((prev) => prev.map((item) => (item.card_id === updated.card_id ? { ...item, ...updated } : item)));
      setSuccess("Controles carte mis a jour.");
    } catch (err) {
      setDetailError(err?.message || "Mise a jour des controles impossible.");
    }
  };

  const stats = useMemo(
    () => ({
      active: cards.filter((item) => item.status === "active").length,
      frozen: cards.filter((item) => item.status === "frozen").length,
      risky: cards.filter((item) => Number(item.declined_count || 0) > 0).length,
    }),
    [cards]
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Supervision produit premium</p>
          <h1 className="text-2xl font-bold text-slate-900">Cartes virtuelles</h1>
        </div>
        <button
          onClick={() => loadCards(true)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Actualiser
        </button>
      </header>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Actives" value={stats.active} tone="emerald" />
        <StatCard label="Gelees" value={stats.frozen} tone="amber" />
        <StatCard label="Avec refus" value={stats.risky} tone="rose" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <h2 className="font-semibold text-slate-900">Filtres</h2>
              <p className="text-sm text-slate-500">Recherche par porteur, email, paytag ou PAN masque.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr,180px,180px,auto]">
              <input
                type="text"
                placeholder="Chercher une carte ou un utilisateur"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Tous statuts</option>
                <option value="active">active</option>
                <option value="frozen">frozen</option>
                <option value="cancelled">cancelled</option>
                <option value="consumed">consumed</option>
              </select>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Tous types</option>
                <option value="standard">standard</option>
                <option value="single_use">single_use</option>
              </select>
              <button
                onClick={handleApplyFilters}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Filtrer
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <h2 className="font-semibold text-slate-900">Cartes emises</h2>
              <p className="text-sm text-slate-500">Vue d'ensemble des cartes web liees aux wallets clients.</p>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Chargement des cartes...</p>
            ) : cards.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune carte pour ces filtres.</p>
          ) : (
            <div className="space-y-3">
                {cards.map((card) => (
                  <button
                    key={card.card_id}
                    type="button"
                    onClick={() => setSelectedCardId(card.card_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedCardId === card.card_id
                        ? "border-[#0b3b64] bg-sky-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr,0.92fr]">
                      <CardVisual card={card} compact />
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{card.masked_pan}</p>
                            <p className="text-xs text-slate-500">{card.user_email || card.user_paytag || "-"}</p>
                            {card.cardholder_name && card.cardholder_name !== card.user_label ? (
                              <p className="text-xs text-slate-500">Porteur: {card.cardholder_name}</p>
                            ) : null}
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeClass(card.status)}`}>
                            {card.status}
                          </span>
                        </div>
                        <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                          <p>Type: {card.card_type}</p>
                          <p>Jour: {formatAmount(card.daily_spent, card.currency_code)}</p>
                          <p>Refus: {card.declined_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Detail carte</h2>
            <p className="text-sm text-slate-500">Actions operateur, controle des plafonds et historique des transactions.</p>
          </div>

          {detailError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{detailError}</p> : null}

          {!selectedCard ? (
            <p className="text-sm text-slate-500">Selectionnez une carte.</p>
          ) : detailLoading ? (
            <p className="text-sm text-slate-500">Chargement du detail...</p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-5 xl:grid-cols-[1fr,1.08fr]">
                  <div className="space-y-4">
                    <CardVisual card={selectedCard} />
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                      <p>
                        Categories bloquees:{" "}
                        <span className="font-medium text-slate-900">
                          {(selectedCard.blocked_categories || []).length > 0
                            ? selectedCard.blocked_categories.join(", ")
                            : "Aucune"}
                        </span>
                      </p>
                      {selectedCard.last_decline_reason ? (
                        <p className="mt-1">
                          Dernier refus: <span className="font-medium text-rose-700">{selectedCard.last_decline_reason}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.status !== "cancelled" && selectedCard.status !== "consumed" ? (
                        <button
                          onClick={() => handleStatusAction(selectedCard.status === "frozen" ? "active" : "frozen")}
                          className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                        >
                          {selectedCard.status === "frozen" ? "Degeler" : "Geler"}
                        </button>
                      ) : null}
                      {selectedCard.status !== "cancelled" && selectedCard.status !== "consumed" ? (
                        <button
                          onClick={() => handleStatusAction("cancelled")}
                          className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                        >
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{selectedCard.masked_pan}</p>
                        <p className="text-sm text-slate-500">{selectedCard.user_label}</p>
                        <p className="text-xs text-slate-500">
                          {selectedCard.user_email || selectedCard.user_paytag || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedCard.cardholder_name && selectedCard.cardholder_name !== selectedCard.user_label
                            ? `Porteur: ${selectedCard.cardholder_name} - `
                            : ""}
                          Type: {selectedCard.card_type}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeClass(selectedCard.status)}`}>
                        {selectedCard.status}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InlineMetric label="Plafond total" value={formatAmount(selectedCard.spending_limit, selectedCard.currency_code)} />
                      <InlineMetric label="Depense totale" value={formatAmount(selectedCard.spent_amount, selectedCard.currency_code)} />
                      <InlineMetric label="Jour" value={formatAmount(selectedCard.daily_spent, selectedCard.currency_code)} />
                      <InlineMetric label="Mois" value={formatAmount(selectedCard.monthly_spent, selectedCard.currency_code)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InlineMetric label="Plafond jour" value={formatLimit(selectedCard.daily_limit, selectedCard.currency_code)} />
                      <InlineMetric
                        label="Reste jour"
                        value={
                          selectedCard.daily_remaining == null
                            ? "Aucun"
                            : formatAmount(selectedCard.daily_remaining, selectedCard.currency_code)
                        }
                      />
                      <InlineMetric label="Plafond mois" value={formatLimit(selectedCard.monthly_limit, selectedCard.currency_code)} />
                      <InlineMetric
                        label="Reste mois"
                        value={
                          selectedCard.monthly_remaining == null
                            ? "Aucun"
                            : formatAmount(selectedCard.monthly_remaining, selectedCard.currency_code)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Controles operateur</h3>
                  <p className="text-sm text-slate-500">Ajuste les plafonds et les categories bloquees sans recreer la carte.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-[0.9fr,0.9fr,1.4fr,auto]">
                  <input
                    aria-label="Admin plafond journalier carte virtuelle"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Plafond jour"
                    value={controlsForm.daily_limit}
                    onChange={(e) => setControlsForm((prev) => ({ ...prev, daily_limit: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Admin plafond mensuel carte virtuelle"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Plafond mois"
                    value={controlsForm.monthly_limit}
                    onChange={(e) => setControlsForm((prev) => ({ ...prev, monthly_limit: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Admin categories bloquees carte virtuelle"
                    type="text"
                    placeholder="streaming, gaming, betting"
                    value={controlsForm.blocked_categories}
                    onChange={(e) => setControlsForm((prev) => ({ ...prev, blocked_categories: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleSaveControls}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoBox label="Derniere utilisation" value={formatDateTime(selectedCard.last_used_at)} />
                <InfoBox label="Creation" value={formatDateTime(selectedCard.created_at)} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Historique</h3>
                {(selectedCard.transactions || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune transaction carte.</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedCard.transactions || []).map((tx) => (
                      <div key={tx.card_tx_id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{tx.merchant_name}</p>
                            <p className="text-xs text-slate-500">
                              {tx.merchant_category || "Categorie non renseignee"} - {formatAmount(tx.amount, tx.currency_code)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{formatDateTime(tx.created_at)}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeClass(tx.status)}`}>
                            {tx.status}
                          </span>
                        </div>
                        {tx.decline_reason ? (
                          <p className="mt-2 text-xs text-rose-600">Raison refus: {tx.decline_reason}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function CardVisual({ card, compact = false }) {
  const expMonth = String(card?.exp_month || 4).padStart(2, "0");
  const expYear = String(card?.exp_year || 2029).slice(-2);
  const cardTypeLabel = card?.card_type === "single_use" ? "Single use" : "Standard";
  const limitValue = formatLimit(card?.spending_limit, card?.currency_code);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${getCardTheme(card)} text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
        compact ? "aspect-[1.66/1] p-4" : "aspect-[1.58/1] p-5 sm:p-6"
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
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${badgeClass(card?.status || "active")}`}>
              {card?.status || "active"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">{card?.currency_code || "USD"}</p>
          <p className={`mt-3 font-mono tracking-[0.18em] ${compact ? "text-base" : "text-[1.65rem] sm:text-[1.85rem]"}`}>
            {formatPanForDisplay(card?.masked_pan, card?.last4)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.1fr,0.7fr,0.65fr]">
          <CardInfo label="Type" value={cardTypeLabel} />
          <CardInfo label="Expires" value={`${expMonth}/${expYear}`} />
          <CardInfo label="Limit" value={limitValue} />
        </div>

        {!compact ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CardGlass label="Spent" value={formatAmount(card?.spent_amount, card?.currency_code)} />
            <CardGlass label="Daily" value={formatAmount(card?.daily_spent, card?.currency_code)} />
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

function InlineMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
