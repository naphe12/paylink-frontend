import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import P2PAgentPage from "@/pages/dashboard/P2PAgentPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <P2PAgentPage />
    </MemoryRouter>
  );
}

describe("P2PAgentPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("role", "user");
    api.post.mockReset();
  });

  it("replays a p2p suggestion when clicked", async () => {
    api.post.mockImplementation(async (_url, payload) => {
      const message = String(payload?.message || "");
      if (message === "pourquoi mon trade p2p est bloque") {
        return {
          status: "INFO",
          message: "Le trade attend encore la confirmation du vendeur.",
          suggestions: ["qui doit agir maintenant sur mon trade ?"],
          summary: {
            trade_id: "TR-456",
            status: "FIAT_SENT",
            next_step: "attendre la confirmation du vendeur",
            blocked_reasons: ["payment_not_confirmed"],
          },
        };
      }
      if (message === "qui doit agir maintenant sur mon trade ?") {
        return {
          status: "INFO",
          message: "Le vendeur doit maintenant confirmer la reception du paiement.",
          suggestions: [],
          summary: {
            trade_id: "TR-456",
            status: "FIAT_SENT",
            next_step: "confirmation vendeur",
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

    fireEvent.click(screen.getByRole("button", { name: "pourquoi mon trade p2p est bloque" }));

    expect(await screen.findByText("Le trade attend encore la confirmation du vendeur.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "qui doit agir maintenant sur mon trade ?" })[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/agent/p2p-chat",
        expect.objectContaining({
          message: "qui doit agir maintenant sur mon trade ?",
        })
      );
    });

    expect(await screen.findByText("Le vendeur doit maintenant confirmer la reception du paiement.")).toBeInTheDocument();
  });
});
