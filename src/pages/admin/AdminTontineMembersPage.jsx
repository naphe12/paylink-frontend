import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminTontineMembersPage() {
  const [tontineId, setTontineId] = useState("");
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [tontines, setTontines] = useState([]);
  const [tontineSearch, setTontineSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    loadTontines();
  }, []);

  const loadMembers = async () => {
    if (!tontineId) return;
    setLoadingMembers(true);
    setMessage("");
    setError("");
    try {
      const data = await api.getAdminTontineMembers(tontineId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des membres");
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadTontines = async (q = "") => {
    try {
      const data = await api.listAdminTontines(q ? { q } : {});
      setTontines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les tontines");
    }
  };

  const toggleSelect = (userId) => {
    setSelectedToAdd((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addMembers = async () => {
    if (!tontineId || selectedToAdd.length === 0) return;
    setError("");
    setMessage("");
    setLoadingMembers(true);
    try {
      const data = await api.addAdminTontineMembers(tontineId, selectedToAdd);
      setMembers(Array.isArray(data) ? data : []);
      setSelectedToAdd([]);
      setMessage("Membres ajoutés");
    } catch (err) {
      console.error(err);
      setError(err.message || "Ajout impossible");
    } finally {
      setLoadingMembers(false);
    }
  };

  const removeMember = async (userId) => {
    if (!tontineId) return;
    setError("");
    setMessage("");
    try {
      const data = await api.removeAdminTontineMember(tontineId, userId);
      setMembers(Array.isArray(data) ? data : []);
      setMessage("Membre supprimé");
    } catch (err) {
      console.error(err);
      setError(err.message || "Suppression impossible");
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
          <h1 className="text-2xl font-bold text-slate-900">Membres de tontine</h1>
          <p className="text-sm text-slate-500">
            Ajoutez ou supprimez des membres d'une tontine existante.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow border space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Tontine</label>
                <select
                  value={tontineId}
                  onChange={(e) => setTontineId(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Choisir une tontine</option>
                  {tontines.map((t) => (
                    <option key={t.tontine_id} value={t.tontine_id}>
                      {t.name} ({t.tontine_id.slice(0, 6)}…)
                    </option>
                  ))}
                </select>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); loadTontines(tontineSearch); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tontineSearch}
                  onChange={(e) => setTontineSearch(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  placeholder="Filtrer les tontines"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm"
                >
                  Filtrer
                </button>
              </form>
            </div>
            <p className="text-xs text-slate-500">ID sélectionné : {tontineId || "-"}</p>
          </div>
          <button
            onClick={loadMembers}
            disabled={!tontineId || loadingMembers}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {loadingMembers ? "Chargement..." : "Charger les membres"}
          </button>
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Membres actuels ({members.length})
            </h3>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Ordre</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        Aucun membre
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.user_id} className="border-t">
                        <td className="p-3">{m.user_name || "Sans nom"}</td>
                        <td className="p-3 text-slate-600">{m.email}</td>
                        <td className="p-3">{m.join_order}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => removeMember(m.user_id)}
                            className="text-red-600 text-xs font-semibold"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Ajouter des membres ({selectedToAdd.length})
                </p>
                <p className="text-xs text-slate-500">Sélectionnez et ajoutez</p>
              </div>
              <button
                onClick={addMembers}
                disabled={!tontineId || selectedToAdd.length === 0 || loadingMembers}
                className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                placeholder="Filtrer nom/email"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm"
                disabled={loadingUsers}
              >
                {loadingUsers ? "..." : "Filtrer"}
              </button>
            </form>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {loadingUsers ? (
                <p className="p-3 text-sm text-slate-500">Chargement...</p>
              ) : users.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Aucun utilisateur</p>
              ) : (
                users.map((u) => {
                  const checked = selectedToAdd.includes(u.user_id);
                  return (
                    <label
                      key={u.user_id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(u.user_id)}
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
        </div>
      </div>
    </div>
  );
}
