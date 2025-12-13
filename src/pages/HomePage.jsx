// src/pages/HomePage.jsx
import Hero from "../components/Hero";
import WalletCard from "../components/WalletCard";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center px-4 sm:px-6 mt-12 sm:mt-16 gap-10 w-full max-w-6xl mx-auto animate-fade-in">
      <Hero />
      <WalletCard />
    </div>
  );
}
