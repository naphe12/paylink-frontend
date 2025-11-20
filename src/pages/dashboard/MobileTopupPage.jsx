import { useState } from "react";
import api from "@/services/api";

import { Smartphone } from "lucide-react";

export default function MobileTopupPage() {
  const [form, setForm] = useState({
    amount: "",
    operator: "Lumicash",
    phone: "",
  });

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post("/wallet/mobilemoney/request", form);
      setResponse(data);
    } catch (err) {
      alert("Erreur: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">
      <h2 className="text-xl font-semibold text-[#0b3b64] mb-4 flex items-center gap-2">
        <Smartphone size={22}/> Dépôt Mobile Money
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="number" placeholder="Montant (€)" name="amount" value={form.amount} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg"/>

        <select name="operator" value={form.operator} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
          <option>Lumicash</option>
          <option>Ecocash</option>
          <option>eNoti</option>
        </select>

        <input type="text" placeholder="Votre numéro Mobile Money" name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg"/>

        <button disabled={loading} className="w-full py-3 bg-[#0b3b64] text-white rounded-lg">
          {loading ? "Envoi..." : "Générer instructions 📩"}
        </button>
      </form>

      {response && (
        <div className="mt-4 p-4 bg-blue-50 border rounded-lg text-sm">
          <p><strong>Envoyez :</strong> {response.amount_local} BIF</p>
          <p><strong>Vers :</strong> {response.operator} ({response.destination_phone})</p>
          <p><strong>Référence :</strong> {response.reference_code}</p>
          <p className="text-xs text-gray-500 mt-2">* L’agent validera sous quelques minutes.</p>
        </div>
      )}
    </div>
  );
}
