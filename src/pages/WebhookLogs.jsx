import { useEffect, useState } from "react";
import api from "@/services/api";

export default function WebhookLogs() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.get("/backoffice/webhooks?limit=200");
        if (mounted) {
          setRows(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      }
    }
    load();
    const i = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Webhooks</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Tx hash</th>
            <th>Statut</th>
            <th>Tentatives</th>
            <th>Erreur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.event_type}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.tx_hash}</td>
              <td>{r.status}</td>
              <td>{r.attempts}</td>
              <td>{r.error || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
