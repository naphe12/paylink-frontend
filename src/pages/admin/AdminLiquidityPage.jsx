import { useEffect, useState } from "react";

async function api(url) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export default function AdminLiquidityPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/admin/dashboard/summary")
      .then(setSummary)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Liquidity & System Health</h2>
        <div style={{ color: "#b91c1c" }}>Erreur de chargement: {error}</div>
      </div>
    );
  }

  if (!summary) return <div style={{ padding: 20 }}>Loading...</div>;

  const liquidity = summary.liquidity || {
    TREASURY_BIF: null,
    TREASURY_USDC: null,
    TREASURY_USDT: null,
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Liquidity & System Health</h2>

      <div style={{ display: "flex", gap: 12 }}>
        <Card title="TREASURY_BIF" value={liquidity.TREASURY_BIF} />
        <Card title="TREASURY_USDC" value={liquidity.TREASURY_USDC} />
        <Card title="TREASURY_USDT" value={liquidity.TREASURY_USDT} />
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
