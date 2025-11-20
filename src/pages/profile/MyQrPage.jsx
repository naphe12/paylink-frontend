import { useEffect, useState } from "react";
import api from "@/services/api";
import QRCode from "react-qr-code";

export default function MyQrPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/me/qr")
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) return <div className="p-6 text-center">Chargement...</div>;
  if (data.error)
    return <div className="p-6 text-center text-red-600">Erreur QR.</div>;

  return (
    <div className="p-6 flex flex-col items-center text-center">
      <h1 className="text-2xl font-bold text-[#0b3b64]">Mon QR PayLink</h1>
      <p className="text-gray-600 mt-1">Présentez ce QR à un agent.</p>

      <div className="bg-white shadow-md p-5 rounded-xl mt-6">
        <QRCode value={JSON.stringify(data)} size={220} />
      </div>

      <p className="mt-4 text-gray-800 font-medium text-lg">{data.phone}</p>
      <p className="text-sm text-gray-500">UID : {data.uid}</p>
    </div>
  );
}
