// src/components/tontine/DebtsTable.jsx
import { useState, useEffect } from "react";
import ApiService from "@/services/api";

export default function DebtsTable({ id, currency }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(null);

  const loadDebts = async () => {
    setLoading(true);
    const d = await ApiService.get(`/tontines/${id}/debts`);
    setRows(d.rows || []);
    setPeriod({ start: d.period_start, end: d.period_end });
    setLoading(false);
  };

  useEffect(() => {
    loadDebts();
  }, [id]);

  if (loading) return <p className="mt-4">Chargement dettes…</p>;

  return (
    <div className="mt-6 p-4 border rounded-xl bg-white">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-[#0b3b64]">📊 Qui doit combien</h4>
        <button
          onClick={loadDebts}
          className="text-sm text-blue-600 hover:underline"
        >
          Rafraîchir
        </button>
      </div>

      {period && (
        <p className="text-xs text-gray-500 mb-2">
          Période : {new Date(period.start).toLocaleDateString()} →{" "}
          {new Date(period.end).toLocaleDateString()}
        </p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Membre</th>
            <th className="py-2">Attendu</th>
            <th className="py-2">Payé</th>
            <th className="py-2">Reste</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} className="border-b">
              <td className="py-2">{r.user_name}</td>
              <td className="py-2">
                {r.expected.toFixed(2)} {currency}
              </td>
              <td className="py-2">
                {r.paid.toFixed(2)} {currency}
              </td>
              <td
                className={`py-2 font-semibold ${
                  r.due > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {r.due.toFixed(2)} {currency}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
