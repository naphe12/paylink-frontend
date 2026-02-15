import { useEffect, useState } from "react";

export default function P2PAdminRisk() {
  const [stats, setStats] = useState(null);

  const load = async () => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const res = await fetch("/api/admin/p2p/risk", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Risk Dashboard</h2>

      <div>Total Trades: {stats.total_trades}</div>
      <div style={{ color: "red" }}>High Risk (≥80): {stats.high_risk_trades}</div>
      <div>Average Risk Score: {Number(stats.average_risk || 0).toFixed(2)}</div>
    </div>
  );
}
