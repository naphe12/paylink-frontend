import { useEffect, useState } from "react";
import api from "@/services/api";

export default function CashInPage() {
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.searchAgentCashUsers(userQuery, 30);
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      }
    };
    loadUsers();
  }, [userQuery]);

  const submit = async () => {
    if (!selectedUserId || !Number(amount)) {
      setMsg("Selectionnez un user et un montant valide.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await api.agentCashDeposit({
        user_id: selectedUserId,
        amount: Number(amount),
      });
      setMsg(`Depot cash effectue. Nouveau solde user: ${res.new_balance} ${res.currency}`);
      setAmount("");
    } catch (err) {
      setMsg(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-[#0b3b64]">Depot cash client</h2>

      <input
        type="text"
        className="input w-full"
        placeholder="Rechercher user (nom/email/telephone)"
        value={userQuery}
        onChange={(e) => setUserQuery(e.target.value)}
      />

      <select
        className="input w-full"
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
      >
        <option value="">-- selectionner un user --</option>
        {users.map((u) => (
          <option key={u.user_id} value={u.user_id}>
            {u.full_name || "Sans nom"} - {u.email || "-"} - {u.phone_e164 || "-"}
          </option>
        ))}
      </select>

      <input
        type="number"
        className="input w-full"
        placeholder="Montant"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        className="btn-primary w-full py-3 rounded-xl"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Traitement..." : "Valider"}
      </button>

      {msg ? <div className="p-3 bg-green-100 text-green-700 rounded-lg">{msg}</div> : null}
    </div>
  );
}
