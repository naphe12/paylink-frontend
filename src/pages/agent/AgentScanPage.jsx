import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { CheckCircle, Loader2, QrCode, ShieldCheck } from "lucide-react";

export default function AgentScanPage() {
  const navigate = useNavigate();
  const [qrValue, setQrValue] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleDecode = async (data) => {
    if (!data?.[0]?.rawValue || confirming || loading) return;
    await fetchTransaction(data[0].rawValue);
  };

  const fetchTransaction = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.scanAgentQr({ qr_payload: payload });
      setScanResult(result);
      setSuccess(false);
    } catch (err) {
      setError(err.message || "QR invalide ou transaction introuvable");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!qrValue.trim()) return;
    await fetchTransaction(qrValue.trim());
  };

  const confirmPayment = async () => {
    if (!scanResult) return;
    setConfirming(true);
    setError(null);
    try {
      await api.confirmAgentQr({
        tx_id: scanResult.tx_id,
        pin: pin || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard/agent/dashboard");
      }, 2000);
    } catch (err) {
      setError(err.message || "Validation impossible");
    } finally {
      setConfirming(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setQrValue("");
    setPin("");
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode size={24} /> Validation de paiement
        </h1>
        <p className="text-sm text-slate-500">
          Scanne le QR du client, vérifie les détails puis confirme le paiement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
          <Scanner
            onDecode={handleDecode}
            onError={(err) => console.warn(err)}
            constraints={{ facingMode: "environment" }}
            containerStyle={{ width: "100%", borderRadius: "1rem" }}
          />

          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-500">
              Saisie manuelle (payload ou tx_id)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                className="input flex-1"
                placeholder="Colle ici le contenu du QR"
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
              />
              <button
                type="button"
                onClick={handleManualLookup}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white"
              >
                Chercher
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="animate-spin" />
              Lecture du QR...
            </div>
          ) : scanResult ? (
            <>
              <div>
                <p className="text-xs uppercase text-slate-500">Transaction</p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {scanResult.amount.toLocaleString()} {scanResult.currency}
                </h2>
                <p className="text-sm text-slate-500">
                  Client : {scanResult.client?.name || "—"}{" "}
                  <span className="text-slate-400">
                    {scanResult.client?.phone || ""}
                  </span>
                </p>
              </div>

              {scanResult.requires_pin && (
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    PIN client requis
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    className="input w-full"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {success ? (
                <div className="flex flex-col items-center gap-2 text-emerald-600">
                  <CheckCircle size={48} />
                  <p>Paiement validé ! Redirection...</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2 rounded-lg border"
                    onClick={resetScan}
                    disabled={confirming}
                  >
                    Annuler
                  </button>
                  <button
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white flex items-center justify-center gap-2"
                    onClick={confirmPayment}
                    disabled={confirming}
                  >
                    {confirming && <Loader2 className="animate-spin" size={16} />}
                    Valider
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
              <ShieldCheck size={40} />
              Aucun QR scanné pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

