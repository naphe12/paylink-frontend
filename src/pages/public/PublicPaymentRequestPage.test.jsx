import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PublicPaymentRequestPage from "@/pages/public/PublicPaymentRequestPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getPublicPaymentRequest: vi.fn(),
  },
}));

describe("PublicPaymentRequestPage", () => {
  it("loads and renders a shared payment request", async () => {
    api.getPublicPaymentRequest.mockResolvedValue({
      counterpart_label: "Alpha Shop",
      title: "Commande #42",
      amount: 45,
      currency_code: "USD",
      status: "pending",
      note: "Paiement de test",
      due_at: null,
      expires_at: "2026-04-06T12:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/pay/request/PR-BIZ1"]}>
        <Routes>
          <Route path="/pay/request/:shareToken" element={<PublicPaymentRequestPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Alpha Shop/i)).toBeInTheDocument();
    expect(screen.getByText(/Commande #42/i)).toBeInTheDocument();
    expect(screen.getByText(/Paiement de test/i)).toBeInTheDocument();
    expect(api.getPublicPaymentRequest).toHaveBeenCalledWith("PR-BIZ1");
  });
});
