import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout({ children }) {
  const location = useLocation();

  // �Y"� Routes o�� le Navbar doit Ǧtre cachǸ
  const hideNavbarRoutes = ["/auth"];
  const isDashboardView = location.pathname.startsWith("/dashboard");

  const showNavbar =
    !hideNavbarRoutes.includes(location.pathname) && !isDashboardView;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#eaf6ff] to-white text-[#0b3b64] font-[Inter] relative overflow-hidden">
      {showNavbar && <Navbar />}

      <main className="flex-1 flex flex-col">{children}</main>

      <Footer />
    </div>
  );
}
