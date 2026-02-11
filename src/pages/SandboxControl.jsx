import { useEffect, useState } from "react";

export default function SandboxControl() {
  const [orders, setOrders] = useState([]);

  async function load() {
    const res = await fetch("/api/escrow/orders?is_sandbox=true", {
      credentials: "include",
    });
    setOrders(await res.json());
  }

  async function action(id, step) {
    await fetch(`/api/escrow/sandbox/orders/${id}/${step}`, {
      method: "POST",
      credentials: "include",
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🧪 Sandbox Control Panel</h2>

      <table width="100%" border="1">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Scenario</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.status}</td>
              <td>{o.sandbox_scenario}</td>
              <td>
                <button onClick={() => action(o.id, "fund")}>Fund</button>
                <button onClick={() => action(o.id, "swap")}>Swap</button>
                <button onClick={() => action(o.id, "payout")}>Payout</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
