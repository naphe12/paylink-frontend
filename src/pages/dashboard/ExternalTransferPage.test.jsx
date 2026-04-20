import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExternalTransferPage from "@/pages/dashboard/ExternalTransferPage";
import api, { fetchPublicApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    postIdempotent: vi.fn(),
    newIdempotencyKey: vi.fn(),
    getFinancialSummary: vi.fn(),
    getWalletLimits: vi.fn(),
    getMyExternalTransferLimitsInsights: vi.fn(),
    getExchangeRate: vi.fn(),
    simulateClientExternalTransfer: vi.fn(),
  },
  fetchPublicApi: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ExternalTransferPage />
    </MemoryRouter>
  );
}

describe("ExternalTransferPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
    fetchPublicApi.mockReset();

    fetchPublicApi.mockResolvedValue({
      ok: true,
      json: async () => ({
        countries: [{ name: "Burundi", currency_code: "BIF" }],
      }),
    });
    api.get.mockImplementation((path) => {
      if (path === "/wallet/transfer/external/beneficiaries") return Promise.resolve([]);
      if (path === "/wallet/transfer/external/mine?limit=8") return Promise.resolve([]);
      if (path === "/auth/me") {
        return Promise.resolve({
          kyc_status: "verified",
          kyc_tier: 2,
          daily_limit: 5000,
          used_daily: 0,
          monthly_limit: 50000,
          used_monthly: 0,
        });
      }
      return Promise.resolve({});
    });
    api.getFinancialSummary.mockResolvedValue({
      wallet_available: 1000,
      credit_available: 200,
      wallet_currency: "EUR",
      credit_currency: "EUR",
    });
    api.getWalletLimits.mockResolvedValue({
      daily_limit: 5000,
      used_daily: 0,
      monthly_limit: 50000,
      used_monthly: 0,
    });
    api.getMyExternalTransferLimitsInsights.mockResolvedValue({
      limits: {
        current_daily_limit: 5000,
        current_monthly_limit: 50000,
        used_daily: 0,
        used_monthly: 0,
      },
    });
    api.getExchangeRate.mockResolvedValue({ rate: 3000, fees_percent: 5 });
    api.newIdempotencyKey.mockReturnValue("idem-ext-1");
    api.postIdempotent.mockResolvedValue({
      transfer_id: "tr-1",
      reference_code: "EXT-123",
      status: "pending",
    });
  });

  it("shows confirmation note and hides transfer form after successful submit", async () => {
    renderPage();

    await screen.findByRole("heading", { name: /^Transfert externe$/i });

    fireEvent.change(screen.getByPlaceholderText(/Jean Ndayisenga/i), {
      target: { value: "Jean Ndayisenga" },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+257 xx xx xx xx/i), {
      target: { value: "+25761234567" },
    });
    fireEvent.change(screen.getByPlaceholderText("100.00"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer le transfert/i }));

    expect(await screen.findByRole("heading", { name: /Note de paiement/i })).toBeInTheDocument();
    expect(screen.getByText(/note de paiement a ete envoyee par email/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Jean Ndayisenga/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Nouveau transfert/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Jean Ndayisenga/i)).toBeInTheDocument();
    });
  });
});
