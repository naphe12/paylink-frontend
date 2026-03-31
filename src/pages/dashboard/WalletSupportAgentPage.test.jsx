import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WalletSupportAgentPage from "@/pages/dashboard/WalletSupportAgentPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WalletSupportAgentPage />
    </MemoryRouter>
  );
}

describe("WalletSupportAgentPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("role", "user");
    api.post.mockReset();
  });

  it("replays a backend suggestion when clicked", async () => {
    api.post.mockImplementation(async (_url, payload) => {
      const message = String(payload?.message || "");
      if (message === "pourquoi mon retrait est bloque") {
        return {
          status: "INFO",
          message: "Le retrait semble bloque par une contrainte de compte.",
          suggestions: ["verifie si un retrait cash est encore en attente"],
          summary: {
            next_step: "verifier le retrait cash en attente",
            eta_hint: "Sous 24 heures",
          },
        };
      }
      if (message === "verifie si un retrait cash est encore en attente") {
        return {
          status: "INFO",
          message: "Je vois un retrait cash en attente de validation.",
          suggestions: [],
          summary: {
            next_step: "attendre la validation operateur",
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

    fireEvent.click(screen.getByRole("button", { name: "pourquoi mon retrait est bloque" }));

    expect(await screen.findByText("Le retrait semble bloque par une contrainte de compte.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "verifie si un retrait cash est encore en attente" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/agent/wallet-support-chat",
        expect.objectContaining({
          message: "verifie si un retrait cash est encore en attente",
        })
      );
    });

    expect(await screen.findByText("Je vois un retrait cash en attente de validation.")).toBeInTheDocument();
  });
});
