import { useEffect, useState } from "react";
import api from "@/services/api";
const API_URL = import.meta.env.VITE_API_URL || "";

export default function EscrowQueue() {
  const [status, setStatus] = useState("FUNDED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, [status]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get(`/backoffice/escrow/orders?status=${encodeURIComponent(status)}`);
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2>Escrow – File de traitement</h2>

      {/* Filtre statut */}
      <div style={styles.filter}>
        <label>Statut : </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="FUNDED">FUNDED</option>
          <option value="SWAPPED">SWAPPED</option>
          <option value="PAYOUT_PENDING">PAYOUT_PENDING</option>
          <option value="PAID_OUT">PAID_OUT</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {/* États */}
      {loading && <p>Chargement…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {/* Tableau */}
      {!loading && !error && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Statut</th>
              <th>USDC</th>
              <th>BIF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" style={styles.empty}>
                  Aucun ordre
                </td>
              </tr>
            )}

            {orders.map((o) => (
              <tr key={o.id}>
                <td style={styles.mono}>{o.id}</td>
                <td>{o.status}</td>
                <td>{o.usdc_expected}</td>
                <td>{o.bif_target}</td>
                <td>
                  <a href={`${API_URL}/backoffice/escrow/orders/${o.id}`} target="_blank" rel="noreferrer">
                    Voir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* Styles inline simples (tu peux remplacer par Tailwind / CSS) */
const styles = {
  container: {
    padding: 20,
  },
  filter: {
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  error: {
    color: "red",
  },
  empty: {
    textAlign: "center",
    padding: 20,
    color: "#777",
  },
};
