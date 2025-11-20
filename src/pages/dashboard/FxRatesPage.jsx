import { useState, useEffect } from "react";
import api from "@/services/api";

import { RefreshCcw, Edit3, Save } from "lucide-react";

export default function FxRatesPage() {
  const [rates, setRates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Charger les taux personnalisés
  const fetchRates = async () => {
    try {
      const data = await api.get("/api/exchange-rate/custom");
      setRates(data);
    } catch (err) {
      console.error("Erreur récupération des taux :", err);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // 🔹 Modifier un taux
  const handleSave = async (currency) => {
    if (!newRate || Number(newRate) <= 0) {
      alert("Veuillez entrer un taux valide.");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/api/exchange-rate/${currency}?new_rate=${newRate}`);
      setMessage(`✅ Taux mis à jour pour ${currency}`);
      setEditing(null);
      setNewRate("");
      fetchRates(); // rafraîchir la liste
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0b3b64] flex items-center gap-2">
          💱 Gestion des taux de change
        </h2>
        <button
          onClick={fetchRates}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700"
        >
          <RefreshCcw size={16} /> Rafraîchir
        </button>
      </div>

      {message && (
        <p className="text-green-600 mb-4 font-medium">{message}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#0b3b64] text-white">
              <th className="p-3 text-left rounded-l-lg">Devise</th>
              <th className="p-3 text-left">Taux</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Actif</th>
              <th className="p-3 text-left rounded-r-lg">Dernière mise à jour</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rates.length > 0 ? (
              rates.map((r) => (
                <tr
                  key={r.destination_currency}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-3 font-semibold">{r.destination_currency}</td>
                  <td className="p-3">
                    {editing === r.destination_currency ? (
                      <input
                        type="number"
                        className="border rounded-md px-2 py-1 w-24 text-center font-bold"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                      />
                    ) : (
                      <span className="font-bold">{Number(r.rate).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-700">{r.source}</td>
                  <td className="p-3">{r.is_active ? "✅" : "❌"}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {editing === r.destination_currency ? (
                      <button
                        onClick={() => handleSave(r.destination_currency)}
                        disabled={loading}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition"
                      >
                        <Save size={14} /> Enregistrer
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(r.destination_currency);
                          setNewRate(r.rate);
                        }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
                      >
                        <Edit3 size={14} /> Modifier
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  Aucun taux enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
