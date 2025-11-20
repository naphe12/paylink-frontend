import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { CheckCircle, XCircle } from "lucide-react";

export default function MobileDepositsReview() {
  const [items, setItems] = useState([]);

  const load = async () => setItems(await api.get("/agent/mobilemoney/pending"));

  const update = async (id, status) => {
    await api.patch(`/agent/mobilemoney/${id}/status`, { status });
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <table className="w-full bg-white rounded-lg shadow">
      <thead className="bg-gray-50">
        <tr>
          <th>Client</th><th>Montant €</th><th>Opérateur</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map(d => (
          <tr key={d.deposit_id} className="border-t">
            <td>{d.user.full_name}</td>
            <td>{d.amount_eur}</td>
            <td>{d.operator}</td>
            <td className="flex gap-2">
              <button onClick={() => update(d.deposit_id, "confirmed")} className="bg-green-600 text-white px-2 py-1 rounded">
                <CheckCircle size={14}/>
              </button>
              <button onClick={() => update(d.deposit_id, "rejected")} className="bg-red-600 text-white px-2 py-1 rounded">
                <XCircle size={14}/>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
