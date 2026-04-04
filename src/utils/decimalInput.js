export function normalizeDecimalInput(value) {
  return String(value || "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
}

export function parseDecimalInput(value) {
  const normalized = normalizeDecimalInput(value);
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
