import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPaymentRequestsPage from "@/pages/admin/AdminPaymentRequestsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminPaymentRequests: vi.fn(),
    getAdminPaymentRequestsV2: vi.fn(),
    getAdminPaymentRequestDetailV2: vi.fn(),
    getAdminDebtors: vi.fn(),
    createAdminPaymentRequest: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPaymentRequestsPage />
    </MemoryRouter>
  );
}

describe("AdminPaymentRequestsPage", () => {
  beforeEach(() => {
    api.getAdminPaymentRequests.mockReset();
    api.getAdminPaymentRequestsV2.mockReset();
    api.getAdminPaymentRequestDetailV2.mockReset();
    api.getAdminDebtors.mockReset();
    api.createAdminPaymentRequest.mockReset();
  });

  it("shows product payment requests detail and timeline", async () => {
    api.getAdminPaymentRequests.mockResolvedValue([]);
    api.getAdminDebtors.mockResolvedValue([]);
    api.getAdminPaymentRequestsV2.mockResolvedValue([
      {
        request_id: "req-admin-1",
        amount: 300,
        currency_code: "EUR",
        status: "pending",
        title: "Loyer avril",
        note: "Appartement centre",
        share_token: "PR-ADMIN-1",
        created_at: "2026-04-05T10:00:00Z",
        updated_at: "2026-04-05T10:00:00Z",
        requester_user_id: "u-1",
        payer_user_id: "u-2",
        requester_label: "@alice",
        payer_label: "@bob",
        role: "admin",
      },
    ]);
    api.getAdminPaymentRequestDetailV2.mockResolvedValue({
      request: {
        request_id: "req-admin-1",
        amount: 300,
        currency_code: "EUR",
        status: "pending",
        title: "Loyer avril",
        note: "Appartement centre",
        share_token: "PR-ADMIN-1",
        created_at: "2026-04-05T10:00:00Z",
        updated_at: "2026-04-05T10:00:00Z",
        requester_user_id: "u-1",
        payer_user_id: "u-2",
        requester_label: "@alice",
        payer_label: "@bob",
        role: "admin",
      },
      events: [
        {
          event_id: "evt-1",
          event_type: "sent",
          before_status: "pending",
          after_status: "pending",
          created_at: "2026-04-05T10:05:00Z",
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Demandes produit V2")).toBeInTheDocument();
    expect(await screen.findAllByText("Loyer avril")).toHaveLength(2);
    expect(await screen.findAllByText("@alice → @bob")).toHaveLength(2);
    expect(await screen.findByText("Timeline")).toBeInTheDocument();
    expect(await screen.findByText("Envoi")).toBeInTheDocument();
  });

  it("creates a legacy admin payment request from the debtor picker", async () => {
    api.getAdminPaymentRequests.mockResolvedValue([]);
    api.getAdminPaymentRequestsV2.mockResolvedValue([]);
    api.getAdminPaymentRequestDetailV2.mockResolvedValue({ request: null, events: [] });
    api.getAdminDebtors.mockResolvedValue([
      {
        user_id: "user-debtor-1",
        full_name: "Alice Debtor",
        email: "alice@example.com",
        paytag: "@alice",
        username: "alice",
        credit_limit: 1000,
        credit_used: 450,
        wallet_available: -25,
        wallet_currency: "EUR",
      },
    ]);
    api.createAdminPaymentRequest.mockResolvedValue({ request_id: "legacy-1", status: "pending" });

    renderPage();

    expect(await screen.findByText("Clients en dette (credit ou solde negatif)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pre-remplir/i }));

    fireEvent.change(screen.getByPlaceholderText("Montant"), { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: /^Envoyer$/i }));

    await waitFor(() => {
      expect(api.createAdminPaymentRequest).toHaveBeenCalledWith({
        user_identifier: "user-debtor-1",
        amount: 200,
        reason: "credit",
      });
    });

    expect(await screen.findByText("Demande envoyee.")).toBeInTheDocument();
  });
});
