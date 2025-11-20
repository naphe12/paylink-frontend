import { useState } from "react";
import Api from "@/services/api";
import { useNavigate } from "react-router-dom";

export default function TontineCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [tontineType, setTontineType] = useState("rotative");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BIF");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("rotative");
  const createTontine = async () => {
    if (!name || !amount) return alert("Tous les champs sont requis.");

    setLoading(true);

    try {
      await ApiService.post("/tontines/create", {
        name,
        amount,
        frequency,
        tontine_type: type,
      });


      alert("✅ Tontine créée avec succès !");
      navigate("/dashboard/client/tontines");
    } catch (e) {
      console.error(e);
      alert("❌ Erreur lors de la création de la tontine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white shadow-xl rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4 text-[#0b3b64]">
        Créer une Tontine
      </h2>
      <label className="text-sm font-medium">Nom de la tontine</label>
      <input
        className="input mt-1"
        placeholder="Ex : Tontine du groupe famille"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      
      <div className="space-y-1">
        <label className="font-medium">Type de Tontine</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="input"
        >
          <option value="rotative">🔁 Rotative (tour à tour)</option>
          <option value="epargne">💰 Épargne Commune (pot commun)</option>
        </select>
      </div>
      <label className="text-sm font-medium mt-4">
        Montant par cycle / cotisation
      </label>
      <input
        className="input mt-1"
        type="number"
        placeholder="Ex : 5000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label className="text-sm font-medium mt-4">Devise</label>
      <select
        className="input mt-1"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        <option>BIF</option>
        <option>KES</option>
        <option>RWF</option>
        <option>USD</option>
      </select>
      <button
        onClick={createTontine}
        disabled={loading}
        className="w-full mt-6 py-3 bg-[#0b3b64] text-white rounded-xl hover:bg-[#062b4b] transition"
      >
        {loading ? "Création..." : "Créer la tontine"}
      </button>
    </div>
  );
}

