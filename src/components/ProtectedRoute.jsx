// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { getRoleDashboardPath } from "@/utils/roleRoutes";
import useAuth from "@/hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) return <div className="p-6 text-sm text-slate-500">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (allowedRoles?.length) {
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    const loweredRole = String(role || "client").toLowerCase();
    if (!normalizedAllowed.includes(loweredRole)) {
      return <Navigate to={getRoleDashboardPath(loweredRole)} replace />;
    }
  }

  return children;
}
