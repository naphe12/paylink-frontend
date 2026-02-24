import { useEffect, useState } from "react";
import api from "@/services/api";

export default function LiquidityBifPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOpsLiquidityBif()
      .then((r) => {
        setData(r);
        setError("");
      })
      .catch((e) => setError(e?.message || "Erreur"));
  }, []);

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold text-slate-900">Liquidite BIF</h2>
        <p className="mt-2 text-sm text-rose-700">Erreur: {error}</p>
      </div>
    );
  }

  if (!data) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-xl font-semibold text-slate-900">Liquidite BIF</h2>
      <p className="text-slate-700">Disponible: {data.available_bif}</p>
      <p className="text-slate-700">Reserve: {data.reserved_bif}</p>
    </div>
  );
}
