// components/kyc/KycStatusCard.jsx
import { useState } from "react";
import api from "@/services/api";

export default function KycStatusCard({ kyc, onRefresh }) {
  const [loading, setLoading] = useState(false);

  const initiate = async (tier = "STANDARD") => {
    setLoading(true);
    try {
      await api.post("/kyc/initiate", { tier });
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border shadow-sm p-5 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vérification d’identité</h3>
        <span className={`px-2 py-1 text-xs rounded ${badge(kyc?.status)}`}>
          {kyc?.status ?? "non démarré"}
        </span>
      </div>

      <p className="text-sm text-gray-600 mt-2">
        Tier: <b>{kyc?.tier ?? "-"}</b>
      </p>

      {!kyc && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => initiate("BASIC")} className="btn-secondary">
            Démarrer BASIC
          </button>
          <button
            onClick={() => initiate("STANDARD")}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "..." : "Démarrer STANDARD"}
          </button>
          <button
            onClick={() => initiate("ENHANCED")}
            className="btn-secondary"
          >
            ENHANCED
          </button>
        </div>
      )}

      {kyc && kyc.status === "pending_docs" && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">Documents requis :</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {kyc.required_docs?.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <span className="text-sm">{label(d)}</span>
                <UploadDocButton
                  kycId={kyc.kyc_id}
                  docType={d}
                  onDone={onRefresh}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function badge(status) {
  if (!status) return "bg-gray-100 text-gray-600";
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "review") return "bg-yellow-100 text-yellow-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function label(k) {
  const map = {
    id_front: "Pièce d’identité – recto",
    id_back: "Pièce d’identité – verso",
    selfie_liveness: "Selfie (liveness)",
    proof_of_address: "Justificatif de domicile",
    source_of_funds: "Source des fonds",
  };
  return map[k] ?? k;
}

function UploadDocButton({ kycId, docType, onDone }) {
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async () => {
    // 1) file picker
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      setBusy(true);
      try {
        // ⬇️ ici : upload vers ton storage (S3/MinIO) -> url
        const url = await fakeUpload(file); // remplace par ton vrai upload
        await api.post("/kyc/upload", {
          kyc_id: kycId,
          doc_type: docType,
          file_url: url,
        });
        onDone?.();
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  return (
    <button
      onClick={pickAndUpload}
      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
      disabled={busy}
    >
      {busy ? "Envoi..." : "Téléverser"}
    </button>
  );
}

// Stub: remplace par vrai upload (S3/MinIO)
async function fakeUpload(file) {
  await new Promise((r) => setTimeout(r, 700));
  return URL.createObjectURL(file); // seulement demo
}
