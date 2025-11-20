import { useState } from "react";
import api from "@/services/api";

export default function KYCPage() {
  const [legalName, setLegalName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [docType, setDocType] = useState("national_id");
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);

    const fd = new FormData();
    fd.append("legal_name", legalName);
    fd.append("birth_date", birthDate);
    fd.append("national_id_number", nationalId);
    fd.append("kyc_document_type", docType);
    fd.append("document_front", front);
    if (back) fd.append("document_back", back);
    fd.append("selfie", selfie);

    await api.post("/kyc/submit", fd, true); // true → multipart
    alert("✅ KYC soumis. Vérification en cours.");
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-xl font-bold mb-4">Vérification d’Identité (KYC)</h1>

      <label className="block mb-2">Nom complet</label>
      <input
        className="input"
        value={legalName}
        onChange={(e) => setLegalName(e.target.value)}
      />

      <label className="block mt-4 mb-2">Date de naissance</label>
      <input
        type="date"
        className="input"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />

      <label className="block mt-4 mb-2">Numéro du document</label>
      <input
        className="input"
        value={nationalId}
        onChange={(e) => setNationalId(e.target.value)}
      />

      <label className="block mt-4 mb-2">Type de document</label>
      <select
        className="input"
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
      >
        <option value="national_id">Carte d’identité</option>
        <option value="passport">Passeport</option>
      </select>

      <label className="block mt-4 mb-2">Photo du document (recto)</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFront(e.target.files[0])}
      />

      <label className="block mt-4 mb-2">
        Photo du document (verso) (optionnel)
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setBack(e.target.files[0])}
      />

      <label className="block mt-4 mb-2">Selfie tenant le document</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setSelfie(e.target.files[0])}
      />

      <button
        className="btn-primary w-full mt-6"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "⏳ Envoi..." : "📤 Soumettre"}
      </button>
    </div>
  );
}
