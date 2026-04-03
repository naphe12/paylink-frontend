import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "@/services/api";
import useSessionStorageState from "@/hooks/useSessionStorageState";

const CORRECTION_SCENARIOS = [
  { id: "credit_available_adjustment", label: "Crediter le disponible", needsAmount: true, needsTarget: false },
  { id: "debit_available_adjustment", label: "Debiter le disponible", needsAmount: true, needsTarget: false },
  { id: "set_available_balance", label: "Fixer le disponible", needsAmount: false, needsTarget: true },
  { id: "restore_full_availability", label: "Restaurer le disponible total", needsAmount: false, needsTarget: false },
];

export default function AdminCreditLinesPage() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [increaseAmount, setIncreaseAmount] = useState("");
  const [decreaseAmount, setDecreaseAmount] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [correctionScenario, setCorrectionScenario] = useState("credit_available_adjustment");
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [correctionTarget, setCorrectionTarget] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionPreview, setCorrectionPreview] = useState(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionApplying, setCorrectionApplying] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialUserId = searchParams.get("user_id") || "";
  const [persistedTargetUserId, setPersistedTargetUserId] = useSessionStorageState(
    "admin-credit-lines:selected-user-id",
    initialUserId
  );
  const targetUserId = initialUserId || persistedTargetUserId;

  useEffect(() => {
    if (initialUserId && initialUserId !== persistedTargetUserId) {
      setPersistedTargetUserId(initialUserId);
    }
  }, [initialUserId, persistedTargetUserId, setPersistedTargetUserId]);

  const loadUsers = async (query = "") => {
    setLoadingUsers(true);
    try {
      const data = await api.getUsers({ q: query, role: "client" });
      const list = Array.isArray(data) ? data : [];
      setUsers((prev) => {
        const merged = [...list];
        prev.forEach((user) => {
          if (!merged.some((item) => item.user_id === user.user_id)) {
            merged.push(user);
          }
        });
        return merged;
      });
    } catch (err) {
      setError(err.message || "Erreur chargement utilisateurs");
    } finally {
      setLoadingUsers(false);
    }
  };

  const ensureSelectedUserLoaded = async (userId) => {
    if (!userId) return;
    if (users.some((user) => user.user_id === userId)) return;
    try {
      const user = await api.getUser(userId);
      if (user?.user_id) {
        setUsers((prev) =>
          prev.some((item) => item.user_id === user.user_id) ? prev : [user, ...prev]
        );
      }
    } catch {
      // Keep the page usable even if the specific user fetch fails.
    }
  };

  const loadLines = async () => {
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      const params = {};
      if (search) params.q = search;
      if (targetUserId) params.user_id = targetUserId;
      const data = await api.listAdminCreditLines(params);
      const list = Array.isArray(data) ? data : [];
      setLines(list);
      setSelectedId((prev) => {
        if (!list.length) return "";
        if (prev && list.some((item) => item.credit_line_id === prev)) return prev;
        return list[0].credit_line_id;
      });
    } catch (err) {
      setError(err.message || "Erreur chargement lignes de credit");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    setActionMsg("");
    try {
      const data = await api.getAdminCreditLineDetail(id);
      setDetail(data);
    } catch (err) {
      setError(err.message || "Erreur chargement du detail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    ensureSelectedUserLoaded(targetUserId);
  }, [targetUserId, users]);

  useEffect(() => {
    loadLines();
  }, [targetUserId]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId]);

  useEffect(() => {
    setCorrectionPreview(null);
    setCorrectionAmount("");
    setCorrectionTarget("");
    setCorrectionReason("");
    setCorrectionNote("");
    setCorrectionScenario("credit_available_adjustment");
  }, [selectedId]);

  const selectedLine = useMemo(
    () => lines.find((line) => line.credit_line_id === selectedId),
    [lines, selectedId]
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === targetUserId) || null,
    [users, targetUserId]
  );
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.phone, user.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  const selectedCorrectionScenario = useMemo(
    () => CORRECTION_SCENARIOS.find((item) => item.id === correctionScenario) || CORRECTION_SCENARIOS[0],
    [correctionScenario]
  );

  const buildCorrectionPayload = () => ({
    credit_line_id: selectedId,
    scenario: correctionScenario,
    ...(selectedCorrectionScenario.needsAmount && correctionAmount !== ""
      ? { amount: Number(correctionAmount) }
      : {}),
    ...(selectedCorrectionScenario.needsTarget && correctionTarget !== ""
      ? { target_available: Number(correctionTarget) }
      : {}),
    reason: correctionReason,
    ...(correctionNote.trim() ? { note: correctionNote.trim() } : {}),
  });

  const increaseLimit = async (e) => {
    e.preventDefault();
    if (!selectedId || !increaseAmount) return;
    setError("");
    setActionMsg("");
    setLoading(true);
    try {
      await api.increaseAdminCreditLine(selectedId, Number(increaseAmount));
      setActionMsg("Ligne de credit augmentee.");
      setIncreaseAmount("");
      await loadLines();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "Echec de l'augmentation");
    } finally {
      setLoading(false);
    }
  };

  const decreaseLimit = async (e) => {
    e.preventDefault();
    if (!selectedId || !decreaseAmount) return;
    setError("");
    setActionMsg("");
    setLoading(true);
    try {
      await api.decreaseAdminCreditLine(selectedId, Number(decreaseAmount));
      setActionMsg("Ligne de credit diminuee.");
      setDecreaseAmount("");
      await loadLines();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "Echec de la diminution");
    } finally {
      setLoading(false);
    }
  };

  const createLine = async (e) => {
    e.preventDefault();
    if (!targetUserId || !createAmount) return;
    setError("");
    setActionMsg("");
    setLoading(true);
    try {
      const data = await api.createAdminCreditLine({
        user_id: targetUserId,
        amount: Number(createAmount),
        currency_code: "EUR",
      });
      setActionMsg("Ligne de credit creee.");
      setCreateAmount("");
      await loadLines();
      setSelectedId(data?.credit_line?.credit_line_id || "");
    } catch (err) {
      setError(err.message || "Echec de creation de la ligne");
    } finally {
      setLoading(false);
    }
  };

  const previewCorrection = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setError("");
    setActionMsg("");
    setCorrectionLoading(true);
    try {
      const data = await api.previewAdminCreditLineCorrection(buildCorrectionPayload());
      setCorrectionPreview(data);
    } catch (err) {
      setCorrectionPreview(null);
      setError(err.message || "Echec de previsualisation de la correction.");
    } finally {
      setCorrectionLoading(false);
    }
  };

  const applyCorrection = async () => {
    if (!correctionPreview?.can_apply) return;
    setError("");
    setActionMsg("");
    setCorrectionApplying(true);
    try {
      await api.applyAdminCreditLineCorrection(buildCorrectionPayload());
      setActionMsg("Disponible de ligne de credit corrige.");
      setCorrectionPreview(null);
      await loadLines();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message || "Echec d'application de la correction.");
    } finally {
      setCorrectionApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lignes de credit</h1>
          <p className="text-sm text-slate-500">
            Augmentez ou diminuez la ligne de credit d&apos;un utilisateur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Rechercher ou filtrer un utilisateur"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={() => loadUsers(userSearch)}
            className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            disabled={loadingUsers}
          >
            {loadingUsers ? "..." : "Rechercher"}
          </button>
          <select
            value={targetUserId}
            onChange={(e) => setPersistedTargetUserId(e.target.value)}
            className="min-w-[280px] rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Choisir un utilisateur</option>
            {filteredUsers.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.full_name || user.email || user.user_id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer nom/email"
            className="rounded-lg border px-3 py-2 text-sm"
            disabled={Boolean(targetUserId)}
          />
          <button
            onClick={loadLines}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            disabled={loading}
          >
            {loading ? "..." : "Appliquer"}
          </button>
          <button
            onClick={() => navigate("/dashboard/admin/credit-lines/repay")}
            className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Aller aux remboursements
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white shadow-sm lg:col-span-1">
          <div className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {selectedUser ? `Utilisateur: ${selectedUser.full_name || selectedUser.email || selectedUser.user_id}` : "Utilisateurs"}
          </div>
          <div className="max-h-[520px] divide-y overflow-y-auto">
            {lines.length === 0 ? (
              <div className="space-y-3 p-4">
                <p className="text-sm text-slate-500">
                  {targetUserId
                    ? "Aucune ligne de credit pour cet utilisateur."
                    : "Aucune ligne trouvee."}
                </p>
                {targetUserId ? (
                  <form onSubmit={createLine} className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={createAmount}
                      onChange={(e) => setCreateAmount(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Montant initial EUR"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {loading ? "..." : "Creer la ligne"}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              lines.map((line) => {
                const active = line.credit_line_id === selectedId;
                return (
                  <button
                    key={line.credit_line_id}
                    onClick={() => setSelectedId(line.credit_line_id)}
                    className={`w-full p-3 text-left transition ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{line.full_name || "Sans nom"}</p>
                        <p className="text-xs text-slate-500">{line.email}</p>
                      </div>
                      <div className="font-mono text-xs text-slate-500">{line.credit_line_id.slice(0, 6)}...</div>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      Restant: {Number(line.outstanding_amount).toLocaleString()} {line.currency_code}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Augmenter la ligne de credit</p>
                  <form onSubmit={increaseLimit} className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={increaseAmount}
                      onChange={(e) => setIncreaseAmount(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Montant"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {loading ? "..." : "Augmenter"}
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Diminuer la ligne de credit</p>
                  <form onSubmit={decreaseLimit} className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={decreaseAmount}
                      onChange={(e) => setDecreaseAmount(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Montant"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {loading ? "..." : "Diminuer"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-slate-800">Correction du disponible</p>
                <form onSubmit={previewCorrection} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      value={correctionScenario}
                      onChange={(e) => setCorrectionScenario(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {CORRECTION_SCENARIOS.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.label}
                        </option>
                      ))}
                    </select>
                    {selectedCorrectionScenario.needsAmount ? (
                      <input
                        type="number"
                        step="0.01"
                        value={correctionAmount}
                        onChange={(e) => setCorrectionAmount(e.target.value)}
                        className="rounded-lg border px-3 py-2 text-sm"
                        placeholder="Montant"
                        required
                      />
                    ) : selectedCorrectionScenario.needsTarget ? (
                      <input
                        type="number"
                        step="0.01"
                        value={correctionTarget}
                        onChange={(e) => setCorrectionTarget(e.target.value)}
                        className="rounded-lg border px-3 py-2 text-sm"
                        placeholder="Disponible cible"
                        required
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-slate-500">
                        Aucun montant requis pour ce scenario
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Motif de correction"
                    required
                  />
                  <input
                    type="text"
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Note optionnelle"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={correctionLoading}
                      className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {correctionLoading ? "..." : "Previsualiser"}
                    </button>
                    <button
                      type="button"
                      onClick={applyCorrection}
                      disabled={!correctionPreview?.can_apply || correctionApplying}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {correctionApplying ? "..." : "Appliquer la correction"}
                    </button>
                  </div>
                </form>

                {correctionPreview ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-900">Previsualisation</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <p className="text-slate-700">
                        Delta: {Number(correctionPreview.signed_delta || 0).toLocaleString()} {correctionPreview.currency_code}
                      </p>
                      <p className="text-slate-700">
                        Disponible: {Number(correctionPreview.credit_available_before || 0).toLocaleString()} -> {Number(correctionPreview.credit_available_after || 0).toLocaleString()} {correctionPreview.currency_code}
                      </p>
                      <p className="text-slate-700">
                        Utilise: {Number(correctionPreview.credit_used_before || 0).toLocaleString()} -> {Number(correctionPreview.credit_used_after || 0).toLocaleString()} {correctionPreview.currency_code}
                      </p>
                      <p className="text-slate-700">
                        Scenario: {correctionPreview.scenario}
                      </p>
                    </div>
                    {Array.isArray(correctionPreview.warnings) && correctionPreview.warnings.length > 0 ? (
                      <div className="mt-3 space-y-1 text-amber-700">
                        {correctionPreview.warnings.map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {actionMsg && <p className="text-sm text-green-600">{actionMsg}</p>}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Montant initial" value={detail.credit_line.initial_amount} currency={detail.credit_line.currency_code} />
                <StatCard label="Utilise" value={detail.credit_line.used_amount} currency={detail.credit_line.currency_code} />
                <StatCard label="Restant" value={detail.credit_line.outstanding_amount} currency={detail.credit_line.currency_code} />
              </div>

              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Evenements</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Delta montant</th>
                        <th className="p-3 text-left">Ancien restant</th>
                        <th className="p-3 text-left">Nouveau restant</th>
                        <th className="p-3 text-left">Statut</th>
                        <th className="p-3 text-left">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.events.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            Aucun evenement.
                          </td>
                        </tr>
                      ) : (
                        detail.events.map((ev) => {
                          const delta = Number(ev.amount_delta || 0);
                          return (
                            <tr key={ev.event_id} className="border-t">
                              <td className="p-3 text-slate-700">
                                {ev.occurred_at
                                  ? new Date(ev.occurred_at).toLocaleString()
                                  : ev.created_at
                                  ? new Date(ev.created_at).toLocaleString()
                                  : "-"}
                              </td>
                              <td className={`p-3 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {delta >= 0 ? "+" : "-"} {Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ev.currency_code}
                              </td>
                              <td className="p-3 text-slate-700">{ev.old_limit != null ? Number(ev.old_limit).toLocaleString() : "-"}</td>
                              <td className="p-3 text-slate-700">{ev.new_limit != null ? Number(ev.new_limit).toLocaleString() : "-"}</td>
                              <td className="p-3 text-slate-600">{ev.status || "-"}</td>
                              <td className="p-3 text-slate-600">{ev.source || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
              {targetUserId && lines.length === 0
                ? "Creez d'abord une ligne de credit pour cet utilisateur."
                : "Selectionnez un utilisateur dans la liste pour voir le detail."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, currency }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {Number(value || 0).toLocaleString()} {currency}
      </p>
    </div>
  );
}
