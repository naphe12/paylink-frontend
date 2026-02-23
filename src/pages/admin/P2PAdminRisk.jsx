import { useEffect, useState } from "react";
import api from "@/services/api";

export default function P2PAdminRisk() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/api/admin/p2p/risk");
      setStats(data || null);
    } catch (e) {
      setStats(null);
      setError(e?.message || "Impossible de charger le dashboard de risque");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Risk Dashboard</h2>
        <div style={{ color: "#b91c1c" }}>{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Risk Dashboard</h2>
        <div>Aucune donnée disponible.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Risk Dashboard</h2>
      <div>Total Trades: {stats.total_trades ?? 0}</div>
      <div style={{ color: "red" }}>High Risk (>=80): {stats.high_risk_trades ?? 0}</div>
      <div>Average Risk Score: {Number(stats.average_risk || 0).toFixed(2)}</div>
      <button
        type="button"
        onClick={load}
        style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6 }}
      >
        Rafraichir
      </button>
    </div>
  );
}
