import { useEffect, useState } from "react";

export default function LedgerBalances() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch("/backoffice/ledger/balances", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Ledger – Balances par token</h2>
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
