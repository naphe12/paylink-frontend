// src/pages/admin/AdminUsersList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const load = async () => {
    const data = await api.get(`/admin/users?q=${q}`);
    setUsers(data);
    setSelectedUserId((prev) => {
      if (!data.length) return "";
      const exists = data.some((u) => String(u.user_id) === prev);
      return exists ? prev : String(data[0].user_id);
    });
  };

  useEffect(() => {
    load();
  }, [q]);

  const filteredUsers = useMemo(() => {
    if (!selectedUserId) return users;
    return users.filter((u) => String(u.user_id) === selectedUserId);
  }, [users, selectedUserId]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Utilisateurs</h1>

      <input
        className="border p-2 rounded w-full mb-4"
        placeholder="Recherche nom / email / telephone..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="user-select" className="text-sm font-medium text-gray-700">
          Selectionner un utilisateur
        </label>
        <select
          id="user-select"
          className="border p-2 rounded flex-1"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.full_name || user.email || user.user_id}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Nom</th>
            <th className="p-2 text-left">Email</th>
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
              <td className="p-2">{u.kyc_status}</td>
              <td className="p-2">{u.risk_score}</td>
              <td className="p-2">
                <div className="flex flex-col gap-1 text-blue-600">
                  <Link to={`/admin/users/${u.user_id}`} className="hover:underline">
                    Profil
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
