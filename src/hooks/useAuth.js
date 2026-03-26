import { useEffect, useState } from "react";
import {
  bootstrapAuth,
  getAuthSnapshot,
  logout as logoutSession,
  subscribeAuth,
} from "@/services/authStore";
import { normalizeAppRole } from "@/utils/roleRoutes";

export default function useAuth() {
  const [auth, setAuth] = useState(getAuthSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeAuth(setAuth);
    bootstrapAuth();
    return unsubscribe;
  }, []);

  return {
    user: auth.user,
    role: normalizeAppRole(auth.user?.role || "client"),
    isAuthenticated: Boolean(auth.accessToken && auth.user),
    loading: !auth.bootstrapped,
    logout: logoutSession,
  };
}
