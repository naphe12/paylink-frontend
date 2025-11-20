// src/pages/HomePage.jsx
import Hero from "../components/Hero";
import WalletCard from "../components/WalletCard";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center px-6 mt-16 animate-fade-in">
      <Hero />
      <WalletCard />
    </div>
  );
}
