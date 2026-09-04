export default function ServerPagination({ offset, limit, total, count, loading = false, onOffsetChange }) {
  const start = total > 0 ? offset + 1 : 0;
  const end = Math.min(offset + count, total);
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
      <span>{start}-{end} sur {total}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onOffsetChange(Math.max(0, offset - limit))} disabled={offset === 0 || loading} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Précédent</button>
        <button type="button" onClick={() => onOffsetChange(offset + limit)} disabled={offset + count >= total || loading} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Suivant</button>
      </div>
    </nav>
  );
}
