import { useEffect, useState } from "react";
import api from "@/services/api";

export default function P2PAdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await api.get("/api/admin/p2p/disputes");
      if (Array.isArray(data)) {
        setDisputes(data);
      } else {
        setDisputes([]);
        setError("Format de reponse inattendu pour /api/admin/p2p/disputes");
      }
    } catch (e) {
      setDisputes([]);
      setError(e?.message || "Impossible de charger les disputes");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Disputes</h2>
      {error ? <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div> : null}
      {!error && disputes.length === 0 ? (
        <div style={{ color: "#64748b", marginBottom: 12 }}>
          Aucune dispute retournee par l'API.
        </div>
      ) : null}
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
