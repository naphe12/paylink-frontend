import { useEffect, useState } from "react";

export default function P2PAdminTrades() {
  const [trades, setTrades] = useState([]);

  const load = async () => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const res = await fetch("/api/admin/p2p/trades", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTrades(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>P2P Trades</h2>
      <table border="1" width="100%" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Token</th>
            <th>BIF</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.trade_id}>
              <td>{t.trade_id.slice(0, 8)}...</td>
              <td>{t.status}</td>
              <td>
                {t.token_amount} {t.token}
              </td>
              <td>{t.bif_amount}</td>
              <td style={{ color: t.risk_score >= 80 ? "red" : "black" }}>{t.risk_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
