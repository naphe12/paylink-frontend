import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Users, Clock, PlusCircle } from "lucide-react";

export default function TontineListPage() {
  const [tontines, setTontines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTontines();
  }, []);

  const loadTontines = async () => {
    try {
      const data = await api.getTontines();
      setTontines(data);
    } catch (err) {
      console.error("Erreur chargement tontines:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header title */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0b3b64]">Tontines</h2>

        <Link
          to="/dashboard/client/tontines/create"
          className="flex items-center gap-2 bg-[#0b3b64] text-white px-4 py-2 rounded-xl hover:bg-[#0a3357] transition"
        >
          <PlusCircle size={18} /> Nouvelle tontine
        </Link>
      </div>

      {/* Loading state */}
      {loading && <p className="text-center text-gray-600">Chargement...</p>}

      {/* Empty state */}
      {!loading && tontines.length === 0 && (
        <p className="text-center text-gray-500">
          Aucune tontine pour l’instant.
        </p>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {tontines.map((t) => (
          <Link
            key={t.tontine_id}
            to={`/dashboard/tontines/${t.tontine_id}`}
            className="p-4 bg-white shadow-sm border rounded-xl flex justify-between items-center hover:shadow-md transition"
          >
            <div>
              <h3 className="font-semibold text-lg">{t.name}</h3>
              <p className="text-sm text-gray-600">
                Montant : {t.amount_per_member} •{" "}
                <Users className="inline h-4" /> {t.members} membres
              </p>
            </div>
            <div className="text-sm text-gray-400 flex items-center gap-1">
              <Clock size={14} /> Prochain tour : {t.next_rotation_at}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

