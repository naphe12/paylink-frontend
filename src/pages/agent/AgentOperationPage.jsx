import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/services/api";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Smartphone,
} from "lucide-react";

export default function AgentOperationPage() {
  const navigate = useNavigate();
  const { state } = useLocation(); // { client_phone }
  const [client, setClient] = useState(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash-in");
  const [commission, setCommission] = useState(0);
  const [loading, setLoading] = useState(false);

  const clientPhone = state?.client_phone;

  useEffect(() => {
    if (!clientPhone) {
      navigate("/dashboard/agent");
      return;
    }
    loadClient(clientPhone);
  }, [clientPhone, navigate]);

  const loadClient = async (phone) => {
    if (!phone) return;
    const data = await api.get(`/agent/client/${phone}`);
    setClient(data);
  };

  useEffect(() => {
    if (!amount) return setCommission(0);
    let a = Number(amount);

    if (mode === "cash-in") setCommission(Math.max(200, a * 0.005));
    if (mode === "cash-out") setCommission(Math.max(300, a * 0.007));
  }, [amount, mode]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/agent/${mode}`, {
        client_phone: clientPhone,
        amount: Number(amount),
      });
      alert(`✅ Opération réussie. Commission: ${res.commission}`);
      navigate("/dashboard/agent");
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur...");
    }
    setLoading(false);
  };

  if (!client) return <p>Chargement…</p>;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <button
        className="flex items-center text-gray-600"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} /> Retour
      </button>

      {/* Infos client */}
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
        <p className="text-lg font-semibold">{client.full_name}</p>
        <p className="text-gray-500">{client.phone_e164}</p>
        <p className="text-sm">
          KYC:
          <span className="font-semibold text-indigo-600">
            {" "}
            {client.kyc_status}
          </span>
        </p>

        <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
          <Wallet size={18} /> Solde :
          <span className="font-bold text-green-600">
            {client.wallet.available} BIF
          </span>
        </div>
      </div>

      {/* Montant */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600">Montant (BIF)</label>
        <input
          type="number"
          className="input w-full"
          placeholder="Ex: 20000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Modes */}
      <div className="flex gap-2">
        <OptionButton
          active={mode === "cash-in"}
          onClick={() => setMode("cash-in")}
          icon={<ArrowDownCircle size={18} />}
          label="Cash-In"
        />
        <OptionButton
          active={mode === "cash-out"}
          onClick={() => setMode("cash-out")}
          icon={<ArrowUpCircle size={18} />}
          label="Cash-Out"
        />
        <OptionButton
          active={mode === "mobile-money"}
          onClick={() => setMode("mobile-money")}
          icon={<Smartphone size={18} />}
          label="Mobile Money"
        />
      </div>

      {/* Commission */}
      <div className="p-4 bg-purple-50 rounded-xl border text-purple-700">
        Commission : <b>{commission.toFixed(0)} BIF</b>
      </div>

      {/* Valider */}
      <button
        className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700"
        onClick={handleConfirm}
        disabled={loading}
      >
        Confirmer l’opération
      </button>
    </div>
  );
}

function OptionButton({ active, label, icon, onClick }) {
  return (
    <button
      className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${
        active ? "bg-indigo-600 text-white" : "bg-white text-gray-600"
      }`}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}

