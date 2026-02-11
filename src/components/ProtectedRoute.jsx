// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { getRoleDashboardPath } from "@/utils/roleRoutes";

export default function ProtectedRoute({ children, allowedRoles }) {
  const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
  const token =
    rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
  if (!token) return <Navigate to="/auth" replace />;

  if (allowedRoles?.length) {
    const currentRole = localStorage.getItem("role") || "client";
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    const loweredRole = currentRole.toLowerCase();
    if (!normalizedAllowed.includes(loweredRole)) {
      return <Navigate to={getRoleDashboardPath(loweredRole)} replace />;
    }
  }

  return children;
}
