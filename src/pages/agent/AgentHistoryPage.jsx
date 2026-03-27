import { useEffect, useMemo, useState } from "react";
import DirectionBadge from "@/components/DirectionBadge";
import api from "@/services/api";

const statusColors = {
  completed: "text-emerald-600 bg-emerald-50",
  pending: "text-yellow-600 bg-yellow-50",
  failed: "text-red-600 bg-red-50",
};

function getOperationCurrency(operation) {
  return (
    String(
      operation?.currency_code ||
      operation?.currency ||
      operation?.local_currency ||
      ""
    )
      .trim()
      .toUpperCase() || "BIF"
  );
}

function formatAmount(value, currency) {
  return `${Number(value || 0).toLocaleString()} ${currency}`;
}

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

  const applyFilters = (event) => {
    event.preventDefault();
    load();
  };

  const totalOperations = useMemo(() => data.operations.length, [data.operations]);
  const commissionCurrencyLabel = useMemo(() => {
    const currencies = [...new Set(data.operations.map((operation) => getOperationCurrency(operation)))];
    if (!currencies.length) return "BIF";
    if (currencies.length === 1) return currencies[0];
    return "multidevise";
  }, [data.operations]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des operations</h1>
          <p className="text-sm text-slate-500">
            Suivi detaille des cash-in et cash-out, avec la devise reelle de chaque ligne.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-xl border bg-white px-4 py-2 text-sm shadow">
            <p className="text-slate-500">Total operations</p>
            <p className="text-lg font-semibold text-slate-900">{totalOperations}</p>
          </div>
          <div className="rounded-xl border bg-white px-4 py-2 text-sm shadow">
            <p className="text-slate-500">Commission cumulee</p>
            <p className="text-lg font-semibold text-emerald-600">
              {data.total_commission?.toLocaleString()} {commissionCurrencyLabel}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label className="text-xs uppercase text-slate-500">Du</label>
          <input
            type="date"
            className="input w-full"
            value={filters.date_from}
            onChange={(event) => handleChange("date_from", event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Au</label>
          <input
            type="date"
            className="input w-full"
            value={filters.date_to}
            onChange={(event) => handleChange("date_to", event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Telephone</label>
          <input
            type="text"
            className="input w-full"
            placeholder="+2577..."
            value={filters.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Montant min</label>
          <input
            type="number"
            className="input w-full"
            value={filters.min_amount}
            onChange={(event) => handleChange("min_amount", event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Montant max</label>
          <input
            type="number"
            className="input w-full"
            value={filters.max_amount}
            onChange={(event) => handleChange("max_amount", event.target.value)}
          />
        </div>
        <div className="col-span-1 flex justify-end gap-3 md:col-span-2 lg:col-span-5">
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
            className="rounded-lg border px-4 py-2 text-slate-600"
          >
            Reinitialiser
          </button>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Filtrer
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Operation</th>
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
                  Aucune operation trouvee.
                </td>
              </tr>
            ) : (
              data.operations.map((operation) => {
                const currency = getOperationCurrency(operation);
                return (
                  <tr key={operation.transaction_id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{operation.client_name || "Client"}</div>
                      <div className="text-xs text-slate-500">{operation.client_phone || "-"}</div>
                    </td>
                    <td className="p-3">
                      <DirectionBadge value={operation.direction} />
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{formatAmount(operation.amount, currency)}</td>
                    <td className="p-3 font-medium text-emerald-600">{formatAmount(operation.commission, currency)}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          statusColors[operation.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {operation.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{new Date(operation.created_at).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
