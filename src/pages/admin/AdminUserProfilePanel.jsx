// src/pages/admin/AdminUserProfilePanel.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function AdminUserProfilePanel() {
  const { user_id } = useParams();
  const [user, setUser] = useState(null);

  const loadUser = async () => {
    const data = await api.get(`/admin/users/${user_id}`);
    setUser(data);
  };

  useEffect(() => {
    loadUser();
  }, [user_id]);

  if (!user) return <p className="p-6">Chargement...</p>;

  const toggleFreeze = async () => {
    await api.post(
      `/admin/users/${user.user_id}/${
        user.status === "frozen" ? "unfreeze" : "freeze"
      }`
    );
    loadUser();
  };

  const toggleExternal = async () => {
    await api.post(
      `/admin/users/${user.user_id}/${
        user.external_transfers_blocked ? "unblock-external" : "block-external"
      }`
    );
    loadUser();
  };

  const requestKycUpgrade = async () => {
    await api.post(`/admin/users/${user.user_id}/request-kyc-upgrade`);
    alert("📨 Demande de mise à niveau KYC envoyée !");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">👤 {user.full_name}</h1>

      <p className="text-gray-600 mb-4">{user.email}</p>

      <div className="space-y-3">
        <button
          onClick={toggleFreeze}
          className={`w-full py-2 rounded-lg text-white ${
            user.status === "frozen" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {user.status === "frozen"
            ? "🔓 Débloquer le compte"
            : "🛑 Geler le compte"}
        </button>

        <button
          onClick={toggleExternal}
          className={`w-full py-2 rounded-lg text-white ${
            user.external_transfers_blocked ? "bg-green-600" : "bg-orange-600"
          }`}
        >
          {user.external_transfers_blocked
            ? "✅ Autoriser transferts externes"
            : "🚫 Bloquer transferts externes"}
        </button>

        <button
          onClick={requestKycUpgrade}
          className="w-full py-2 rounded-lg bg-blue-600 text-white"
        >
          📄 Demander mise à niveau KYC
        </button>
      </div>
    </div>
  );
}
