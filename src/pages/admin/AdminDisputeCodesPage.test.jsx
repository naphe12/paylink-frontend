import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDisputeCodesPage from "@/pages/admin/AdminDisputeCodesPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminDisputeCodes: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDisputeCodesPage />
    </MemoryRouter>
  );
}

describe("AdminDisputeCodesPage", () => {
  beforeEach(() => {
    api.getAdminDisputeCodes.mockReset();
  });

  it("renders labeled dispute and proof codes from the admin API", async () => {
    api.getAdminDisputeCodes.mockResolvedValue({
      proof_types: [{ value: "screenshot", label: "Screenshot" }],
      escrow_refund_reason_codes: [{ value: "payout_failed", label: "Payout failed" }],
      escrow_refund_resolution_codes: [{ value: "refund_approved", label: "Refund approved" }],
      p2p_dispute_reason_codes: [{ value: "payment_not_received", label: "Payment not received" }],
      p2p_dispute_resolution_codes: [
        { value: "payment_proof_validated", label: "Payment proof validated" },
      ],
    });

    renderPage();

    expect(await screen.findByText("Codes litiges et preuves")).toBeInTheDocument();
    expect(await screen.findByText("Types de preuve")).toBeInTheDocument();
    expect(await screen.findByText("Screenshot")).toBeInTheDocument();
    expect(await screen.findByText("payout_failed")).toBeInTheDocument();
    expect(await screen.findByText("Payment proof validated")).toBeInTheDocument();
  });
});
