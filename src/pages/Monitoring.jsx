import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const summary = await api.get("/backoffice/monitoring/summary");
        if (mounted) {
          setData(summary);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;
  if (!data) return <p style={{ padding: 20 }}>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Monitoring</h2>

      <h3>Orders by status</h3>
      <ul>
        {(data.orders_by_status || []).map((s, i) => (
          <li key={i}>
            {s.status}: {s.count}
          </li>
        ))}
      </ul>

      <h3>Webhooks (24h)</h3>
      <ul>
        {(data.webhooks_24h || []).map((w, i) => (
          <li key={i}>
            {w.status}: {w.count}
          </li>
        ))}
      </ul>

      <h3>Ledger</h3>
      <p>
        <b>Unbalanced journals:</b> {data.unbalanced_journals || 0}
      </p>
      {(data.unbalanced_journals || 0) > 0 && (
        <p style={{ color: "crimson", fontWeight: "bold" }}>
          URGENT: journaux desequilibres
        </p>
      )}
    </div>
  );
}
