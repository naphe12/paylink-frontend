import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const TYPES = [
  { value: "rotative", label: "Rotative" },
  { value: "epargne", label: "Épargne" },
];

export default function AdminTontineCreatePage() {
  const [form, setForm] = useState({
    owner_user: "",
    name: "",
    currency_code: "EUR",
    periodicity_days: 30,
    amount_per_member: "",
    tontine_type: "rotative",
    member_ids: [],
  });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedCount = form.member_ids.length;
  const canSubmit = useMemo(
    () =>
      form.owner_user &&
      form.name.trim().length > 0 &&
      form.currency_code.trim().length === 3 &&
      Number(form.amount_per_member) > 0,
    [form]
  );

  const loadUsers = async (query = "") => {
    setLoadingUsers(true);
    try {
      const data = await api.getUsers(query);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les utilisateurs");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMember = (userId) => {
    setForm((prev) => {
      const exists = prev.member_ids.includes(userId);
      const member_ids = exists
        ? prev.member_ids.filter((id) => id !== userId)
        : [...prev.member_ids, userId];
      return { ...prev, member_ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        currency_code: form.currency_code.toUpperCase(),
        periodicity_days: Number(form.periodicity_days),
        amount_per_member: Number(form.amount_per_member),
      };
      await api.createAdminTontine(payload);
      setSuccess("Tontine créée avec succès");
      setForm({
        owner_user: "",
        name: "",
        currency_code: "EUR",
        periodicity_days: 30,
        amount_per_member: "",
        tontine_type: "rotative",
        member_ids: [],
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Échec de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    loadUsers(search);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Créer une tontine</h1>
          <p className="text-sm text-slate-500">
            Sélectionnez le type, le créateur et les membres à inviter.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl shadow border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Tontine Décembre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Type</label>
              <select
                name="tontine_type"
                value={form.tontine_type}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Devise</label>
              <input
                type="text"
                name="currency_code"
                maxLength={3}
                value={form.currency_code}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2 uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Périodicité (jours)</label>
              <input
                type="number"
                name="periodicity_days"
                min={1}
                value={form.periodicity_days}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Montant par membre</label>
              <input
                type="number"
                name="amount_per_member"
                min="0"
                step="0.01"
                value={form.amount_per_member}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Owner (utilisateur créateur)</label>
            <select
              name="owner_user"
              value={form.owner_user}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
            >
              <option value="">Choisir un utilisateur</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || u.email || u.user_id}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer la tontine"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </div>

        <div className="space-y-4 bg-white p-6 rounded-2xl shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Membres ({selectedCount})</p>
              <p className="text-xs text-slate-500">Cochez pour ajouter à la tontine</p>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Recherche nom/email"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm"
                disabled={loadingUsers}
              >
                {loadingUsers ? "..." : "Filtrer"}
              </button>
            </form>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loadingUsers ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun utilisateur</p>
            ) : (
              users.map((u) => {
                const checked = form.member_ids.includes(u.user_id);
                return (
                  <label
                    key={u.user_id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-50 px-2 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(u.user_id)}
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800">
                        {u.full_name || "Sans nom"}
                      </span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
