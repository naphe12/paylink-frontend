import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgentBonusTransferPage from "@/pages/agent/AgentBonusTransferPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    searchAgentCashUsers: vi.fn(),
    getAgentBonusUserSummary: vi.fn(),
    sendAgentBonusTransfer: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentBonusTransferPage />
    </MemoryRouter>
  );
}

describe("AgentBonusTransferPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
  });

  it("sends a bonus transfer between two clients", async () => {
    api.searchAgentCashUsers.mockResolvedValue([
      {
        user_id: "user-1",
        full_name: "Alice Client",
        email: "alice@example.com",
        phone_e164: "+25770000001",
      },
      {
        user_id: "user-2",
        full_name: "Bob Client",
        email: "bob@example.com",
        phone_e164: "+25770000002",
      },
    ]);
    api.getAgentBonusUserSummary
      .mockResolvedValueOnce({
        user_id: "user-1",
        full_name: "Alice Client",
        email: "alice@example.com",
        bonus_balance: 6000,
        currency_code: "BIF",
      })
      .mockResolvedValueOnce({
        user_id: "user-1",
        full_name: "Alice Client",
        email: "alice@example.com",
        bonus_balance: 3500,
        currency_code: "BIF",
      });
    api.sendAgentBonusTransfer.mockResolvedValue({
      transfer_id: "tr-1",
      amount_bif: 2500,
      currency_code: "BIF",
      sender_label: "alice@example.com",
      recipient_label: "bob@example.com",
    });

    renderPage();

    await screen.findByText(/Transfert bonus client/i);

    fireEvent.change(screen.getByLabelText(/Client emetteur bonus/i), {
      target: { value: "user-1" },
    });

    await waitFor(() => {
      expect(api.getAgentBonusUserSummary).toHaveBeenCalledWith("user-1");
    });

    fireEvent.change(screen.getByLabelText(/Client destinataire bonus/i), {
      target: { value: "user-2" },
    });
    fireEvent.change(screen.getByLabelText(/Montant bonus agent BIF/i), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer le bonus/i }));

    await waitFor(() => {
      expect(api.sendAgentBonusTransfer).toHaveBeenCalledWith({
        sender_user_id: "user-1",
        recipient_user_id: "user-2",
        amount_bif: 2500,
      });
    });

    expect(await screen.findByText(/Bonus envoye: 2.?500 BIF de alice@example.com vers bob@example.com/i)).toBeInTheDocument();
  });
});
