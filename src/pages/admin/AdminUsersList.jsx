import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectSearch, setSelectSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [repairingUserId, setRepairingUserId] = useState("");
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_e164: "",
    country_code: "",
  });

  const load = async () => {
    const params = new URLSearchParams();
    params.set("role", "client");
    if (statusFilter) params.set("status", statusFilter);
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await api.get(`/admin/users${query}`);
    setUsers(data);
    setSelectedUserId((prev) => {
      if (!data.length) return "";
      const exists = data.some((u) => String(u.user_id) === prev);
      return exists ? prev : String(data[0].user_id);
    });
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filteredUsers = useMemo(() => {
    if (!selectedUserId) return users;
    return users.filter((u) => String(u.user_id) === selectedUserId);
  }, [users, selectedUserId]);

  const filteredSelectUsers = useMemo(() => {
    const query = selectSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const fullName = String(u.full_name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [users, selectSearch]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Supprimer definitivement cet utilisateur ?")) return;
    setDeleting(true);
    try {
      await api.deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      if (selectedUserId === String(userId)) setSelectedUserId("");
    } catch (err) {
      alert(err?.message || "Suppression impossible");
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unfreeze`, {});
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status: "active" } : u))
      );
    } catch (err) {
      alert(err?.message || "Reactivation impossible");
    }
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.createAdminClient({
        ...createForm,
        phone_e164: createForm.phone_e164 || undefined,
        country_code: (createForm.country_code || "").trim().toUpperCase() || undefined,
      });
      setCreateForm({
        full_name: "",
        email: "",
        password: "",
        phone_e164: "",
        country_code: "",
      });
      await load();
      setSelectedUserId(String(created.user_id));
    } catch (err) {
      alert(err?.message || "Creation client impossible");
    } finally {
      setCreating(false);
    }
  };

  const handleRepairAccounts = async (userId) => {
    setRepairingUserId(String(userId));
    try {
      await api.repairAdminUserFinancialAccounts(userId);
      alert("Provisioning financier repare");
    } catch (err) {
      alert(err?.message || "Repair impossible");
    } finally {
      setRepairingUserId("");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Utilisateurs</h1>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Creer un client</h2>
        <form onSubmit={handleCreateClient} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="border p-2 rounded"
            placeholder="Nom complet"
            value={createForm.full_name}
            onChange={(e) => handleCreateChange("full_name", e.target.value)}
            required
          />
          <input
            type="email"
            className="border p-2 rounded"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => handleCreateChange("email", e.target.value)}
            required
          />
          <input
            className="border p-2 rounded"
            placeholder="Telephone (+257...)"
            value={createForm.phone_e164}
            onChange={(e) => handleCreateChange("phone_e164", e.target.value)}
          />
          <input
            className="border p-2 rounded uppercase"
            placeholder="Pays (BI, FR...)"
            value={createForm.country_code}
            onChange={(e) => handleCreateChange("country_code", e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Mot de passe initial"
            value={createForm.password}
            onChange={(e) => handleCreateChange("password", e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 md:col-span-2 xl:col-span-5"
          >
            {creating ? "Creation..." : "Creer le client"}
          </button>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="user-select" className="text-sm font-medium text-gray-700">
          Selectionner un utilisateur
        </label>
        <select
          id="user-select"
          className="border p-2 rounded flex-1 min-w-[240px]"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          {filteredSelectUsers.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.full_name || user.email || user.user_id}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Filtrer le select"
          value={selectSearch}
          onChange={(e) => setSelectSearch(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
          <option value="deleted">Supprimes</option>
          <option value="">Tous</option>
        </select>
      </div>

      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Nom</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">KYC</th>
            <th className="p-2 text-left">Risque</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((u) => (
            <tr key={u.user_id} className="border-b">
              <td className="p-2">{u.full_name}</td>
              <td className="p-2">{u.email || "-"}</td>
              <td className="p-2 capitalize">{u.status || "-"}</td>
              <td className="p-2">{u.kyc_status}</td>
              <td className="p-2">{u.risk_score}</td>
              <td className="p-2">
                <div className="flex flex-col gap-1 text-blue-600">
                  <Link to={`/admin/users/${u.user_id}`} className="hover:underline">
                    Profil
                  </Link>
                  <Link
                    to={`/dashboard/admin/users/limits`}
                    className="hover:underline"
                  >
                    Limites
                  </Link>
                  <Link
                    to={`/dashboard/admin/users/${u.user_id}/balance-events`}
                    className="hover:underline"
                  >
                    Historique solde
                  </Link>
                  <Link
                    to={`/dashboard/admin/cash-requests?user_id=${u.user_id}`}
                    className="hover:underline"
                  >
                    Cash in/out
                  </Link>
                  <Link
                    to={`/dashboard/admin/transfers?user_id=${u.user_id}`}
                    className="hover:underline"
                  >
                    Transferts
                  </Link>
                  <Link
                    to={`/dashboard/admin/credit-lines?user_id=${u.user_id}`}
                    className="hover:underline"
                  >
                    Ligne de credit
                  </Link>
                  <Link
                    to={`/dashboard/admin/credit-history?user_id=${u.user_id}`}
                    className="hover:underline"
                  >
                    Historique credit
                  </Link>
                  <Link
                    to={`/dashboard/admin/financial-summary?user_id=${u.user_id}`}
                    className="hover:underline"
                  >
                    Situation financiere
                  </Link>
                  <button
                    onClick={() => handleRepairAccounts(u.user_id)}
                    disabled={repairingUserId === String(u.user_id)}
                    className="text-amber-700 hover:underline text-left"
                  >
                    {repairingUserId === String(u.user_id) ? "Repair..." : "Repair comptes"}
                  </button>
                  {u.status === "active" && (
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      disabled={deleting}
                      className="text-red-600 hover:underline text-left"
                    >
                      {deleting ? "Suppression..." : "Supprimer"}
                    </button>
                  )}
                  {u.status === "suspended" && (
                    <button
                      onClick={() => handleReactivate(u.user_id)}
                      className="text-green-600 hover:underline text-left"
                    >
                      Reactiver
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
