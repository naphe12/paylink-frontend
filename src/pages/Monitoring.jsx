import { useEffect, useState } from "react";

export default function Monitoring() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/backoffice/monitoring/summary", { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p style={{ padding: 20 }}>Chargement…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Monitoring</h2>

      <h3>Orders by status</h3>
      <ul>
        {data.orders_by_status.map((s, i) => (
          <li key={i}>
            {s.status}: {s.count}
          </li>
        ))}
      </ul>

      <h3>Webhooks (24h)</h3>
      <ul>
        {data.webhooks_24h.map((w, i) => (
          <li key={i}>
            {w.status}: {w.count}
          </li>
        ))}
      </ul>

      <h3>Ledger</h3>
      <p>
        <b>Unbalanced journals:</b> {data.unbalanced_journals}
      </p>
      {data.unbalanced_journals > 0 && (
        <p style={{ color: "crimson", fontWeight: "bold" }}>
          🚨 URGENT: Journaux déséquilibrés
        </p>
      )}
    </div>
  );
}
