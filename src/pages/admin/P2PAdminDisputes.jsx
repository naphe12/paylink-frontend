import { useEffect, useState } from "react";

export default function P2PAdminDisputes() {
  const [disputes, setDisputes] = useState([]);

  const load = async () => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const res = await fetch("/api/admin/p2p/disputes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setDisputes(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Disputes</h2>
      {disputes.map((d) => (
        <div
          key={d.dispute_id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 10,
            borderRadius: 8,
          }}
        >
          <div>
            <b>Ref:</b> {d.trade_id || d.tx_id}
          </div>
          <div>
            <b>Status:</b> {d.status}
          </div>
          <div>
            <b>Source:</b> {d.source || "p2p"}
          </div>
          <div>
            <b>Reason:</b> {d.reason}
          </div>
        </div>
      ))}
    </div>
  );
}
