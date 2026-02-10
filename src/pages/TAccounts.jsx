import { useEffect, useState } from "react";

export default function TAccounts() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch("/backoffice/ledger/t-accounts", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Ledger – T-Accounts</h2>
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
