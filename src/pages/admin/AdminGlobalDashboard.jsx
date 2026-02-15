import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

async function api(url) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminGlobalDashboard() {
  const [data, setData] = useState(null);
  const [series, setSeries] = useState([]);

  const load = async () => setData(await api("/api/admin/dashboard/summary"));
  const loadSeries = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/admin/dashboard/timeseries?days=14", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setSeries(
      result.map((x) => ({
        ...x,
        day: String(x.day),
        trades_count: Number(x.trades_count),
        hits_count: Number(x.hits_count),
        avg_risk: Number(x.avg_risk),
      }))
    );
  };

  useEffect(() => {
    load();
    loadSeries();
  }, []);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/admin`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "ALERT") {
          alert(`[ALERT] ${msg.subject}\n${msg.message}`);
          load();
          loadSeries();
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="AML Open Cases" value={data.aml_open_cases} />
        <Card title="AML Hits (24h)" value={data.aml_hits_24h} />
        <Card title="High Risk Trades (>=80)" value={data.high_risk_trades} />
        <Card title="Trades (24h)" value={data.total_trades_24h} />
        <Card title="Arbitrage (24h)" value={data.arbitrage_executions_24h} />
      </div>

      <h3 style={{ marginTop: 18 }}>Liquidity (Treasury)</h3>
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div>TREASURY_BIF: {String(data.liquidity.TREASURY_BIF ?? "N/A")}</div>
        <div>TREASURY_USDC: {String(data.liquidity.TREASURY_USDC ?? "N/A")}</div>
        <div>TREASURY_USDT: {String(data.liquidity.TREASURY_USDT ?? "N/A")}</div>
      </div>

      <h3 style={{ marginTop: 22 }}>Activity (14 days)</h3>
      <div style={{ width: "100%", height: 320, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="trades_count" />
            <Line type="monotone" dataKey="hits_count" />
            <Line type="monotone" dataKey="avg_risk" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/dashboard/admin/aml-cases">AML</a>
        <a href="/dashboard/admin/liquidity">Liquidity</a>
        <a href="/dashboard/admin/arbitrage">Arbitrage</a>
        <a href="/dashboard/admin/risk-heatmap">Heatmap</a>
        <a href="/dashboard/admin/kill-switch">Kill Switch</a>
        <a href="/api/admin/reports/aml-cases.pdf" target="_blank" rel="noreferrer">
          Export AML PDF
        </a>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, minWidth: 220 }}>
      <div style={{ color: "#666" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
