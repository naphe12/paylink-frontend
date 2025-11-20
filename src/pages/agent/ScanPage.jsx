import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "@/services/api";
import { Loader2, Wallet, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ScanPage() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: 250,
    });

    scanner.render(async (decodedText) => {
      setLoading(true);
      try {
        // decodedText = JSON → { user_id }
        const data = JSON.parse(decodedText);
        const u = await api.get(`/users/${data.user_id}`);
        setClient(u);
      } catch (err) {
        console.error("Invalid QR", err);
      }
      setLoading(false);
    });

    return () => scanner.clear();
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#0b3b64] text-center mb-4">
        Scanner QR du Client
      </h1>

      <div
        id="qr-reader"
        className="rounded-lg overflow-hidden border shadow-md"
      />

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-gray-500" size={28} />
        </div>
      )}

      {client && (
        <div className="mt-6 p-5 rounded-2xl bg-white shadow-xl border space-y-4">
          <div className="flex items-center gap-3">
            <User size={28} className="text-indigo-600" />
            <div>
              <p className="text-lg font-semibold">{client.full_name}</p>
              <p className="text-gray-500">{client.phone_e164}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-green-600 text-lg font-medium">
            <Wallet size={22} />
            Solde : <strong>{client.wallet.available} BIF</strong>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              className="bg-green-600 text-white py-3 rounded-xl hover:bg-green-700"
              onClick={() => navigate(`/agent/cash-in?uid=${client.user_id}`)}
            >
              💰 Cash-In
            </button>

            <button
              className="bg-red-600 text-white py-3 rounded-xl hover:bg-red-700"
              onClick={() => navigate(`/agent/cash-out?uid=${client.user_id}`)}
            >
              💸 Cash-Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

