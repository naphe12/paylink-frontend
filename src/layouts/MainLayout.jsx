import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout({ children }) {
  const location = useLocation();
  const [env, setEnv] = useState("prod");
  const API_URL = import.meta.env.VITE_API_URL || "";

  const hideNavbarRoutes = ["/auth"];
  const isDashboardView = location.pathname.startsWith("/dashboard");
  const showNavbar =
    !hideNavbarRoutes.includes(location.pathname) && !isDashboardView;

  useEffect(() => {
    let mounted = true;

    async function loadEnv() {
      try {
        const res = await fetch(`${API_URL}/meta/env`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setEnv(String(data?.env || "prod").toLowerCase());
        }
      } catch {
        // Ignore badge fetch errors
      }
    }

    loadEnv();
    return () => {
      mounted = false;
    };
  }, [API_URL]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#eaf6ff] to-white text-[#0b3b64] font-[Inter] relative overflow-hidden">
      {env !== "prod" && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            background: "orange",
            padding: "6px 12px",
            borderRadius: 6,
            fontWeight: "bold",
            zIndex: 9999,
          }}
        >
          ENV: {env.toUpperCase()}
        </div>
      )}
      {showNavbar && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
