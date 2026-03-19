// src/pages/admin/AdminUsersList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CreditCard, LineChart, Scale, Send, ShieldCheck, Shield, Wallet } from "lucide-react";
import api from "@/services/api";
import QuickActions from "@/components/QuickActions";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
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

  const handleDelete = async (userId) => {
    if (!window.confirm("Supprimer définitivement cet utilisateur ?")) return;
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
      alert(err?.message || "Réactivation impossible");
    }
  };

  return (
    <div className="p-6">
      <QuickActions
        title="Actions rapides"
        subtitle="Raccourcis vers les operations admin les plus frequentes."
        actions={[
          {
            label: "Validation cash",
            description: "Depots et retraits a traiter",
            to: "/dashboard/admin/cash-requests",
            icon: Wallet,
            className: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100/60",
          },
          {
            label: "Transferts",
            description: "Vue generale des flux externes",
            to: "/dashboard/admin/transfers",
            icon: Send,
            className: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60",
          },
          {
            label: "Approvals",
            description: "Transferts en attente de validation",
            to: "/dashboard/admin/transfer-approvals",
            icon: ShieldCheck,
            className: "border-amber-200 bg-amber-50 hover:bg-amber-100/60",
          },
          {
            label: "Lignes de credit",
            description: "Ajuster les capacites client",
            to: "/dashboard/admin/credit-lines",
            icon: CreditCard,
            className: "border-orange-200 bg-orange-50 hover:bg-orange-100/60",
          },
          {
            label: "Escrow",
            description: "Suivi des dossiers escrow",
            to: "/dashboard/admin/escrow",
            icon: Shield,
            className: "border-violet-200 bg-violet-50 hover:bg-violet-100/60",
          },
          {
            label: "P2P trades",
            description: "Supervision des trades P2P",
            to: "/dashboard/admin/p2p/trades",
            icon: Send,
            className: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100/60",
          },
          {
            label: "P2P disputes",
            description: "Gestion des litiges P2P",
            to: "/dashboard/admin/p2p/disputes",
            icon: Scale,
            className: "border-red-200 bg-red-50 hover:bg-red-100/60",
          },
          {
            label: "Balance events",
            description: "Historique des balances",
            to: "/dashboard/admin/balance-events",
            icon: LineChart,
            className: "border-blue-200 bg-blue-50 hover:bg-blue-100/60",
          },
          {
            label: "Notifications",
            description: "Centre d'alertes admin",
            to: "/dashboard/admin/notifications",
            icon: Bell,
            className: "border-slate-200 bg-slate-50 hover:bg-white",
          },
        ]}
      />

      <h1 className="text-xl font-bold mb-4">Utilisateurs</h1>

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
        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
          <option value="deleted">Supprimés</option>
          <option value="">Tous</option>
        </select>
      </div>

      <table className="w-full border text-sm">
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
                    Situation financière
                  </Link>
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
                      Réactiver
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
