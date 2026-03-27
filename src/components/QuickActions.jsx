import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";

function normalizeGroups(actions, groups) {
  if (Array.isArray(groups) && groups.length) return groups;
  if (Array.isArray(actions) && actions.length) {
    return [
      {
        key: "actions",
        title: "Actions",
        description: "Raccourcis disponibles.",
        actions,
      },
    ];
  }
  return [];
}

export default function QuickActions({
  title = "Actions rapides",
  subtitle = "",
  actions = [],
  groups = [],
}) {
  const normalizedGroups = useMemo(() => normalizeGroups(actions, groups), [actions, groups]);
  const [activeGroupKey, setActiveGroupKey] = useState(null);

  useEffect(() => {
    if (!normalizedGroups.length) {
      setActiveGroupKey(null);
      return;
    }
    if (!normalizedGroups.some((group) => group.key === activeGroupKey)) {
      setActiveGroupKey(null);
    }
  }, [activeGroupKey, normalizedGroups]);

  if (!normalizedGroups.length) return null;

  const activeGroup = normalizedGroups.find((group) => group.key === activeGroupKey) || null;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {normalizedGroups.map((group) => {
            const Icon = group.icon;
            return (
              <button
                key={group.key || group.title}
                type="button"
                onClick={() => setActiveGroupKey(group.key)}
                className={`group rounded-2xl border px-4 py-4 text-left transition hover:shadow-sm ${group.className || "border-slate-200 bg-slate-50 hover:bg-white"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-slate-800 shadow-sm">
                    {Icon ? <Icon size={19} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                    {group.description ? <p className="mt-1 text-xs text-slate-500">{group.description}</p> : null}
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                      {group.actions?.length || 0} item(s)
                    </p>
                  </div>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeGroup ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 sm:items-center sm:justify-center sm:p-6" onClick={() => setActiveGroupKey(null)}>
          <div
            className="max-h-[85vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Groupe</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{activeGroup.title}</h3>
                {activeGroup.description ? <p className="mt-1 text-sm text-slate-500">{activeGroup.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setActiveGroupKey(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeGroup.actions?.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={`${action.to}-${action.label}`}
                      to={action.to}
                      onClick={() => setActiveGroupKey(null)}
                      className={`group rounded-2xl border px-4 py-4 transition hover:shadow-sm ${action.className || "border-slate-200 bg-slate-50 hover:bg-white"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-slate-800 shadow-sm">
                          {Icon ? <Icon size={18} /> : null}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                          {action.description ? <p className="mt-1 text-xs text-slate-500">{action.description}</p> : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
