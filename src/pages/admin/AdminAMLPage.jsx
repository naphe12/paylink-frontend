import { useEffect, useState } from "react";

async function api(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminAMLPage() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const data = await api("/api/admin/aml/cases?status=OPEN");
    setCases(data);
  };

  useEffect(() => {
    load();
  }, []);

  const closeCase = async (caseId) => {
    const resolution = prompt("Resolution message:");
    if (!resolution) return;
    await api(`/api/admin/aml/cases/${caseId}/close`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    });
    load();
  };

  const viewCase = async (caseId) => {
    const data = await api(`/api/admin/aml/cases/${caseId}`);
    setSelected(data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>AML Cases</h2>

      <table border="1" cellPadding="8" style={{ width: "100%", marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>User</th>
            <th>Trade</th>
            <th>Score</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.case_id}>
              <td>{c.case_id}</td>
              <td>{c.user_id}</td>
              <td>{c.trade_id}</td>
              <td>{c.risk_score}</td>
              <td>{c.status}</td>
              <td>
                <button onClick={() => viewCase(c.case_id)}>View</button>
                <button onClick={() => closeCase(c.case_id)}>Close</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <h3>Case Details</h3>
          <pre>{JSON.stringify(selected.case, null, 2)}</pre>
          <h4>Hits</h4>
          <pre>{JSON.stringify(selected.hits, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
