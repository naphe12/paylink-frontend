import { useEffect } from "react";
import { resolveWsUrl } from "@/services/ws";

export default function useTontineWS(tontineId, onMessage) {
  useEffect(() => {
    if (!tontineId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `${resolveWsUrl(`/ws/tontine/${tontineId}`)}?token=${token}`
    );

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      onMessage?.(msg);
    };

    ws.onclose = () => {};

    return () => ws.close();
  }, [tontineId]);
}
