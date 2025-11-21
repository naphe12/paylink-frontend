// src/pages/tontine/TontineCreatePage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "@/services/api";

import { Loader2, Plus, X } from "lucide-react";

export default function TontineCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [memberTag, setMemberTag] = useState("");
  const [members, setMembers] = useState([]); // liste de paytags
  const [posting, setPosting] = useState(false);

  function addMember() {
    const tag = memberTag.trim();
    if (!tag) return;
    if (!tag.startsWith("@")) return alert("Le PayTag doit commencer par @");
    if (members.includes(tag)) return;
    setMembers([...members, tag]);
    setMemberTag("");
  }

  function removeMember(tag) {
    setMembers(members.filter((t) => t !== tag));
  }

  async function submit() {
    if (!name || !amount || Number(amount) <= 0 || members.length < 2) {
      return alert("Nom, montant et au moins 2 membres requis");
    }
    setPosting(true);
    try {
      const data = await api.createTontine({
        name,
        amount: Number(amount),
        frequency, // "weekly" | "biweekly" | "monthly"
        members, // tableau de paytags
      });
      navigate(`/dashboard/client/tontines/${data.id}`);
    } catch (e) {
      console.error(e);
      alert("Création impossible");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border shadow p-5 sm:p-6">
        <h1 className="text-2xl font-bold mb-4">Créer une tontine</h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Nom</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Ex: Tontine du vendredi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">
                Montant / membre (€)
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="25.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">Fréquence</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="weekly">Hebdomadaire</option>
                <option value="biweekly">Bimensuelle</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Membres (PayTags)</label>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="@alice"
                value={memberTag}
                onChange={(e) => setMemberTag(e.target.value)}
              />
              <button
                onClick={addMember}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50"
              >
                <Plus size={18} /> Ajouter
              </button>
            </div>

            {!!members.length && (
              <div className="flex flex-wrap gap-2 mt-3">
                {members.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100"
                  >
                    {tag}
                    <button
                      onClick={() => removeMember(tag)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={posting ? undefined : submit}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center"
          >
            {posting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Créer la tontine"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
