import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import useSessionStorageState from "@/hooks/useSessionStorageState";
import api from "@/services/api";

const PAGE_SIZE = 25;
const STEP_UP_ACTION_OPTIONS = [
  "p2p_dispute_resolve",
  "escrow_refund_request",
  "escrow_refund_confirm",
  "payment_manual_reconcile",
  "payment_status_action",
];

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function sourceTone(source) {
  if (source === "step_up") return "bg-amber-100 text-amber-800";
  if (source === "p2p") return "bg-emerald-100 text-emerald-800";
  if (source === "escrow") return "bg-violet-100 text-violet-800";
  if (source === "payment_intent") return "bg-blue-100 text-blue-800";
  return "bg-sky-100 text-sky-800";
}

function outcomeTone(outcome) {
  const normalized = String(outcome || "").toLowerCase();
  if (normalized === "verified") return "bg-emerald-100 text-emerald-700";
  if (normalized === "denied") return "bg-rose-100 text-rose-700";
  if (normalized === "issued") return "bg-blue-100 text-blue-700";
  if (normalized === "required") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function resolveTargetLink(row) {
  const targetType = String(row?.target_type || "").trim().toLowerCase();
  const targetId = encodeURIComponent(String(row?.target_id || "").trim());
  if (targetType === "p2p_trade" || targetType === "p2p_dispute") {
    return targetId ? `/dashboard/admin/p2p/disputes?target_id=${targetId}` : "/dashboard/admin/p2p/disputes";
  }
  if (targetType === "escrow_order") {
    return targetId ? `/dashboard/admin/escrow?target_id=${targetId}` : "/dashboard/admin/escrow";
  }
  if (targetType === "payment_intent") {
    return targetId ? `/dashboard/admin/payment-intents?target_id=${targetId}` : "/dashboard/admin/payment-intents";
  }
  return "";
}

export default function AdminAuditSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useSessionStorageState("admin_audit_search:q", "");
  const [source, setSource] = useSessionStorageState("admin_audit_search:source", "");
  const [outcome, setOutcome] = useSessionStorageState("admin_audit_search:outcome", "");
  const [action, setAction] = useSessionStorageState("admin_audit_search:action", "");
  const [role, setRole] = useSessionStorageState("admin_audit_search:role", "");
  const [dateFrom, setDateFrom] = useSessionStorageState("admin_audit_search:date_from", "");
  const [dateTo, setDateTo] = useSessionStorageState("admin_audit_search:date_to", "");

  useEffect(() => {
    const urlQ =
      searchParams.get("q") ||
      searchParams.get("target_id") ||
      searchParams.get("request_id") ||
      "";
    const urlSource = searchParams.get("source") || "";
    const urlOutcome = searchParams.get("outcome") || "";
    const urlAction = searchParams.get("action") || "";
    const urlRole = searchParams.get("role") || "";
    const urlDateFrom = searchParams.get("date_from") || "";
    const urlDateTo = searchParams.get("date_to") || "";
    const hasExplicitParams =
      urlQ || urlSource || urlOutcome || urlAction || urlRole || urlDateFrom || urlDateTo;
    if (!hasExplicitParams) return;
    setQuery(urlQ);
    setSource(urlSource);
    setOutcome(urlOutcome);
    setAction(urlAction);
    setRole(urlRole);
    setDateFrom(urlDateFrom);
    setDateTo(urlDateTo);
    setOffset(0);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (source) params.set("source", source);
    if (outcome) params.set("outcome", outcome);
    if (action) params.set("action", action);
    if (role) params.set("role", role);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [query, source, outcome, action, role, dateFrom, dateTo, searchParams, setSearchParams]);

  useEffect(() => {
    setOffset(0);
  }, [query, source, outcome, action, role, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await api.getAdminAuditSearch({
          q: query.trim(),
          source,
          outcome,
          action,
          role,
          date_from: dateFrom,
          date_to: dateTo,
          limit: PAGE_SIZE,
          offset,
        });
        if (!active) return;
        setRows(Array.isArray(payload?.items) ? payload.items : []);
        setTotal(Number(payload?.total || 0));
      } catch (err) {
        if (!active) return;
        setRows([]);
        setTotal(0);
        setError(err?.message || "Chargement audit impossible.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [query, source, outcome, action, role, dateFrom, dateTo, offset]);

  const openDetail = async (row) => {
    setSelectedRow(row);
    setDetailLoading(true);
    setError("");
    try {
      const payload = await api.getAdminAuditSearchDetail(row.source, row.raw_ref);
      setDetail(payload || null);
    } catch (err) {
      setDetail(null);
      setError(err?.message || "Chargement detail audit impossible.");
    } finally {
      setDetailLoading(false);
    }
  };

  const resultLabel = useMemo(() => {
    if (!total) return "0 resultat";
    return `${offset + 1}-${Math.min(offset + rows.length, total)} sur ${total}`;
  }, [offset, rows.length, total]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Audit admin</p>
          <h1 className="text-2xl font-semibold text-slate-900">Recherche globale audit</h1>
          <p className="mt-1 text-sm text-slate-500">
            Correlation audit generique et step-up admin dans une vue unique.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/dashboard/admin/security"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Centre securite
          </Link>
          <Link
            to="/backoffice/audit"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Audit brut
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher user, action, target ou request id"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 xl:col-span-2"
          />
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">Toutes les sources</option>
            <option value="audit">Audit</option>
            <option value="step_up">Step-up</option>
            <option value="p2p">P2P</option>
            <option value="escrow">Escrow</option>
            <option value="payment_intent">Payment intent</option>
          </select>
          <select
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">Tous resultats</option>
            <option value="issued">Emission</option>
            <option value="verified">Valide</option>
            <option value="denied">Refuse</option>
            <option value="required">Requis</option>
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">Tous roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
          </select>
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            list="admin-audit-action-options"
            placeholder="Action exacte"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
          <datalist id="admin-audit-action-options">
            {STEP_UP_ACTION_OPTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-500">
            Date debut
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-500">
            Date fin
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSource("");
              setOutcome("");
              setAction("");
              setRole("");
              setDateFrom("");
              setDateTo("");
              setOffset(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Reinitialiser
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{resultLabel}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Prec.
              </button>
              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={offset + rows.length >= total || loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Suiv.
              </button>
            </div>
          </div>
          {loading ? (
            <div className="py-8 text-sm text-slate-500">Chargement audit...</div>
          ) : !rows.length ? (
            <div className="py-8 text-sm text-slate-500">Aucun evenement pour ce filtre.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Acteur</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Cible</th>
                    <th className="pb-2 pr-4 font-medium">Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.source}-${row.raw_ref}`}
                      onClick={() => openDetail(row)}
                      className={`cursor-pointer border-b last:border-b-0 hover:bg-slate-50 ${
                        selectedRow?.source === row.source && selectedRow?.raw_ref === row.raw_ref
                          ? "bg-slate-50"
                          : ""
                      }`}
                    >
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${sourceTone(row.source)}`}>
                          {row.source}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        <div className="font-medium">{row.actor_full_name || row.actor_email || row.actor_user_id || "-"}</div>
                        <div className="text-xs text-slate-500">{row.actor_role || "-"}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        <div>{row.action || "-"}</div>
                        <div className="text-xs text-slate-500">{row.summary || "-"}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {resolveTargetLink(row) ? (
                          <Link
                            to={resolveTargetLink(row)}
                            className="inline-flex flex-col text-blue-700 hover:text-blue-800 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span>{row.target_type || "-"}</span>
                            <span className="text-xs text-slate-500">{row.target_id || row.request_id || "-"}</span>
                          </Link>
                        ) : (
                          <>
                            <div>{row.target_type || "-"}</div>
                            <div className="text-xs text-slate-500">{row.target_id || row.request_id || "-"}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${outcomeTone(row.outcome)}`}>
                          {row.outcome || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Detail evenement</h2>
              <p className="text-xs text-slate-500">Source brute normalisee par l'ecran global.</p>
            </div>
            {selectedRow ? (
              <button
                type="button"
                onClick={() => openDetail(selectedRow)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Recharger
              </button>
            ) : null}
          </div>
          {!selectedRow ? (
            <p className="mt-4 text-sm text-slate-500">Selectionnez une ligne pour voir le detail complet.</p>
          ) : detailLoading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement detail...</p>
          ) : !detail ? (
            <p className="mt-4 text-sm text-slate-500">Aucun detail disponible.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div><span className="font-semibold text-slate-900">Source:</span> {detail.source}</div>
                <div><span className="font-semibold text-slate-900">Reference brute:</span> {detail.raw_ref}</div>
              </div>
              <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(detail.raw || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
