import { Link } from "react-router-dom";

export default function QuickActions({ title = "Actions rapides", subtitle = "", actions = [] }) {
  if (!actions.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={`${action.to}-${action.label}`}
              to={action.to}
              className={`group rounded-2xl border px-4 py-4 transition hover:shadow-sm ${action.className || "border-slate-200 bg-slate-50 hover:bg-white"}`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-800 shadow-sm">
                  {Icon ? <Icon size={18} /> : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{action.label}</p>
                  {action.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{action.description}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
