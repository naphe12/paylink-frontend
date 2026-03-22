import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

export default function CashOutPage() {
  const navigate = useNavigate();
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const idemKeyRef = useRef(null);
  const selectedUser = users.find((u) => u.user_id === selectedUserId) || null;
  const selectedCurrency = selectedUser?.currency_code || "EUR";

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.searchAgentCashUsers(userQuery, 200);
        setUsers(Array.isArray(data) ? data : []);
        setSelectedUserId((prev) =>
          Array.isArray(data) && data.some((u) => u.user_id === prev) ? prev : ""
        );
      } catch {
        setUsers([]);
        setSelectedUserId("");
      }
    };
    loadUsers();
  }, [userQuery]);

  const handleCashOut = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedUserId || !amount || Number(amount) <= 0) {
      setErrorMessage("Selectionnez un client et entrez un montant valide.");
      return;
    }

    try {
      setLoading(true);
      if (!idemKeyRef.current) {
        idemKeyRef.current = api.newIdempotencyKey("agent-cash-out");
      }
      await api.postWithHeaders(
        "/agent/cash-out",
        {
          client_user_id: selectedUserId,
          amount: Number(amount),
        },
        { "Idempotency-Key": idemKeyRef.current }
      );

      idemKeyRef.current = null;
      setSuccessMessage("Cash-out effectue avec succes.");
      setAmount("");
      setSelectedUserId("");
      setTimeout(() => navigate("/dashboard/agent"), 1500);
    } catch (err) {
      setErrorMessage(err?.message || "Echec cash-out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Cash-Out Client</h1>

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
        <option value="">-- selectionner un client --</option>
        {users.map((u) => (
          <option key={u.user_id} value={u.user_id}>
            {u.full_name || "Sans nom"}
          </option>
        ))}
      </select>

      {selectedUser ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Devise du client: <span className="font-semibold">{selectedCurrency}</span>
        </div>
      ) : null}

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        placeholder={`Montant a retirer (${selectedCurrency})`}
      />

      <button
        onClick={handleCashOut}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-3 rounded w-full"
      >
        {loading ? "Traitement..." : "Confirmer le Cash-Out"}
      </button>

      <ApiErrorAlert message={errorMessage} className="mt-4" />
      {successMessage && <p className="mt-4 text-center text-green-700">{successMessage}</p>}
    </div>
  );
}
