import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCcw, Save, Search, SlidersHorizontal } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import useSessionStorageState from "@/hooks/useSessionStorageState";
import api from "@/services/api";
import { buildUserOptionLabel } from "@/utils/userRecentActivity";

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
}

export default function AdminUserLimitsPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useSessionStorageState("admin-user-limits:selected-user-id", "");
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectSearch, setSelectSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    daily_limit: "",
    monthly_limit: "",
  });

  const selectedUser = useMemo(
    () => users.find((user) => String(user.user_id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );
  const filteredUsers = useMemo(() => {
    const normalizedQuery = selectSearch.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) => {
      const haystack = `${user.full_name || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [users, selectSearch]);

  const loadUsers = async (search = query) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getUsers({ q: search.trim() || undefined, role: "client", status: "active" });
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
      setSelectedUserId((prev) => {
        const nextId = list.some((user) => String(user.user_id) === String(prev))
          ? String(prev)
          : list[0]
            ? String(list[0].user_id)
            : "";
        return nextId;
      });
    } catch (err) {
      setUsers([]);
      setSelectedUserId("");
      setError(err?.message || "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetail = async (userId) => {
    if (!userId) {
      setSelectedUserDetail(null);
      setForm({ daily_limit: "", monthly_limit: "" });
      return;
    }
    setError("");
    try {
      const detail = await api.getUser(userId);
      if (String(detail.role || "").toLowerCase() !== "client") {
        setSelectedUserDetail(null);
        setError("Seuls les utilisateurs de type client peuvent etre modifies ici.");
        return;
      }
      setSelectedUserDetail(detail);
      setForm({
        daily_limit: String(detail.daily_limit ?? ""),
        monthly_limit: String(detail.monthly_limit ?? ""),
      });
    } catch (err) {
      setError(err?.message || "Impossible de charger le detail du client.");
    }
  };

  useEffect(() => {
    loadUsers("");
  }, []);

  useEffect(() => {
    loadUserDetail(selectedUserId);
  }, [selectedUserId]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadUsers(query);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedUserId) {
      setError("Selectionnez un client.");
      return;
    }
    const daily = Number(form.daily_limit);
    const monthly = Number(form.monthly_limit);
    if (!Number.isFinite(daily) || daily <= 0 || !Number.isFinite(monthly) || monthly <= 0) {
      setError("Les limites doivent etre des montants strictement positifs.");
      return;
    }
    try {
      setSaving(true);
      await api.updateAdminUserLimits(selectedUserId, {
        daily_limit: daily,
        monthly_limit: monthly,
      });
      setSuccess("Limites mises a jour.");
      await loadUserDetail(selectedUserId);
    } catch (err) {
      setError(err?.message || "Mise a jour impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            <SlidersHorizontal size={14} />
            Limites clients
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Adapter les limites utilisateurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cette vue cible uniquement les comptes de role <span className="font-semibold">client</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers(query)}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RefreshCcw size={16} />
          Rafraichir
        </button>
      </header>

      <ApiErrorAlert message={error} />
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_280px]">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recherche client</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nom, email ou telephone"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Rechercher
              </button>
            </form>

            <div className="space-y-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Selectionner un client</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  disabled={loading || filteredUsers.length === 0}
                >
                  <option value="">-- selectionner un client --</option>
                  {filteredUsers.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {buildUserOptionLabel(user)} - {user.email || user.phone || "-"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtrer le select</span>
                <input
                  value={selectSearch}
                  onChange={(event) => setSelectSearch(event.target.value)}
                  placeholder="Filtrer par nom, email ou telephone"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
              {loading
                ? "Chargement des clients..."
                : users.length === 0
                  ? "Aucun client trouve."
                  : `${filteredUsers.length} client(s) affiches sur ${users.length}.`}
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedUser ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Client selectionne</p>
                  <h2 className="mt-1 text-xl font-semibold">{selectedUser.full_name || "Sans nom"}</h2>
                  <p className="mt-1 text-sm text-slate-300">{selectedUser.email || selectedUser.phone || "-"}</p>
                </div>
                <Link
                  to={`/dashboard/admin/users/${selectedUser.user_id}`}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Voir le profil
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Utilise aujourd'hui</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(selectedUserDetail?.used_daily)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Utilise ce mois</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(selectedUserDetail?.used_monthly)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">KYC</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedUserDetail?.kyc_status || selectedUser.kyc_status || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Risque</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(selectedUserDetail?.risk_score ?? selectedUser.risk_score)}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Limite journaliere</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.daily_limit}
                    onChange={(event) => setForm((prev) => ({ ...prev, daily_limit: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Limite mensuelle</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.monthly_limit}
                    onChange={(event) => setForm((prev) => ({ ...prev, monthly_limit: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span>La limite journaliere doit rester coherente avec la limite mensuelle et le niveau KYC du client.</span>
                <span>Cette page ne modifie pas les compteurs `used_daily` et `used_monthly`.</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Enregistrement..." : "Mettre a jour les limites"}
                </button>
                <button
                  type="button"
                  onClick={() => loadUserDetail(selectedUserId)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCcw size={16} />
                  Recharger les valeurs
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
              Selectionnez un client pour modifier ses limites.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
