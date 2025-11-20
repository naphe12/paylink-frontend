// src/hooks/useAuth.js
import { useEffect, useState } from "react";

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 Vérifie au démarrage
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setLoading(false);

    // 🔹 Surveille les changements de localStorage
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);

    // 🔙 Retour vers HomePage après déconnexion
    window.location.href = "/";
  };

  return { isAuthenticated, logout, loading };
}

