import { useEffect, useState } from "react";
import api from "@/services/api";

export default function TAccounts() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.get("/backoffice/ledger/t-accounts");
        if (mounted) {
          setRows(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Ledger - T-Accounts</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Date</th>
            <th>Compte</th>
            <th>Direction</th>
            <th>Montant</th>
            <th>Token</th>
            <th>Tx externe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{new Date(r.occurred_at).toLocaleString()}</td>
              <td>{r.account_code}</td>
              <td>{r.direction}</td>
              <td>{r.amount}</td>
              <td>{r.token}</td>
              <td>{r.external_tx_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
