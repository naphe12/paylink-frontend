import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws/notifications";

/**
 * Se connecte au WS, réessaie avec backoff, affiche des toasts en fonction des événements.
 * Exemples d’événements attendus côté backend (JSON):
 * { "type":"rotation.next", "tontine_id":"...", "receiver_name":"Fatou", "round": 3 }
 * { "type":"payment.received", "amount": 25, "currency":"EUR" }
 * { "type":"bonus.awarded", "points": 50, "reason":"Parrainage" }
 */
export default function useNotifications() {
  const { push } = useToast();
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const connect = () => {
      const token = localStorage.getItem("token");
      const url = token
        ? `${WS_URL}?token=${encodeURIComponent(token)}`
        : WS_URL;

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        retryRef.current = 0;
        push("🔔 Connecté aux notifications.", {
          type: "success",
          duration: 2000,
        });
      };

      wsRef.current.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);

          switch (data.type) {
            case "rotation.next": {
              const name = data.receiver_name || "Prochain membre";
              const round = data.round ? ` (tour ${data.round})` : "";
              push(`🔁 Rotation mise à jour : ${name}${round}`, {
                type: "info",
              });
              break;
            }
            case "payment.received": {
              push(
                `💸 Paiement reçu : +${Number(data.amount).toFixed(2)} ${
                  data.currency || ""
                }`,
                { type: "success" }
              );
              break;
            }
            case "payment.sent": {
              push(
                `📤 Paiement envoyé : -${Number(data.amount).toFixed(2)} ${
                  data.currency || ""
                }`,
                { type: "info" }
              );
              break;
            }
            case "bonus.awarded": {
              push(
                `🎁 Bonus: +${data.points} points (${
                  data.reason || "récompense"
                })`,
                { type: "success" }
              );
              break;
            }
            case "tontine.invite.accepted": {
              push(
                `🧑‍🤝‍🧑 Nouvelle adhésion à la tontine : ${
                  data.member_name || "Membre"
                }`,
                { type: "success" }
              );
              break;
            }
            default: {
              // Pour le debug ou les messages génériques
              if (data.message) push(data.message, { type: "info" });
            }
          }
        } catch {
          // Message non-JSON
        }
      };

      wsRef.current.onclose = () => {
        if (stoppedRef.current) return;
        const base = 1000;
        const max = 8000;
        const delay = Math.min(max, base * Math.pow(2, retryRef.current++));
        setTimeout(connect, delay);
      };

      wsRef.current.onerror = () => {
        // L’event onclose gèrera la reconnexion
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      try {
        wsRef.current && wsRef.current.close();
      } catch {}
    };
  }, [push]);
}
