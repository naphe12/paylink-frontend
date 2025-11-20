// src/components/NotificationBell.jsx
import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // ✅ Récupère le token JWT depuis localStorage
    const token = localStorage.getItem("token");
    if (!token) return;

    // ✅ Connexion WebSocket
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ Connecté au WebSocket PayLink");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [data, ...prev]);
        setHasNew(true);
      } catch {
        console.error("Erreur parsing WS :", event.data);
      }
    };

    ws.onclose = () => console.log("❌ Déconnecté du WebSocket PayLink");
    ws.onerror = (err) => console.error("⚠️ Erreur WS :", err);

    return () => ws.close();
  }, []);

  const toggleDropdown = () => {
    setOpen(!open);
    setHasNew(false);
  };

  return (
    <div className="relative">
      {/* 🔔 Icône cliquable */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
      >
        <Bell size={24} className="text-yellow-300" />
        {hasNew && (
          <span className="absolute top-1 right-1 bg-red-500 w-3 h-3 rounded-full border border-white"></span>
        )}
      </button>

      {/* 🔽 Liste notifications */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-lg rounded-xl text-gray-800 z-50">
          <div className="p-3 border-b font-semibold text-[#0b3b64]">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm text-center">
                Aucune notification
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className="p-3 border-b last:border-none hover:bg-gray-50 transition"
                >
                  <p className="text-sm font-semibold">{msg.title || "Notification"}</p>
                  <p className="text-xs text-gray-600">{msg.message || JSON.stringify(msg)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

