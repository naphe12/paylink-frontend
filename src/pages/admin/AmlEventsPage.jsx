// src/pages/admin/AmlEventsPage.jsx
import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AmlEventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/admin/aml/events").then(setEvents);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Alertes AML</h1>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left">Utilisateur</th>
            <th className="p-2 text-left">Δ Score</th>
            <th className="p-2 text-left">Montant</th>
            <th className="p-2 text-left">Raison</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.event_id} className="border-b">
              <td className="p-2">
                <div className="font-medium">{ev.user_name || "—"}</div>
                <div className="text-xs text-slate-500">
                  {ev.user_email || ev.user_id || ""}
                </div>
              </td>
              <td className="p-2">{ev.score_delta}</td>
              <td className="p-2">
                {ev.amount !== null && ev.amount !== undefined
                  ? `${ev.amount} ${ev.currency_code || ""}`.trim()
                  : "—"}
              </td>
              <td className="p-2">{ev.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
