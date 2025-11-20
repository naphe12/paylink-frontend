import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const statusColors = {
  completed: "text-emerald-600 bg-emerald-50",
  pending: "text-yellow-600 bg-yellow-50",
  failed: "text-red-600 bg-red-50",
};

export default function AgentHistoryPage() {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    phone: "",
    min_amount: "",
    max_amount: "",
  });
  const [data, setData] = useState({ operations: [], total_commission: 0 });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.getAgentHistory(filters);
      setData(response);
    } catch (err) {
      console.error("Erreur chargement historique agent:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    load();
  };

  const totalOperations = useMemo(
    () => data.operations.length,
    [data.operations]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            📚 Historique des opérations
          </h1>
          <p className="text-sm text-slate-500">
            Suivi détaillé des cash-in / cash-out, filtre par date ou contact.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-xl bg-white shadow border px-4 py-2 text-sm">
            <p className="text-slate-500">Total opérations</p>
            <p className="text-lg font-semibold text-slate-900">
              {totalOperations}
            </p>
          </div>
          <div className="rounded-xl bg-white shadow border px-4 py-2 text-sm">
            <p className="text-slate-500">Commission cumulée</p>
            <p className="text-lg font-semibold text-emerald-600">
              {data.total_commission?.toLocaleString()} BIF
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white border rounded-xl p-4 shadow-sm"
      >
        <div>
          <label className="text-xs uppercase text-slate-500">Du</label>
          <input
            type="date"
            className="input w-full"
            value={filters.date_from}
            onChange={(e) => handleChange("date_from", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Au</label>
          <input
            type="date"
            className="input w-full"
            value={filters.date_to}
            onChange={(e) => handleChange("date_to", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Téléphone</label>
          <input
            type="text"
            className="input w-full"
            placeholder="+2577..."
            value={filters.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">
            Montant min
          </label>
          <input
            type="number"
            className="input w-full"
            value={filters.min_amount}
            onChange={(e) => handleChange("min_amount", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">
            Montant max
          </label>
          <input
            type="number"
            className="input w-full"
            value={filters.max_amount}
            onChange={(e) => handleChange("max_amount", e.target.value)}
          />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => {
              setFilters({
                date_from: "",
                date_to: "",
                phone: "",
                min_amount: "",
                max_amount: "",
              });
              load();
            }}
            className="px-4 py-2 rounded-lg border text-slate-600"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-900 text-white"
          >
            Filtrer
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Opération</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Commission</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data.operations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Aucune opération trouvée.
                </td>
              </tr>
            ) : (
              data.operations.map((op) => (
                <tr key={op.transaction_id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">
                      {op.client_name || "Client"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {op.client_phone || "—"}
                    </div>
                  </td>
                  <td className="p-3 capitalize">{op.direction}</td>
                  <td className="p-3 font-semibold text-slate-900">
                    {op.amount.toLocaleString()} BIF
                  </td>
                  <td className="p-3 text-emerald-600 font-medium">
                    {op.commission.toLocaleString()} BIF
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${statusColors[op.status] || "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {op.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {new Date(op.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
