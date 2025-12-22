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
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(0);
  const [feesPercent, setFeesPercent] = useState(0);
  const [recipientAmount, setRecipientAmount] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
        setError("Impossible de charger les beneficiaires de cet utilisateur.");
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
      setError("");
    }
  };

  useEffect(() => {
    if (!amount || isNaN(amount) || rate === 0) {
      setRecipientAmount(0);
      return;
    }
    const eur = parseFloat(amount);
    const fees = eur * (feesPercent / 100);
    const converted = (eur - fees) * rate;
    setRecipientAmount(converted);
  }, [amount, rate, feesPercent]);

  useEffect(() => {
    const dest = prefill.country_destination || "";
    if (!dest) return;
    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const target = dest === "Burundi" ? "BIF" : dest;
        const res = await api.getExchangeRate("EUR", target);
        if (res?.rate) setRate(Number(res.rate));
        if (res?.fees_percent) setFeesPercent(Number(res.fees_percent));
      } catch (err) {
        console.error("Impossible de charger le taux FX", err);
        setError("Impossible de charger le taux FX pour cette destination.");
      } finally {
        setLoadingRate(false);
      }
    };
    loadRate();
  }, [prefill.country_destination]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedUser || !selectedBeneficiary) {
      setError("Selectionnez un utilisateur et un beneficiaire.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    setSubmitting(true);
    try {
      // TODO: brancher l'appel API agent de creation d'un transfert externe pour ce client.
      alert(
        "Transfert agent (envoi a connecter a l'API):\n" +
          JSON.stringify(
            {
              user_id: selectedUser,
              partner_name: prefill.partner_name,
              country_destination: prefill.country_destination,
              recipient_name: prefill.recipient_name,
              recipient_phone: prefill.recipient_phone,
              amount,
            },
            null,
            2
          )
      );
    } finally {
      setSubmitting(false);
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
          <p>Selectionnez d'abord l'utilisateur, puis un de ses beneficiaires deja utilises.</p>
          <p className="text-[13px] text-blue-700">
            Les champs destinataire se remplissent automatiquement (nom, telephone, partenaire, pays). Le montant, taux et frais sont affiches comme cote client.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form className="space-y-5 text-gray-800" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Utilisateur</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">-- Selectionner un utilisateur --</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || "Utilisateur"} - {u.email || u.phone || u.user_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Beneficiaire</label>
            <select
              value={selectedBeneficiary}
              onChange={(e) => handleBeneficiaryChange(e.target.value)}
              disabled={!selectedUser}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">-- Selectionner --</option>
              {beneficiaries.map((b) => (
                <option key={b.recipient_phone} value={b.recipient_phone}>
                  {b.recipient_name} - {b.partner_name} - {b.recipient_phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Montant (EUR)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="100.00"
            />
            <p className="text-xs text-slate-500 mt-1">
              Frais estimes : {(parseFloat(amount || 0) * (feesPercent / 100)).toFixed(2)} EUR
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Taux applique</span>
              <span className="font-semibold">{loadingRate ? "..." : rate || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Frais</span>
              <span className="font-semibold">{feesPercent || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Montant recu estime</span>
              <span className="font-semibold">
                {recipientAmount.toFixed(2)}{" "}
                {prefill.country_destination === "Burundi"
                  ? "BIF"
                  : prefill.country_destination || ""}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nom du beneficiaire</label>
            <input
              type="text"
              value={prefill.recipient_name}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="--"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Telephone</label>
            <input
              type="text"
              value={prefill.recipient_phone}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="--"
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
              placeholder="--"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pays de destination</label>
            <input
              type="text"
              value={prefill.country_destination}
              readOnly
              className="w-full px-3 py-2 border rounded-md text-base bg-gray-50"
              placeholder="--"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedUser || !selectedBeneficiary}
          className="w-full bg-teal-700 text-white font-semibold py-3 rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
        >
          {submitting ? "Preparation..." : "Envoyer le transfert (agent)"}
        </button>
      </form>
    </div>
  );
}
