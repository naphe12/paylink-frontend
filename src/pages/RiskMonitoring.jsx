import { useEffect, useState } from "react";
import api from "@/services/api";

export default function RiskMonitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const summary = await api.get("/backoffice/risk/summary");
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
      <h2>Risk Monitoring</h2>

      {(data.pending_alerts || 0) > 0 && (
        <p style={{ color: "red", fontWeight: "bold" }}>
          {data.pending_alerts} alerts pending
        </p>
      )}

      <h3>High-risk users (score &gt;= 80) - last 7 days</h3>
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>User</th>
            <th>Max score</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {(data.high_users_7d || []).map((u, i) => (
            <tr key={i}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                {u.user_id}
              </td>
              <td>{u.max_score}</td>
              <td>{u.events}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Decisions by stage (24h)</h3>
      <ul>
        {(data.stage_stats_24h || []).map((s, i) => (
          <li key={i}>
            {s.stage} / {s.decision}: {s.count}
          </li>
        ))}
      </ul>
    </div>
  );
}
