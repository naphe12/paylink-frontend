import { useEffect } from "react";

export default function useTontineWS(tontineId, onMessage) {
  useEffect(() => {
    if (!tontineId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/tontine/${tontineId}?token=${token}`
    );

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      onMessage?.(msg);
    };

    ws.onclose = () => {};

    return () => ws.close();
  }, [tontineId]);
}
