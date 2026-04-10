import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString();
const releaseSha =
  process.env.VITE_RELEASE_SHA ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";
const appVersion = process.env.VITE_APP_VERSION || process.env.npm_package_version || "0.0.0";

function manualChunks(id) {
  const normalized = id.replace(/\\/g, "/").toLowerCase();

  if (id.includes("node_modules")) {
    if (normalized.includes("/node_modules/react-router") || normalized.includes("/node_modules/@remix-run/")) {
      return "router";
    }
    if (
      normalized.includes("/node_modules/react/") ||
      normalized.includes("/node_modules/react-dom/") ||
      normalized.includes("/node_modules/scheduler/")
    ) {
      return "react-core";
    }
    if (normalized.includes("/node_modules/@tanstack/")) return "react-query";
    if (normalized.includes("/node_modules/recharts/") || normalized.includes("/node_modules/react-sparklines/")) {
      return "charts";
    }
    if (normalized.includes("/node_modules/ethers/")) return "web3";
    if (normalized.includes("/node_modules/framer-motion/")) return "motion";
    if (
      normalized.includes("/node_modules/html5-qrcode/") ||
      normalized.includes("/node_modules/@yudiel/react-qr-scanner/") ||
      normalized.includes("/node_modules/react-qr-code/") ||
      normalized.includes("/node_modules/qrcode.react/")
    ) {
      return "qr";
    }
    return "vendor";
  }

  if (id.includes("/src/pages/admin/")) {
    if (
      normalized.includes("/admin/security") ||
      normalized.includes("/admin/aml") ||
      normalized.includes("/admin/risk") ||
      normalized.includes("/admin/audit") ||
      normalized.includes("/admin/ai") ||
      normalized.includes("/admin/dispute") ||
      normalized.includes("/admin/interface")
    ) {
      return "admin-risk-pages";
    }
    if (
      normalized.includes("/admin/loan") ||
      normalized.includes("/admin/credit") ||
      normalized.includes("/admin/cash") ||
      normalized.includes("/admin/payment") ||
      normalized.includes("/admin/transfer") ||
      normalized.includes("/admin/financial") ||
      normalized.includes("/admin/liquidity") ||
      normalized.includes("/admin/arbitrage") ||
      normalized.includes("/admin/mobilemoney") ||
      normalized.includes("/admin/balance")
    ) {
      return "admin-finance-pages";
    }
    if (
      normalized.includes("/admin/user") ||
      normalized.includes("/admin/wallet") ||
      normalized.includes("/admin/agent") ||
      normalized.includes("/admin/support") ||
      normalized.includes("/admin/virtual")
    ) {
      return "admin-accounts-pages";
    }
    if (normalized.includes("/admin/p2p")) return "admin-p2p-pages";
    if (normalized.includes("/admin/tontine")) return "admin-tontine-pages";
    if (normalized.includes("/admin/escrow") || normalized.includes("/admin/ledger") || normalized.includes("/admin/onchain")) {
      return "admin-ledger-pages";
    }
    if (normalized.includes("/admin/global") || normalized.includes("/admin/ops")) {
      return "admin-ops-pages";
    }
    return "admin-platform-pages";
  }
  if (id.includes("/src/pages/agent/")) return "agent-pages";
  if (id.includes("/src/pages/p2p/")) return "p2p-pages";
  if (id.includes("/src/pages/tontines/")) return "tontines-pages";
  if (id.includes("/src/pages/dashboard/")) return "client-pages";
  if (id.includes("/src/pages/wallet/") || id.includes("/src/pages/account/") || id.includes("/src/pages/profile/")) return "account-pages";
  if (id.includes("/src/pages/public/") || id.includes("/src/pages/auth/") || id.includes("/src/pages/shared/")) return "public-pages";
  if (id.includes("/src/services/")) return "services";
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    "import.meta.env.VITE_RELEASE_SHA": JSON.stringify(releaseSha),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: "127.0.0.1",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
