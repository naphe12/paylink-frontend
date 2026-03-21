import { Navigate } from "react-router-dom";
import { getRoleDashboardPath } from "@/utils/roleRoutes";
import useAuth from "@/hooks/useAuth";

export default function RoleDashboardRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={getRoleDashboardPath(role)} replace />;
}
