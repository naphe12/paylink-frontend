import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [ops, setOps] = useState(null);
  const [error, setError] = useState(null);
  const [pathPrefix, setPathPrefix] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const suffix = pathPrefix.trim()
          ? `?window_hours=24&path_prefix=${encodeURIComponent(pathPrefix.trim())}`
          : "?window_hours=24";
        const [summary, metrics] = await Promise.all([
          api.get("/backoffice/monitoring/summary"),
          api.get(`/backoffice/monitoring/ops-metrics${suffix}`),
        ]);
        if (mounted) {
          setData(summary);
          setOps(metrics);
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
  }, [pathPrefix]);

  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;
  if (!data) return <p style={{ padding: 20 }}>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Monitoring</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "#475569", marginRight: 8 }}>Path prefix:</label>
        <input
          value={pathPrefix}
          onChange={(e) => setPathPrefix(e.target.value)}
          placeholder="/api/p2p"
          style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}
        />
      </div>
      {ops && (
        <>
          <h3>Ops metrics (24h)</h3>
          <ul>
            <li>API total requests: {ops?.api?.total_requests ?? "-"}</li>
            <li>API erreurs 4xx: {ops?.api?.errors_4xx ?? "-"}</li>
            <li>API erreurs 5xx: {ops?.api?.errors_5xx ?? "-"}</li>
            <li>API taux erreur (%): {ops?.api?.error_rate_percent ?? "-"}</li>
            <li>API latence p50 (ms): {ops?.api?.latency_p50_ms ?? "-"}</li>
            <li>API latence p95 (ms): {ops?.api?.latency_p95_ms ?? "-"}</li>
            <li>Webhooks failed: {ops?.webhooks?.failed ?? 0}</li>
            <li>Webhooks failed retry: {ops?.webhooks?.failed_retry ?? 0}</li>
            <li>Webhook retry queue: {ops?.webhooks?.retry_queue_size ?? 0}</li>
            <li>Idempotency pending keys: {ops?.idempotency?.pending_keys ?? 0}</li>
            <li>External transfer pending: {ops?.external_transfers?.pending ?? 0}</li>
          </ul>
          {ops?.api?.note ? <p style={{ color: "#64748b" }}>{ops.api.note}</p> : null}
        </>
      )}

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
