import { useEffect, useState } from "react";
import api from "@/services/api";
import { Plus, RefreshCcw, Trash2, Save } from "lucide-react";

const emptyProduct = {
  name: "",
  product_type: "business",
  min_principal: "",
  max_principal: "",
  term_min_months: 1,
  term_max_months: 6,
  apr_percent: 12,
  fee_flat: "",
  fee_percent: "",
  penalty_rate_percent: "",
  grace_days: 0,
  require_documents: false,
};

export default function AdminLoanProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminLoanProducts();
      setProducts(data);
    } catch (err) {
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      ["min_principal", "max_principal", "fee_flat", "fee_percent", "penalty_rate_percent", "apr_percent"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      await api.createAdminLoanProduct(payload);
      setForm(emptyProduct);
      load();
    } catch (err) {
      setError(err.message || "Erreur creation produit.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, key, value) => {
    try {
      await api.updateAdminLoanProduct(id, { [key]: value });
      load();
    } catch (err) {
      alert(err.message || "Erreur maj produit");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce produit ?")) return;
    try {
      await api.deleteAdminLoanProduct(id);
      load();
    } catch (err) {
      alert(err.message || "Erreur suppression");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Microfinance</p>
          <h1 className="text-2xl font-bold text-slate-900">Produits de prêt</h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus size={16} /> Nouveau produit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={form.product_type}
            onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}
          >
            <option value="business">Business</option>
            <option value="consumer">Consumer</option>
          </select>
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            placeholder="APR (%)"
            value={form.apr_percent}
            onChange={(e) => setForm((p) => ({ ...p, apr_percent: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            placeholder="Montant min"
            value={form.min_principal}
            onChange={(e) => setForm((p) => ({ ...p, min_principal: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            placeholder="Montant max"
            value={form.max_principal}
            onChange={(e) => setForm((p) => ({ ...p, max_principal: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="border rounded-lg px-3 py-2"
              placeholder="Duree min"
              value={form.term_min_months}
              onChange={(e) => setForm((p) => ({ ...p, term_min_months: e.target.value }))}
            />
            <input
              type="number"
              className="border rounded-lg px-3 py-2"
              placeholder="Duree max"
              value={form.term_max_months}
              onChange={(e) => setForm((p) => ({ ...p, term_max_months: e.target.value }))}
            />
          </div>
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            placeholder="Frais fixe"
            value={form.fee_flat}
            onChange={(e) => setForm((p) => ({ ...p, fee_flat: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            placeholder="Frais (%)"
            value={form.fee_percent}
            onChange={(e) => setForm((p) => ({ ...p, fee_percent: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2 items-center">
            <input
              type="number"
              className="border rounded-lg px-3 py-2"
              placeholder="Penalty %"
              value={form.penalty_rate_percent}
              onChange={(e) => setForm((p) => ({ ...p, penalty_rate_percent: e.target.value }))}
            />
            <input
              type="number"
              className="border rounded-lg px-3 py-2"
              placeholder="Grace jours"
              value={form.grace_days}
              onChange={(e) => setForm((p) => ({ ...p, grace_days: e.target.value }))}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.require_documents}
                onChange={(e) => setForm((p) => ({ ...p, require_documents: e.target.checked }))}
              />
              Docs requis
            </label>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Envoi..." : "Créer le produit"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Montants</th>
              <th className="px-3 py-2 text-left">Durées</th>
              <th className="px-3 py-2 text-left">APR</th>
              <th className="px-3 py-2 text-left">Pénalité</th>
              <th className="px-3 py-2 text-left">Docs</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-3 py-4 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-3 py-4 text-center text-slate-500">
                  Aucun produit.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.product_id} className="text-slate-700">
                  <td className="px-3 py-2">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      defaultValue={p.name}
                      onBlur={(e) => handleUpdate(p.product_id, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 capitalize">{p.product_type}</td>
                  <td className="px-3 py-2">
                    {p.min_principal} - {p.max_principal}
                  </td>
                  <td className="px-3 py-2">
                    {p.term_min_months} - {p.term_max_months} mois
                  </td>
                  <td className="px-3 py-2">{p.apr_percent}%</td>
                  <td className="px-3 py-2">
                    {p.penalty_rate_percent || 0}% / {p.grace_days}j
                  </td>
                  <td className="px-3 py-2">{p.require_documents ? "Requis" : "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(p.product_id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
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
