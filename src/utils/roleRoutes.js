const ROLE_DASHBOARD_PATHS = {
  client: "/dashboard/client/wallet",
  agent: "/dashboard/agent/dashboard",
  admin: "/dashboard/admin/users",
};

export const getRoleDashboardPath = (role = "client") => {
  const normalized = (role || "client").toLowerCase();
  return ROLE_DASHBOARD_PATHS[normalized] || ROLE_DASHBOARD_PATHS.client;
};
