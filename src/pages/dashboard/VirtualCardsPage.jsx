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
      setRevealedCard({
        plain_pan: created?.plain_pan || "",
        plain_cvv: created?.plain_cvv || "",
      });
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cartes virtuelles</h1>
          <p className="text-sm text-slate-500">
            Cree une carte web, fixe des plafonds par fenetre et bloque les categories sensibles avant de simuler un paiement.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        {revealedCard?.plain_pan ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Numero affiche une seule fois</p>
            <p className="mt-1 font-mono">{revealedCard.plain_pan}</p>
            <p className="mt-1">
              CVV: <span className="font-mono">{revealedCard.plain_cvv}</span>
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.05fr,0.8fr,0.8fr,0.8fr,0.8fr,1.1fr,auto]">
          <input
            aria-label="Nom porteur carte virtuelle"
            type="text"
            placeholder="Nom du porteur"
            value={createForm.cardholder_name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, cardholder_name: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            aria-label="Type carte virtuelle"
            value={createForm.card_type}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, card_type: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {CARD_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Plafond carte virtuelle"
            type="number"
            min="0"
            step="0.01"
            placeholder="Plafond total"
            value={createForm.spending_limit}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, spending_limit: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Plafond journalier carte virtuelle"
            type="number"
            min="0"
            step="0.01"
            placeholder="Plafond jour"
            value={createForm.daily_limit}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, daily_limit: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Plafond mensuel carte virtuelle"
            type="number"
            min="0"
            step="0.01"
            placeholder="Plafond mois"
            value={createForm.monthly_limit}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, monthly_limit: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Categories bloquees carte virtuelle"
            type="text"
            placeholder="streaming, gaming, betting"
            value={createForm.blocked_categories}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, blocked_categories: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreateCard}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Emettre la carte
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.45fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mes cartes</h2>
              <p className="text-sm text-slate-500">Standard ou usage unique.</p>
            </div>
            <button
              onClick={() => loadCards(selectedCardId)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : cards.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune carte virtuelle pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <button
                  key={card.card_id}
                  onClick={() => handleSelectCard(card.card_id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedCardId === card.card_id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{card.masked_pan}</p>
                      <p className="text-xs text-slate-500">
                        {card.card_type === "single_use" ? "Usage unique" : "Standard"} - {card.currency_code}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{card.status}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <p>Depenses: {formatAmount(card.spent_amount, card.currency_code)}</p>
                    <p>Jour: {formatAmount(card.daily_spent, card.currency_code)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {!selectedCard ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Selectionne une carte pour consulter son detail et simuler un paiement.
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedCard.cardholder_name}</h2>
                    <p className="text-sm text-slate-500">{selectedCard.masked_pan}</p>
                    <p className="text-xs text-slate-500">
                      Exp {String(selectedCard.exp_month).padStart(2, "0")}/{selectedCard.exp_year} - {selectedCard.brand}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Statut" value={selectedCard.status} />
                    <StatCard label="Type" value={selectedCard.card_type} />
                    <StatCard label="Plafond" value={formatAmount(selectedCard.spending_limit, selectedCard.currency_code)} />
                    <StatCard label="Depense" value={formatAmount(selectedCard.spent_amount, selectedCard.currency_code)} />
                    <StatCard label="Jour" value={formatAmount(selectedCard.daily_spent, selectedCard.currency_code)} />
                    <StatCard label="Mois" value={formatAmount(selectedCard.monthly_spent, selectedCard.currency_code)} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Plafond jour" value={formatLimit(selectedCard.daily_limit, selectedCard.currency_code)} />
                  <StatCard
                    label="Reste jour"
                    value={
                      selectedCard.daily_remaining == null
                        ? "Aucun"
                        : formatAmount(selectedCard.daily_remaining, selectedCard.currency_code)
                    }
                  />
                  <StatCard label="Plafond mois" value={formatLimit(selectedCard.monthly_limit, selectedCard.currency_code)} />
                  <StatCard
                    label="Reste mois"
                    value={
                      selectedCard.monthly_remaining == null
                        ? "Aucun"
                        : formatAmount(selectedCard.monthly_remaining, selectedCard.currency_code)
                    }
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
                      onClick={() => handleUpdateStatus(selectedCard.status === "frozen" ? "active" : "frozen")}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {selectedCard.status === "frozen" ? "Degeler" : "Geler"}
                    </button>
                  ) : null}
                  {selectedCard.status !== "cancelled" && selectedCard.status !== "consumed" ? (
                    <button
                      onClick={() => handleUpdateStatus("cancelled")}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Regles avancees</h3>
                  <p className="text-sm text-slate-500">
                    Fixe un plafond journalier, un plafond mensuel et bloque des categories marchandes.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[0.9fr,0.9fr,1.4fr,auto]">
                  <input
                    aria-label="Edition plafond journalier carte virtuelle"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Plafond jour"
                    value={controlsForm.daily_limit}
                    onChange={(e) => setControlsForm((prev) => ({ ...prev, daily_limit: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Edition plafond mensuel carte virtuelle"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Plafond mois"
                    value={controlsForm.monthly_limit}
                    onChange={(e) => setControlsForm((prev) => ({ ...prev, monthly_limit: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Edition categories bloquees carte virtuelle"
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
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Simulation paiement en ligne</h3>
                  <p className="text-sm text-slate-500">
                    Utilise ce parcours pour valider le debit wallet, les plafonds journaliers et le comportement usage unique.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.1fr,1fr,0.8fr,auto]">
                  <input
                    aria-label="Marchand carte virtuelle"
                    type="text"
                    placeholder="Nom du marchand"
                    value={chargeForm.merchant_name}
                    onChange={(e) => setChargeForm((prev) => ({ ...prev, merchant_name: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Categorie marchand carte virtuelle"
                    type="text"
                    placeholder="Categorie"
                    value={chargeForm.merchant_category}
                    onChange={(e) => setChargeForm((prev) => ({ ...prev, merchant_category: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Montant paiement carte virtuelle"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCharge}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Simuler l'achat
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Historique carte</h3>
                  <p className="text-sm text-slate-500">Autorisations et refus enregistres sur cette carte.</p>
                </div>
                {(selectedCard.transactions || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune transaction carte pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedCard.transactions || []).map((tx) => (
                      <div key={tx.card_tx_id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{tx.merchant_name}</p>
                            <p className="text-xs text-slate-500">
                              {tx.merchant_category || "Categorie non renseignee"} - {formatAmount(tx.amount, tx.currency_code)}
                            </p>
                            <p className="mt-1 text-xs font-mono text-slate-400">{tx.reference}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              tx.status === "authorized"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
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
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
