function formatRecentDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function getRecentActivityLabel(user) {
  const type = String(user?.recent_activity_type || "").toLowerCase();
  if (type === "transfer") return "transfert recent";
  if (type === "wallet_operation") return "operation wallet recente";
  if (type === "agent_operation") return "operation agent recente";
  return "";
}

export function buildUserOptionLabel(user, fallback = "Sans nom") {
  const name = user?.full_name || user?.email || fallback;
  const activity = getRecentActivityLabel(user);
  const dateLabel = formatRecentDate(user?.recent_activity_at);
  const suffix = [activity, dateLabel].filter(Boolean).join(" · ");
  return suffix ? `${name} (${suffix})` : name;
}
