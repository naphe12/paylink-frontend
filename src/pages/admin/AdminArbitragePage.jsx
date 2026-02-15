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

export default function AdminArbitragePage() {
  const [amount, setAmount] = useState("500");
  const [minProfit, setMinProfit] = useState("2.0");
  const [history, setHistory] = useState([]);

  const execute = async () => {
    const plan = {
      pair: "USDC/USDT",
      amount_usd: amount,
      min_profit_usd: minProfit,
    };

    await api("/api/admin/arbitrage/execute", {
      method: "POST",
      body: JSON.stringify(plan),
    });

    alert("Arbitrage executed");
    loadHistory();
  };

  const loadHistory = async () => {
    const data = await api("/api/admin/audit?filter=ARBITRAGE");
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Arbitrage Control</h2>

      <div style={{ marginBottom: 16 }}>
        <label>Amount (USD)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Min Profit (USD)</label>
        <input value={minProfit} onChange={(e) => setMinProfit(e.target.value)} />
      </div>

      <button onClick={execute}>Execute Arbitrage</button>

      <h3 style={{ marginTop: 30 }}>Execution History</h3>
      <table border="1" cellPadding="8" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, idx) => (
            <tr key={idx}>
              <td>{h.created_at}</td>
              <td>{h.action}</td>
              <td>
                <pre>{JSON.stringify(h.metadata, null, 2)}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
