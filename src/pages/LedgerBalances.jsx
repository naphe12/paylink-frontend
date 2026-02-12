import { useEffect, useState } from "react";
import api from "@/services/api";

export default function LedgerBalances() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.get("/backoffice/ledger/balances");
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
      <h2>Ledger - Balances par token</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table width="100%" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Token</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.account_code}</td>
              <td>{r.token}</td>
              <td>{r.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
