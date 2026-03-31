import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EscrowAgentPage from "@/pages/dashboard/EscrowAgentPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <EscrowAgentPage />
    </MemoryRouter>
  );
}

describe("EscrowAgentPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("role", "user");
    api.post.mockReset();
  });

  it("replays an escrow suggestion when clicked", async () => {
    api.post.mockImplementation(async (_url, payload) => {
      const message = String(payload?.message || "");
      if (message === "pourquoi mon escrow est en attente") {
        return {
          status: "INFO",
          message: "L'escrow attend encore la verification operateur.",
          suggestions: ["quelle est la prochaine etape de mon escrow"],
          summary: {
            order_id: "ORD-123",
            status: "PAYOUT_PENDING",
            next_step: "attendre la verification operateur",
            pending_reasons: ["operator_review"],
          },
        };
      }
      if (message === "quelle est la prochaine etape de mon escrow") {
        return {
          status: "INFO",
          message: "La prochaine etape est la validation du payout local.",
          suggestions: [],
          summary: {
            order_id: "ORD-123",
            status: "PAYOUT_PENDING",
            next_step: "validation du payout local",
          },
        };
      }
      return {
        status: "NEED_INFO",
        message: "",
        suggestions: [],
      };
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "pourquoi mon escrow est en attente" }));

    expect(await screen.findByText("L'escrow attend encore la verification operateur.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "quelle est la prochaine etape de mon escrow" })[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/agent/escrow-chat",
        expect.objectContaining({
          message: "quelle est la prochaine etape de mon escrow",
        })
      );
    });

    expect(await screen.findByText("La prochaine etape est la validation du payout local.")).toBeInTheDocument();
  });
});
