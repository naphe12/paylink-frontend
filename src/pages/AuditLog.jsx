import { useEffect, useState } from "react";

export default function AuditLog() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch("/backoffice/audit?limit=200", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🧾 Audit Log</h2>

      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Role</th>
            <th>Entity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.action}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                {r.actor_user_id || "-"}
              </td>
              <td>{r.actor_role || "-"}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                {r.entity_type}:{r.entity_id || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
