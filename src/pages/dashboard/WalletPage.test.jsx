import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WalletPage from "@/pages/dashboard/WalletPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    getWalletBalancesSummary: vi.fn(),
    updateMyDisplayCurrencyPreference: vi.fn(),
    getUsdcWallet: vi.fn(),
    getCryptoWalletBalances: vi.fn(),
    getCryptoDepositInstructions: vi.fn(),
    createCryptoDepositRequest: vi.fn(),
    cancelCryptoDepositRequest: vi.fn(),
  },
}));

vi.mock("@/components/QuickActions", () => ({
  default: () => <div>Quick Actions</div>,
}));

vi.mock("@/components/WalletCard", () => ({
  default: ({ wallet }) => <div>Wallet Card {wallet?.currency_code}</div>,
}));

vi.mock("@/components/wallet/WalletHistoryTable", () => ({
  default: () => <div>Wallet History</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WalletPage />
    </MemoryRouter>
  );
}

describe("WalletPage", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getWalletBalancesSummary.mockReset();
    api.updateMyDisplayCurrencyPreference.mockReset();
    api.getUsdcWallet.mockReset();
    api.getCryptoWalletBalances.mockReset();
    api.getCryptoDepositInstructions.mockReset();
    api.createCryptoDepositRequest.mockReset();
    api.cancelCryptoDepositRequest.mockReset();
  });

  it("shows multi-currency totals and updates display currency", async () => {
    api.get.mockResolvedValue({
      wallet_id: "wallet-1",
      currency_code: "BIF",
      display_currency_code: "BIF",
      available: 250000,
      pending: 1000,
    });
    api.getWalletBalancesSummary
      .mockResolvedValueOnce({
        display_currency: "BIF",
        source: "country_default",
        available_currencies: ["BIF", "EUR", "USD", "USDC", "USDT"],
        estimated_total_available: 278000,
        estimated_total_pending: 1000,
        estimated_currencies_count: 2,
        non_estimated_currencies_count: 0,
        balances: [
          {
            currency_code: "BIF",
            available: 250000,
            pending: 1000,
            estimated_display_available: 250000,
            estimated_display_pending: 1000,
            rate_to_display_currency: 1,
            rate_source: "identity",
            included_in_total: true,
          },
          {
            currency_code: "USDC",
            available: 10,
            pending: 0,
            estimated_display_available: 28000,
            estimated_display_pending: 0,
            rate_to_display_currency: 2800,
            rate_source: "internal_fx_conversion",
            included_in_total: true,
          },
        ],
        generated_at: "2026-04-08T10:00:00Z",
      })
      .mockResolvedValueOnce({
        display_currency: "USD",
        source: "user_preference",
        available_currencies: ["BIF", "EUR", "USD", "USDC", "USDT"],
        estimated_total_available: 100,
        estimated_total_pending: 0.36,
        estimated_currencies_count: 2,
        non_estimated_currencies_count: 0,
        balances: [
          {
            currency_code: "BIF",
            available: 250000,
            pending: 1000,
            estimated_display_available: 89.28,
            estimated_display_pending: 0.36,
            rate_to_display_currency: 0.00035712,
            rate_source: "internal_fx_conversion",
            included_in_total: true,
          },
          {
            currency_code: "USDC",
            available: 10,
            pending: 0,
            estimated_display_available: 10,
            estimated_display_pending: 0,
            rate_to_display_currency: 1,
            rate_source: "identity",
            included_in_total: true,
          },
        ],
        generated_at: "2026-04-08T10:05:00Z",
      });
    api.updateMyDisplayCurrencyPreference.mockResolvedValue({
      display_currency: "USD",
      source: "user_preference",
      available_currencies: ["BIF", "EUR", "USD", "USDC", "USDT"],
    });
    api.getUsdcWallet.mockResolvedValue({ account_code: "USER_USDC", balance: 10 });
    api.getCryptoWalletBalances.mockResolvedValue({ balances: { USDC: 10, USDT: 0 } });
    api.getCryptoDepositInstructions.mockResolvedValue({
      PesaPaid_deposit_address: "0x123",
      active_request: null,
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: /Total estime:/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /278.*BIF/i })).toBeInTheDocument();
    expect(screen.getByText(/1 USDC =/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Devise d'affichage/i), {
      target: { value: "USD" },
    });

    await waitFor(() => {
      expect(api.updateMyDisplayCurrencyPreference).toHaveBeenCalledWith("USD");
    });

    expect(await screen.findByRole("heading", { name: /100.*USD/i })).toBeInTheDocument();
  });
});
