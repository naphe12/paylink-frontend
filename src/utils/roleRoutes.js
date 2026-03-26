export const normalizeAppRole = (role = "client") => {
  const normalized = String(role || "client").toLowerCase();
  if (normalized === "user") return "client";
  return normalized;
};

const ROLE_DASHBOARD_PATHS = {
  client: "/dashboard/client/wallet",
  user: "/dashboard/client/wallet",
  agent: "/dashboard/agent/dashboard",
  admin: "/dashboard/admin/overview",
};

export const getRoleDashboardPath = (role = "client") => {
  const normalized = normalizeAppRole(role);
  return ROLE_DASHBOARD_PATHS[normalized] || ROLE_DASHBOARD_PATHS.client;
};
