import { useEffect, useState } from "react";
import api from "@/services/api";
import { Loader2, Filter, RefreshCcw } from "lucide-react";

export default function MobileMoneyJournalPage() {
  const [filters, setFilters] = useState({
    status: "",
    direction: "",
    date_from: "",
    date_to: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMobileMoneyJournal(filters);
      setRows(res);
    } catch (err) {
      setError(err.message || "Erreur chargement journal");
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Journal Mobile Money
          </h1>
          <p className="text-sm text-slate-500">
            Historique des cash-in/out Mobile Money, commissions et statuts.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-xl border flex items-center gap-2"
            onClick={() => {
              setFilters({
                status: "",
                direction: "",
                date_from: "",
                date_to: "",
              });
              load();
            }}
          >
            <Filter size={16} /> Réinitialiser
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2"
            onClick={load}
          >
            <RefreshCcw size={16} /> Rafraîchir
          </button>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white border rounded-2xl p-4 shadow-sm"
      >
        <div>
          <label className="text-xs uppercase text-slate-500">Statut</label>
          <select
            className="input w-full"
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">Tous</option>
            <option value="initiated">Initiated</option>
            <option value="pending">Pending</option>
            <option value="succeeded">Succès</option>
            <option value="failed">Échec</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Direction</label>
          <select
            className="input w-full"
            value={filters.direction}
            onChange={(e) => handleChange("direction", e.target.value)}
          >
            <option value="">Tous</option>
            <option value="cashin">Cash-In</option>
            <option value="cashout">Cash-Out</option>
            <option value="mobile_money">Autre</option>
          </select>
        </div>
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
        <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white"
          >
            Appliquer
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Transaction</th>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Commission</th>
              <th className="p-3 text-left">Direction</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  <Loader2 className="animate-spin mr-2 inline" /> Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Aucun mouvement trouvé.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.tx_id} className="border-t">
                  <td className="p-3 font-mono text-slate-700">
                    {row.tx_id.slice(0, 8)}…
                  </td>
                  <td className="p-3">
                    <div>{row.customer?.name || "Client"}</div>
                    <div className="text-xs text-slate-500">
                      {row.customer?.phone || "—"}
                    </div>
                  </td>
                  <td className="p-3 font-semibold">
                    {row.amount.toLocaleString()} {row.currency}
                  </td>
                  <td className="p-3 text-emerald-600">
                    {row.commission.toLocaleString()} BIF
                  </td>
                  <td className="p-3 capitalize">{row.direction}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        row.status === "succeeded"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
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
