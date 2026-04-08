import { useEffect, useState } from "react";
import api from "@/services/api";

const ROLES = ["admin", "cashier", "viewer"];
const ROLE_LABELS = {
  owner: "Proprietaire",
  admin: "Admin",
  cashier: "Caissier",
  viewer: "Lecture seule",
};

export default function BusinessAccountsPage() {
  const [items, setItems] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    legal_name: "",
    display_name: "",
    country_code: "",
  });
  const [memberForm, setMemberForm] = useState({
    identifier: "",
    role: "cashier",
  });
  const [subWalletForm, setSubWalletForm] = useState({
    label: "",
    spending_limit: "",
    assigned_user_id: "",
  });
  const [subWalletAmounts, setSubWalletAmounts] = useState({});
  const [memberDrafts, setMemberDrafts] = useState({});
  const [subWalletDrafts, setSubWalletDrafts] = useState({});
  const currentRole = selectedBusiness?.current_membership_role || null;
  const isBusinessActive = selectedBusiness ? selectedBusiness.is_active !== false : true;
  const canToggleBusinessStatus = currentRole === "owner";
  const canManageMembers = isBusinessActive && (currentRole === "owner" || currentRole === "admin");
  const canCreateSubWallet = isBusinessActive && (currentRole === "owner" || currentRole === "admin");
  const canManageSubWalletSettings = isBusinessActive && (currentRole === "owner" || currentRole === "admin");
  const canFundOrReleaseSubWallet = isBusinessActive && currentRole === "owner";
  const getRemainingCapacity = (subWallet) => {
    const current = Number(subWallet?.current_amount || 0);
    const limit = Number(subWallet?.spending_limit || 0);
    return Math.max(0, limit - current);
  };
  const canFundWithAmount = (subWallet) => {
    const amount = Number(subWalletAmounts[subWallet.sub_wallet_id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) return false;
    return amount <= getRemainingCapacity(subWallet);
  };

  const loadItems = async (targetBusinessId = null) => {
    try {
      setLoading(true);
      const data = await api.listBusinessAccounts();
      const rows = Array.isArray(data) ? data : [];
      setItems(rows);
      const target =
        rows.find((item) => item.business_id === targetBusinessId) ||
        rows.find((item) => item.business_id === selectedBusiness?.business_id) ||
        rows[0] ||
        null;
      setSelectedBusiness(target);
    } catch (err) {
      setError(err?.message || "Impossible de charger les comptes business.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    setMemberDrafts(
      Object.fromEntries(
        (selectedBusiness?.members || []).map((member) => [
          member.membership_id,
          { role: member.role, status: member.status },
        ])
      )
    );
    setSubWalletDrafts(
      Object.fromEntries(
        (selectedBusiness?.sub_wallets || []).map((subWallet) => [
          subWallet.sub_wallet_id,
          {
            label: subWallet.label || "",
            spending_limit: String(subWallet.spending_limit ?? 0),
            assigned_user_id: subWallet.assigned_user_id || "",
            status: subWallet.status || "active",
          },
        ])
      )
    );
  }, [selectedBusiness]);

  const handleCreate = async () => {
    if (!form.legal_name || !form.display_name) {
      setError("Renseigne la raison sociale et le nom d'affichage.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const created = await api.createBusinessAccount(form);
      setSuccess("Compte business cree.");
      setForm({ legal_name: "", display_name: "", country_code: "" });
      await loadItems(created.business_id);
    } catch (err) {
      setError(err?.message || "Creation impossible.");
    }
  };

  const handleAddMember = async () => {
    if (!selectedBusiness || !memberForm.identifier) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.addBusinessMember(selectedBusiness.business_id, memberForm);
      setSelectedBusiness(updated);
      setSuccess("Membre business ajoute.");
      setMemberForm({ identifier: "", role: "cashier" });
      await loadItems(selectedBusiness.business_id);
    } catch (err) {
      setError(err?.message || "Ajout membre impossible.");
    }
  };

  const handleCreateSubWallet = async () => {
    if (!selectedBusiness || !subWalletForm.label) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.createBusinessSubWallet(selectedBusiness.business_id, {
        label: subWalletForm.label,
        spending_limit: Number(subWalletForm.spending_limit || 0),
        assigned_user_id: subWalletForm.assigned_user_id || null,
      });
      setSelectedBusiness(updated);
      setSuccess("Sous-wallet business cree.");
      setSubWalletForm({ label: "", spending_limit: "", assigned_user_id: "" });
      await loadItems(selectedBusiness.business_id);
    } catch (err) {
      setError(err?.message || "Creation sous-wallet impossible.");
    }
  };

  const handleToggleBusinessStatus = async () => {
    if (!selectedBusiness || !canToggleBusinessStatus) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.updateBusinessAccountStatus(selectedBusiness.business_id, {
        is_active: !isBusinessActive,
      });
      setSelectedBusiness(updated);
      setSuccess(!isBusinessActive ? "Structure business reactivee." : "Structure business desactivee.");
      await loadItems(selectedBusiness.business_id);
    } catch (err) {
      setError(err?.message || "Mise a jour du statut business impossible.");
    }
  };

  const handleUpdateMember = async (membershipId) => {
    if (!selectedBusiness || !memberDrafts[membershipId]) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.updateBusinessMember(
        selectedBusiness.business_id,
        membershipId,
        memberDrafts[membershipId]
      );
      setSelectedBusiness(updated);
      setSuccess("Membre business mis a jour.");
      await loadItems(selectedBusiness.business_id);
    } catch (err) {
      setError(err?.message || "Mise a jour membre impossible.");
    }
  };

  const handleUpdateSubWallet = async (subWalletId) => {
    if (!selectedBusiness || !subWalletDrafts[subWalletId]) return;
    try {
      setError("");
      setSuccess("");
      const draft = subWalletDrafts[subWalletId];
      const updated = await api.updateBusinessSubWallet(subWalletId, {
        label: draft.label,
        spending_limit: Number(draft.spending_limit || 0),
        assigned_user_id: draft.assigned_user_id || null,
        status: draft.status,
      });
      setSelectedBusiness(updated);
      setSuccess("Sous-wallet business mis a jour.");
      await loadItems(selectedBusiness.business_id);
    } catch (err) {
      setError(err?.message || "Mise a jour sous-wallet impossible.");
    }
  };

  const handleFundSubWallet = async (subWalletId) => {
    const amount = Number(subWalletAmounts[subWalletId] || 0);
    if (!amount) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.fundBusinessSubWallet(subWalletId, { amount });
      setSelectedBusiness(updated);
      setSuccess("Sous-wallet alimente.");
      setSubWalletAmounts((prev) => ({ ...prev, [subWalletId]: "" }));
      await loadItems(selectedBusiness?.business_id || null);
    } catch (err) {
      setError(err?.message || "Financement sous-wallet impossible.");
    }
  };

  const handleReleaseSubWallet = async (subWalletId) => {
    const amount = Number(subWalletAmounts[subWalletId] || 0);
    if (!amount) return;
    try {
      setError("");
      setSuccess("");
      const updated = await api.releaseBusinessSubWallet(subWalletId, { amount });
      setSelectedBusiness(updated);
      setSuccess("Sous-wallet recupere.");
      setSubWalletAmounts((prev) => ({ ...prev, [subWalletId]: "" }));
      await loadItems(selectedBusiness?.business_id || null);
    } catch (err) {
      setError(err?.message || "Recuperation sous-wallet impossible.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Comptes business</h1>
          <p className="text-sm text-slate-500">
            Structure ton activite avec une equipe, des roles et un compte de gestion dedie.
          </p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <input
            aria-label="Raison sociale business"
            type="text"
            placeholder="Raison sociale"
            value={form.legal_name}
            onChange={(e) => setForm((prev) => ({ ...prev, legal_name: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Nom affichage business"
            type="text"
            placeholder="Nom d'affichage"
            value={form.display_name}
            onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            aria-label="Pays business"
            type="text"
            placeholder="Pays (code)"
            value={form.country_code}
            onChange={(e) => setForm((prev) => ({ ...prev, country_code: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Creer le compte business
        </button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mes structures</h2>
              <p className="text-sm text-slate-500">Selectionne une structure pour gerer les membres.</p>
            </div>
            <button
              onClick={() => loadItems(selectedBusiness?.business_id || null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Rafraichir
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucun compte business pour le moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <button
                  key={item.business_id}
                  onClick={() => setSelectedBusiness(item)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedBusiness?.business_id === item.business_id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.display_name}</p>
                  <p className="text-sm text-slate-500">{item.legal_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{(item.members || []).length} membre(s)</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedBusiness ? (
            <p className="text-sm text-slate-500">Selectionne un compte business.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedBusiness.display_name}</h2>
                <p className="text-sm text-slate-500">{selectedBusiness.legal_name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${isBusinessActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {isBusinessActive ? "structure active" : "structure inactive"}
                </span>
                <button
                  onClick={handleToggleBusinessStatus}
                  disabled={!canToggleBusinessStatus}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isBusinessActive ? "Desactiver la structure" : "Reactiver la structure"}
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Votre role</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {ROLE_LABELS[currentRole] || "Non defini"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {!isBusinessActive
                    ? "La structure est inactive. Les actions operationnelles sont bloquees."
                    : canFundOrReleaseSubWallet
                    ? "Vous pouvez gerer l'equipe et les sous-wallets."
                    : canCreateSubWallet
                      ? "Vous pouvez gerer l'equipe et creer des sous-wallets."
                      : "Acces en lecture sur la structure."}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.3fr,0.9fr,auto]">
                <input
                  aria-label="Identifiant membre business"
                  type="text"
                  placeholder="Email ou paytag du membre"
                  value={memberForm.identifier}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, identifier: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={!canManageMembers}
                />
                <select
                  aria-label="Role membre business"
                  value={memberForm.role}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={!canManageMembers}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!canManageMembers}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Ajouter
                </button>
              </div>
              {!canManageMembers ? (
                <p className="text-xs text-slate-500">Seuls les roles proprietaire et admin peuvent gerer les membres.</p>
              ) : null}

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Membres et permissions</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {(selectedBusiness.members || []).map((member) => (
                    <div key={member.membership_id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.member_label || member.user_id}</p>
                        <p className="text-xs text-slate-500">{member.status}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {member.role === "owner" ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{member.role}</span>
                        ) : (
                          <>
                            <select
                              aria-label={`Role edition membre ${member.member_label || member.user_id}`}
                              value={memberDrafts[member.membership_id]?.role || member.role}
                              onChange={(e) =>
                                setMemberDrafts((prev) => ({
                                  ...prev,
                                  [member.membership_id]: {
                                    ...(prev[member.membership_id] || {}),
                                    role: e.target.value,
                                  },
                                }))
                              }
                              disabled={
                                !canManageMembers ||
                                (currentRole === "admin" && member.role === "admin")
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label={`Statut edition membre ${member.member_label || member.user_id}`}
                              value={memberDrafts[member.membership_id]?.status || member.status}
                              onChange={(e) =>
                                setMemberDrafts((prev) => ({
                                  ...prev,
                                  [member.membership_id]: {
                                    ...(prev[member.membership_id] || {}),
                                    status: e.target.value,
                                  },
                                }))
                              }
                              disabled={
                                !canManageMembers ||
                                (currentRole === "admin" && member.role === "admin")
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                            </select>
                            <button
                              onClick={() => handleUpdateMember(member.membership_id)}
                              disabled={
                                !canManageMembers ||
                                (currentRole === "admin" && member.role === "admin")
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Mettre a jour
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Sous-wallets business</h3>
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid gap-3 md:grid-cols-[1.1fr,0.8fr,1fr,auto]">
                    <input
                      aria-label="Label sous wallet business"
                      type="text"
                      placeholder="Nom du sous-wallet"
                      value={subWalletForm.label}
                      onChange={(e) => setSubWalletForm((prev) => ({ ...prev, label: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canCreateSubWallet}
                    />
                    <input
                      aria-label="Limite sous wallet business"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Plafond"
                      value={subWalletForm.spending_limit}
                      onChange={(e) => setSubWalletForm((prev) => ({ ...prev, spending_limit: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canCreateSubWallet}
                    />
                    <select
                      aria-label="Membre assigne sous wallet business"
                      value={subWalletForm.assigned_user_id}
                      onChange={(e) => setSubWalletForm((prev) => ({ ...prev, assigned_user_id: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canCreateSubWallet}
                    >
                      <option value="">Aucun membre assigne</option>
                      {(selectedBusiness.members || []).map((member) => (
                        <option key={member.membership_id} value={member.user_id}>
                          {member.member_label || member.user_id}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateSubWallet}
                      disabled={!canCreateSubWallet}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Creer
                    </button>
                  </div>
                  {!canCreateSubWallet ? (
                    <p className="text-xs text-slate-500">Seuls les roles proprietaire et admin peuvent creer des sous-wallets.</p>
                  ) : null}

                  {(selectedBusiness.sub_wallets || []).length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun sous-wallet pour cette structure.</p>
                  ) : (
                    <div className="space-y-3">
                      {(selectedBusiness.sub_wallets || []).map((subWallet) => (
                        <div key={subWallet.sub_wallet_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{subWallet.label}</p>
                              <p className="text-xs text-slate-500">
                                {Number(subWallet.current_amount || 0).toLocaleString()} {subWallet.currency_code} disponibles
                              </p>
                              <p className="text-xs text-slate-500">
                                Limite: {Number(subWallet.spending_limit || 0).toLocaleString()} {subWallet.currency_code}
                                {subWallet.assigned_label ? ` | Assigne a ${subWallet.assigned_label}` : ""}
                              </p>
                              <p className="text-xs text-slate-500">
                                Capacite restante: {getRemainingCapacity(subWallet).toLocaleString()} {subWallet.currency_code}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{subWallet.status}</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-4">
                            <input
                              aria-label={`Label edition sous wallet ${subWallet.label}`}
                              type="text"
                              value={subWalletDrafts[subWallet.sub_wallet_id]?.label || subWallet.label}
                              onChange={(e) =>
                                setSubWalletDrafts((prev) => ({
                                  ...prev,
                                  [subWallet.sub_wallet_id]: {
                                    ...(prev[subWallet.sub_wallet_id] || {}),
                                    label: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              disabled={!canManageSubWalletSettings}
                            />
                            <input
                              aria-label={`Limite edition sous wallet ${subWallet.label}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={subWalletDrafts[subWallet.sub_wallet_id]?.spending_limit || "0"}
                              onChange={(e) =>
                                setSubWalletDrafts((prev) => ({
                                  ...prev,
                                  [subWallet.sub_wallet_id]: {
                                    ...(prev[subWallet.sub_wallet_id] || {}),
                                    spending_limit: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              disabled={!canManageSubWalletSettings}
                            />
                            <select
                              aria-label={`Assignation edition sous wallet ${subWallet.label}`}
                              value={subWalletDrafts[subWallet.sub_wallet_id]?.assigned_user_id || ""}
                              onChange={(e) =>
                                setSubWalletDrafts((prev) => ({
                                  ...prev,
                                  [subWallet.sub_wallet_id]: {
                                    ...(prev[subWallet.sub_wallet_id] || {}),
                                    assigned_user_id: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              disabled={!canManageSubWalletSettings}
                            >
                              <option value="">Aucun membre assigne</option>
                              {(selectedBusiness.members || [])
                                .filter((member) => member.status === "active")
                                .map((member) => (
                                  <option key={member.membership_id} value={member.user_id}>
                                    {member.member_label || member.user_id}
                                  </option>
                                ))}
                            </select>
                            <select
                              aria-label={`Statut edition sous wallet ${subWallet.label}`}
                              value={subWalletDrafts[subWallet.sub_wallet_id]?.status || subWallet.status}
                              onChange={(e) =>
                                setSubWalletDrafts((prev) => ({
                                  ...prev,
                                  [subWallet.sub_wallet_id]: {
                                    ...(prev[subWallet.sub_wallet_id] || {}),
                                    status: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              disabled={!canManageSubWalletSettings}
                            >
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleUpdateSubWallet(subWallet.sub_wallet_id)}
                              disabled={!canManageSubWalletSettings}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Enregistrer les reglages
                            </button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr,auto,auto]">
                            <input
                              aria-label={`Montant action sous wallet ${subWallet.label}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Montant"
                              value={subWalletAmounts[subWallet.sub_wallet_id] || ""}
                              onChange={(e) =>
                                setSubWalletAmounts((prev) => ({
                                  ...prev,
                                  [subWallet.sub_wallet_id]: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              disabled={!canFundOrReleaseSubWallet}
                            />
                            <button
                              onClick={() => handleFundSubWallet(subWallet.sub_wallet_id)}
                              disabled={!canFundOrReleaseSubWallet || subWallet.status !== "active" || !canFundWithAmount(subWallet)}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Alimenter
                            </button>
                            <button
                              onClick={() => handleReleaseSubWallet(subWallet.sub_wallet_id)}
                              disabled={!canFundOrReleaseSubWallet || subWallet.status !== "active" || !Number(subWalletAmounts[subWallet.sub_wallet_id] || 0)}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Recuperer
                            </button>
                          </div>
                          {Number(subWalletAmounts[subWallet.sub_wallet_id] || 0) > getRemainingCapacity(subWallet) ? (
                            <p className="text-xs text-amber-700">
                              Le montant depasse le plafond restant du sous-wallet.
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {!canFundOrReleaseSubWallet ? (
                    <p className="text-xs text-slate-500">Seul le proprietaire peut financer ou recuperer un sous-wallet.</p>
                  ) : null}
                  {!canManageSubWalletSettings ? (
                    <p className="text-xs text-slate-500">Seuls les roles proprietaire et admin peuvent modifier les reglages d'un sous-wallet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
