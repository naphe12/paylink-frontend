export function toDateSafe(value) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function ageHoursFrom(value, now = Date.now()) {
  const dt = toDateSafe(value);
  if (!dt) return null;
  return Math.max(0, (now - dt.getTime()) / 3600000);
}

export function formatAgeShort(value, now = Date.now()) {
  const hours = ageHoursFrom(value, now);
  if (hours === null) return "-";
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}j`;
}

export function isOlderThanHours(value, thresholdHours, now = Date.now()) {
  const hours = ageHoursFrom(value, now);
  return hours !== null && hours >= thresholdHours;
}
