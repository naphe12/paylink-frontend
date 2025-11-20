import { Navigate } from "react-router-dom";
import { getRoleDashboardPath } from "@/utils/roleRoutes";

export default function RoleDashboardRedirect() {
  const storedRole = localStorage.getItem("role") || "client";
  return <Navigate to={getRoleDashboardPath(storedRole)} replace />;
}
