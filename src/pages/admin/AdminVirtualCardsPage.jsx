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
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{card.masked_pan}</p>
                        <p className="text-xs text-slate-500">
                          {card.user_label} - {card.cardholder_name}
                        </p>
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
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedCard.masked_pan}</p>
                    <p className="text-sm text-slate-500">
                      {selectedCard.user_label} - {selectedCard.user_email || selectedCard.user_paytag || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Porteur: {selectedCard.cardholder_name} - Type: {selectedCard.card_type}
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
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
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
                <div className="mt-4 flex flex-wrap gap-2">
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
