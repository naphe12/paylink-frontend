import { useEffect, useState } from "react";
import api from "@/services/api";

const POT_MODE_LABELS = {
  collection: "Collecte",
  group_savings: "Epargne de groupe",
};

const MEMBER_STATUS_LABELS = {
  active: "actif",
  paused: "suspendu",
  removed: "retire",
  left: "a quitte",
};

function formatAmount(value, currency) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || ""}`.trim();
}

function createMemberDraftMap(members = []) {
  return Object.fromEntries(
    (members || []).map((member) => [
      member.membership_id,
      {
        target_amount: member.target_amount ? String(member.target_amount) : "",
        status: member.status || "active",
      },
    ])
  );
}

export default function PotsPage() {
  const [items, setItems] = useState([]);
  const [selectedPot, setSelectedPot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    deadline_at: "",
    description: "",
    is_public: false,
    pot_mode: "collection",
  });
  const [amount, setAmount] = useState("");
  const [memberForm, setMemberForm] = useState({
    identifier: "",
    target_amount: "",
  });
  const [memberDrafts, setMemberDrafts] = useState({});

  const canManageMembers = selectedPot?.access_role === "owner" && selectedPot?.pot_mode === "group_savings";
  const canContribute = Boolean(
    selectedPot &&
      ["owner", "member"].includes(selectedPot.access_role) &&
      (selectedPot.can_contribute ?? true)
  );
  const canClose = selectedPot?.access_role === "owner";
  const canLeave = selectedPot?.access_role === "member";

  const loadPots = async (potIdToSelect = null) => {
    try {
      setLoading(true);
      const rows = await api.listPots();
      const normalized = Array.isArray(rows) ? rows : [];
      setItems(normalized);
      const target =
        normalized.find((item) => item.pot_id === potIdToSelect) ||
        normalized.find((item) => item.pot_id === selectedPot?.pot_id) ||
        normalized[0] ||
        null;
      if (target) {
        const detail = await api.getPotDetail(target.pot_id);
        setSelectedPot(detail);
        setMemberDrafts(createMemberDraftMap(detail.members));
      } else {
        setSelectedPot(null);
        setMemberDrafts({});
      }
    } catch (err) {
      setError(err?.message || "Impossible de charger les cagnottes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPots();
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.target_amount) {
      setError("Renseigne le titre et le montant cible.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const created = await api.createPot({
        title: form.title,
        target_amount: Number(form.target_amount),
        deadline_at: form.deadline_at ? new Date(form.deadline_at).toISOString() : null,
        description: form.description || null,
        is_public: form.is_public,
        pot_mode: form.pot_mode,
      });
      setSuccess(form.pot_mode === "group_savings" ? "Epargne de groupe creee." : "Cagnotte creee.");
      setForm({
        title: "",
        target_amount: "",
        deadline_at: "",
        description: "",
        is_public: false,
        pot_mode: "collection",
      });
      await loadPots(created.pot_id);
    } catch (err) {
      setError(err?.message || "Creation impossible.");
    }
  };

  const handleContribute = async () => {
    if (!selectedPot || !amount) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.contributePot(selectedPot.pot_id, { amount: Number(amount) });
      setSelectedPot(detail);
      setMemberDrafts(createMemberDraftMap(detail.members));
      setAmount("");
      setSuccess("Contribution enregistree.");
      await loadPots(selectedPot.pot_id);
    } catch (err) {
      setError(err?.message || "Contribution impossible.");
    }
  };

  const handleClose = async () => {
    if (!selectedPot) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.closePot(selectedPot.pot_id, {});
      setSelectedPot(detail);
      setMemberDrafts(createMemberDraftMap(detail.members));
      setSuccess("Cagnotte fermee.");
      await loadPots(selectedPot.pot_id);
    } catch (err) {
      setError(err?.message || "Cloture impossible.");
    }
  };

  const handleLeave = async () => {
    if (!selectedPot) return;
    try {
      setError("");
      setSuccess("");
      await api.leavePot(selectedPot.pot_id, {});
      setSuccess("Vous avez quitte l'epargne de groupe.");
      await loadPots();
    } catch (err) {
      setError(err?.message || "Sortie impossible.");
    }
  };

  const handleAddMember = async () => {
    if (!selectedPot || !memberForm.identifier.trim()) return;
    try {
      setError("");
      setSuccess("");
      const detail = await api.addPotMember(selectedPot.pot_id, {
        identifier: memberForm.identifier.trim(),
        target_amount: memberForm.target_amount ? Number(memberForm.target_amount) : null,
      });
      setSelectedPot(detail);
      setMemberDrafts(createMemberDraftMap(detail.members));
      setMemberForm({ identifier: "", target_amount: "" });
      setSuccess("Membre ajoute a l'epargne de groupe.");
      await loadPots(selectedPot.pot_id);
    } catch (err) {
      setError(err?.message || "Ajout membre impossible.");
    }
  };

  const handleMemberDraftChange = (membershipId, field, value) => {
    setMemberDrafts((prev) => ({
      ...prev,
      [membershipId]: {
        ...(prev[membershipId] || {}),
        [field]: value,
      },
    }));
  };

  const handleMemberUpdate = async (member) => {
    if (!selectedPot) return;
    const draft = memberDrafts[member.membership_id] || {};
    try {
      setError("");
      setSuccess("");
      const detail = await api.updatePotMember(selectedPot.pot_id, member.membership_id, {
        target_amount: draft.target_amount ? Number(draft.target_amount) : null,
        status: draft.status || member.status,
      });
      setSelectedPot(detail);
      setMemberDrafts(createMemberDraftMap(detail.members));
      setSuccess("Parametres membre mis a jour.");
      await loadPots(selectedPot.pot_id);
    } catch (err) {
      setError(err?.message || "Mise a jour membre impossible.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cagnottes et epargne de groupe</h1>
          <p className="text-sm text-slate-500">
            Cree une collecte ou un objectif d'epargne de groupe, invite des membres et suis les contributions.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            aria-label="Titre cagnotte"
            type="text"
            placeholder="Titre de la cagnotte"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Montant cible cagnotte"
            type="number"
            min="0"
            step="0.01"
            placeholder="Montant cible"
            value={form.target_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, target_amount: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            aria-label="Mode cagnotte"
            value={form.pot_mode}
            onChange={(e) => setForm((prev) => ({ ...prev, pot_mode: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="collection">Collecte simple</option>
            <option value="group_savings">Epargne de groupe</option>
          </select>
          <input
            aria-label="Date limite cagnotte"
            type="date"
            value={form.deadline_at}
            onChange={(e) => setForm((prev) => ({ ...prev, deadline_at: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Description cagnotte"
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
          />
          Partage public
        </label>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Creer
        </button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mes espaces</h2>
              <p className="text-sm text-slate-500">Retrouve tes collectes et epargnes de groupe.</p>
            </div>
            <button
              onClick={() => loadPots(selectedPot?.pot_id || null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucun espace pour le moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <button
                  key={item.pot_id}
                  onClick={async () => {
                    const detail = await api.getPotDetail(item.pot_id);
                    setSelectedPot(detail);
                    setMemberDrafts(createMemberDraftMap(detail.members));
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedPot?.pot_id === item.pot_id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {POT_MODE_LABELS[item.pot_mode] || item.pot_mode} | role {item.access_role}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatAmount(item.current_amount, item.currency_code)} / {formatAmount(item.target_amount, item.currency_code)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.progress_percent}%{item.days_remaining != null ? ` | ${item.days_remaining}j restants` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedPot ? (
            <p className="text-sm text-slate-500">Selectionne un espace.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedPot.title}</h2>
                  <p className="text-sm text-slate-500">{selectedPot.description || "Sans description"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {POT_MODE_LABELS[selectedPot.pot_mode] || selectedPot.pot_mode} | votre role: {selectedPot.access_role}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{selectedPot.status}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progression</span>
                  <span>{selectedPot.progress_percent}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-fuchsia-500" style={{ width: `${Math.min(selectedPot.progress_percent || 0, 100)}%` }} />
                </div>
                <p className="text-sm text-slate-600">
                  {formatAmount(selectedPot.current_amount, selectedPot.currency_code)} collectes sur {formatAmount(selectedPot.target_amount, selectedPot.currency_code)}
                </p>
                {selectedPot.days_remaining != null ? (
                  <p className="text-xs text-slate-500">
                    {selectedPot.deadline_passed
                      ? "Date limite depassee"
                      : `Date limite dans ${selectedPot.days_remaining} jour(s)`}
                  </p>
                ) : null}
                {selectedPot.recommended_daily_contribution != null ? (
                  <p className="text-xs text-slate-500">
                    Rythme conseille: {formatAmount(selectedPot.recommended_daily_contribution, selectedPot.currency_code)} / jour
                  </p>
                ) : null}
                {selectedPot.recommended_per_member_contribution != null ? (
                  <p className="text-xs text-slate-500">
                    Reste conseille par membre actif:{" "}
                    {formatAmount(selectedPot.recommended_per_member_contribution, selectedPot.currency_code)}
                  </p>
                ) : null}
                {selectedPot.share_token ? (
                  <p className="text-xs font-mono text-slate-500">Lien partage: /collect/{selectedPot.share_token}</p>
                ) : null}
              </div>

              {selectedPot.pot_mode === "group_savings" ? (
                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">Membres de l'epargne de groupe</h3>
                  </div>
                  <div className="space-y-4 p-4">
                    {canManageMembers ? (
                      <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr,auto]">
                        <input
                          aria-label="Identifiant membre cagnotte"
                          type="text"
                          placeholder="Email ou paytag"
                          value={memberForm.identifier}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, identifier: e.target.value }))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <input
                          aria-label="Objectif membre cagnotte"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Objectif individuel"
                          value={memberForm.target_amount}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, target_amount: e.target.value }))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          onClick={handleAddMember}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Ajouter
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Seul le proprietaire peut inviter de nouveaux membres.</p>
                    )}

                    {(selectedPot.members || []).length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun membre invite pour le moment.</p>
                    ) : (
                      <div className="space-y-3">
                        {(selectedPot.members || []).map((member) => {
                          const draft = memberDrafts[member.membership_id] || {
                            target_amount: member.target_amount ? String(member.target_amount) : "",
                            status: member.status || "active",
                          };
                          return (
                            <div key={member.membership_id} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{member.member_label || member.user_id}</p>
                                  <p className="text-xs text-slate-500">
                                    {member.role} | {MEMBER_STATUS_LABELS[member.status] || member.status}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Contribue: {formatAmount(member.contributed_amount, selectedPot.currency_code)}
                                    {member.target_amount
                                      ? ` | cible ${formatAmount(member.target_amount, selectedPot.currency_code)}`
                                      : ""}
                                  </p>
                                  {member.target_amount ? (
                                    <p className="mt-1 text-xs text-slate-500">
                                      Progression individuelle: {member.progress_percent}% | reste{" "}
                                      {formatAmount(member.remaining_amount, selectedPot.currency_code)}
                                    </p>
                                  ) : null}
                                </div>
                                {canManageMembers ? (
                                  <div className="grid gap-2 md:grid-cols-[0.9fr,0.9fr,auto]">
                                    <input
                                      aria-label={`Cible membre ${member.member_label || member.user_id}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Cible"
                                      value={draft.target_amount}
                                      onChange={(e) => handleMemberDraftChange(member.membership_id, "target_amount", e.target.value)}
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    />
                                    <select
                                      aria-label={`Statut membre ${member.member_label || member.user_id}`}
                                      value={draft.status}
                                      onChange={(e) => handleMemberDraftChange(member.membership_id, "status", e.target.value)}
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    >
                                      <option value="active">actif</option>
                                      <option value="paused">suspendu</option>
                                      <option value="removed">retire</option>
                                    </select>
                                    <button
                                      onClick={() => handleMemberUpdate(member)}
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Sauver
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <input
                  aria-label="Montant contribution cagnotte"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={!canContribute}
                />
                <button
                  onClick={handleContribute}
                  disabled={!canContribute}
                  className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50"
                >
                  Contribuer
                </button>
                {!canContribute && selectedPot?.contribution_block_reason ? (
                  <p className="self-center text-xs text-amber-700">{selectedPot.contribution_block_reason}</p>
                ) : null}
                {canLeave ? (
                  <button
                    onClick={handleLeave}
                    className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Quitter le groupe
                  </button>
                ) : null}
                {canClose && selectedPot.status !== "closed" ? (
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cloturer
                  </button>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Contributions</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {(selectedPot.contributions || []).length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-500">Aucune contribution pour le moment.</p>
                  ) : (
                    selectedPot.contributions.map((item) => (
                      <div key={item.contribution_id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.note || "Contribution wallet"}</p>
                          <p className="text-xs text-slate-500">
                            {item.contributor_label || item.user_id} | {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-fuchsia-700">+ {formatAmount(item.amount, item.currency_code)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
