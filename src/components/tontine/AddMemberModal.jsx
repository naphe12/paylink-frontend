import { useState } from "react";
import Api from "@/services/api";
import { Search, UserPlus } from "lucide-react";

export default function AddMemberModal({ tontineId, onClose, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  async function search() {
    const data = await Api.get(`/users/search?query=${query}`);
    setResults(data);
  }

  async function addMember(userId) {
    await Api.post(`/tontines/${tontineId}/members/add`, { user_id: userId });
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-xl w-[400px] space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#0b3b64]">
          Ajouter un membre
        </h2>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Rechercher nom / téléphone / @paytag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={search} className="btn-secondary">
            <Search size={18} />
          </button>
        </div>

        <ul className="max-h-48 overflow-y-auto space-y-2">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex justify-between items-center border-b py-2"
            >
              <span>
                {u.name} ({u.paytag || u.phone})
              </span>
              <button
                className="btn-primary flex items-center gap-1"
                onClick={() => addMember(u.id)}
              >
                <UserPlus size={16} /> Ajouter
              </button>
            </li>
          ))}
        </ul>

        <button onClick={onClose} className="w-full text-center text-gray-500">
          Fermer
        </button>
      </div>
    </div>
  );
}
