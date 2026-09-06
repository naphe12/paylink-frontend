const validAmount = (value) => value != null && value !== "" && Number.isFinite(Number(value));

export function evolutionRows(rows, { before, after, currency = "currency", fallbackCurrency = "" }) {
  return rows.flatMap((row) => {
    const time = Date.parse(row.occurred_at || row.created_at);
    if (!Number.isFinite(time) || !validAmount(row[before]) || !validAmount(row[after])) return [];
    return [{ time, before: Number(row[before]), after: Number(row[after]), currency: String(row[currency] || fallbackCurrency).trim() }];
  }).sort((a, b) => a.time - b.time);
}

