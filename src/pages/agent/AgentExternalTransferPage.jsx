import { useEffect, useState } from "react";
import api from "@/services/api";
import { Send, Info } from "lucide-react";

export default function AgentExternalTransferPage() {
  const [users, setUsers] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [prefill, setPrefill] = useState({
    recipient_name: "",
    recipient_phone: "",
    partner_name: "",
    country_destination: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.getExternalUsers();
        setUsers(data || []);
      } catch (err) {
        setError("Impossible de charger les utilisateurs (transferts externes).");
        console.error(err);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setBeneficiaries([]);
      setSelectedBeneficiary("");
      setPrefill({
        recipient_name: "",
        recipient_phone: "",
        partner_name: "",
        country_destination: "",
      });
      return;
    }
    const loadBeneficiaries = async () => {
      try {
        const data = await api.getExternalBeneficiariesByUser(selectedUser);
        setBeneficiaries(data || []);
        setSelectedBeneficiary("");
        setPrefill({
          recipient_name: "",
          recipient_phone: "",
          partner_name: "",
          country_destination: "",
        });
      } catch (err) {
        setError("Impossible de charger les bénéficiaires de cet utilisateur.");
        console.error(err);
      }
    };
    loadBeneficiaries();
  }, [selectedUser]);

  const handleBeneficiaryChange = (value) => {
    setSelectedBeneficiary(value);
    const found = beneficiaries.find((b) => b.recipient_phone === value);
    if (found) {
      setPrefill({
        recipient_name: found.recipient_name,
        recipient_phone: found.recipient_phone,
        partner_name: found.partner_name,
        country_destination: found.country_destination,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Send size={22} /> Transfert externe (agent)
      </h2>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-5 flex items-start gap-3 text-sm">
        <Info size={18} className="mt-0.5" />
        <div className="space-y-1">
          <p>Sélectionnez d’abord l’utilisateur, puis un de ses bénéficiaires déjà utilisés.</p>
          <p className="text-[13px] text-blue-700">
            Les champs destinataire se remplissent automatiquement (nom, téléphone, partenaire, pays).
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-5 text-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Utilisateur</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">-- Sélectionner un utilisateur --</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || "Utilisateur"} • {u.email || u.phone || u.user_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Bénéficiaire</label>
            <select
              value={selectedBeneficiary}
              onChange={(e) => handleBeneficiaryChange(e.target.value)}
              disabled={!selectedUser}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">-- Sélectionner --</option>
              {beneficiaries.map((b) => (
                <option key={b.recipient_phone} value={b.recipient_phone}>
                  {b.recipient_name} • {b.partner_name} • {b.recipient_phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nom du bénéficiaire</label>
            <input
              type="text"
              value={prefill.recipient_name}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="—"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Téléphone</label>
            <input
              type="text"
              value={prefill.recipient_phone}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="—"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Partenaire</label>
            <input
              type="text"
              value={prefill.partner_name}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="—"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pays de destination</label>
            <input
              type="text"
              value={prefill.country_destination}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="—"
            />
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Cette vue prépare les infos destinataire. L’envoi reste à brancher sur le flux agent selon vos règles
          (débit client, validation, etc.).
        </p>
      </div>
    </div>
  );
}
