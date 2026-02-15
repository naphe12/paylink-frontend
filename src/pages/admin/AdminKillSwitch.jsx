import { useEffect, useState } from "react";

async function api(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminKillSwitch() {
  const [on, setOn] = useState(false);

  const load = async () => {
    const d = await api("/api/admin/flags/kill-switch");
    setOn(Boolean(d.value));
  };

  const toggle = async () => {
    const next = !on;
    await api(`/api/admin/flags/kill-switch?value=${next}`, { method: "POST" });
    setOn(next);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Panic Button (Kill Switch)</h2>
      <p>
        Status: <b style={{ color: on ? "red" : "green" }}>{on ? "ON (blocked)" : "OFF (normal)"}</b>
      </p>
      <button onClick={toggle} style={{ padding: "10px 14px" }}>
        {on ? "Disable Kill Switch" : "Enable Kill Switch"}
      </button>
      <p style={{ marginTop: 10, color: "#666" }}>
        Quand ON: creation offers/trades, arbitrage, MM, payout auto peuvent etre bloques.
      </p>
    </div>
  );
}
