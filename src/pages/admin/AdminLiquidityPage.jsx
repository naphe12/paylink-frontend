import { useEffect, useState } from "react";

async function api(url) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export default function AdminLiquidityPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api("/api/admin/dashboard/summary").then(setSummary);
  }, []);

  if (!summary) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Liquidity & System Health</h2>

      <div style={{ display: "flex", gap: 12 }}>
        <Card title="TREASURY_BIF" value={summary.liquidity.TREASURY_BIF} />
        <Card title="TREASURY_USDC" value={summary.liquidity.TREASURY_USDC} />
        <Card title="TREASURY_USDT" value={summary.liquidity.TREASURY_USDT} />
      </div>

      <h3 style={{ marginTop: 20 }}>Circuit Breakers</h3>
      <div style={{ border: "1px solid #ddd", padding: 12 }}>
        <div>Escrow Breaker: ACTIVE</div>
        <div>Payout Breaker: ACTIVE</div>
        <div>Arbitrage Breaker: ACTIVE</div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, minWidth: 200 }}>
      <div>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value ?? "N/A"}</div>
    </div>
  );
}
