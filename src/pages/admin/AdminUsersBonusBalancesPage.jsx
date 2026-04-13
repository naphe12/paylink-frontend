import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, RefreshCcw, Search } from "lucide-react";

import ApiErrorAlert from "@/components/ApiErrorAlert";
import api from "@/services/api";

function formatAmount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminUsersBonusBalancesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    role: "client",
    status: "",
    min_bonus: "0",
  });

  const stats = useMemo(() => {
    const users = rows.length;
    const withBonus = rows.filter((item) => Number(item.bonus_balance || 0) > 0).length;
    const total = rows.reduce((acc, item) => acc + Number(item.bonus_balance || 0), 0);
    return { users, withBonus, total };
  }, [rows]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminUsersBonusBalances({
        q: filters.q.trim() || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        min_bonus: filters.min_bonus || undefined,
        limit: 300,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || "Impossible de charger les soldes bonus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    await load();
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          <Gift size={14} />
          Bonus clients
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Solde bonus par utilisateur</h1>
        <p className="mt-1 text-sm text-slate-500">Vue admin des montants bonus disponibles (BIF) pour les utilisateurs.</p>
      </header>

      <ApiErrorAlert message={error} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recherche</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="Nom, email, telephone"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</span>
            <select
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="client">client</option>
              <option value="">tous</option>
              <option value="agent">agent</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Statut</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="">tous</option>
              <option value="active">active</option>
              <option value="frozen">frozen</option>
              <option value="suspended">suspended</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bonus min (BIF)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.min_bonus}
              onChange={(e) => setFilters((prev) => ({ ...prev, min_bonus: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Rechercher
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={15} />
              Rafraichir
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Utilisateurs affiches</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.users}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avec bonus &gt; 0</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.withBonus}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-amber-700">Total bonus (BIF)</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{formatAmount(stats.total)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-left">Email / Telephone</th>
              <th className="px-4 py-3 text-left">KYC</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-right">Solde bonus</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chargement...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun resultat.</td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.full_name || "Sans nom"}</p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{item.email || "-"}</p>
                    <p className="text-xs text-slate-500">{item.phone || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.kyc_status || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.status || "-"}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatAmount(item.bonus_balance)} {item.bonus_currency || "BIF"}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/admin/users/${item.user_id}`} className="text-sm font-medium text-sky-700 hover:underline">
                      Voir profil
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

