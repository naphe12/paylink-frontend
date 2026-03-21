import { useEffect } from "react";
import { resolveWsUrl } from "@/services/ws";
import { getAccessToken } from "@/services/authStore";

export default function useTontineWS(tontineId, onMessage) {
  useEffect(() => {
    if (!tontineId) return;

    const token = getAccessToken();
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
