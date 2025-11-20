// src/components/security/SecurityAlertsPanel.jsx
import { useEffect, useState, useRef } from "react";

export default function SecurityAlertsPanel() {
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/security");
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setEvents((prev) => [msg, ...prev].slice(0, 100));
      } catch {}
    };

    ws.onclose = () => {};
    return () => ws.close();
  }, []);

  const badge = (sev) =>
    sev === "high" ? "bg-red-100 text-red-700"
      : sev === "medium" ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="p-4 border rounded-xl bg-white">
      <h3 className="font-bold text-lg mb-3">🔐 Sécurité & AML</h3>
      <div className="space-y-2 max-h-80 overflow-auto">
        {events.map((e, i) => (
          <div key={i} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-xs ${badge(e.severity || e.level)}`}>
                {e.severity || e.level || "info"}
              </span>
              <span className="text-xs text-gray-500">{e.type || e.event_type}</span>
            </div>
            <div className="text-sm mt-1">{e.message || e.detail || "-"}</div>
            {e.user_id && <div className="text-xs text-gray-500 mt-1">user: {e.user_id}</div>}
            {e.score != null && <div className="text-xs text-gray-500">score: {e.score}</div>}
          </div>
        ))}
        {events.length === 0 && <div className="text-sm text-gray-500">Aucun événement pour le moment.</div>}
      </div>
    </div>
  );
}
