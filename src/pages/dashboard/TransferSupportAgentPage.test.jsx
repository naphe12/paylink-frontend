import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TransferSupportAgentPage from "@/pages/dashboard/TransferSupportAgentPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <TransferSupportAgentPage />
    </MemoryRouter>
  );
}

describe("TransferSupportAgentPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("role", "user");
    window.localStorage.removeItem("paylink_last_transfer_reference");
    api.post.mockReset();
  });

  it("replays a backend transfer suggestion when clicked", async () => {
    api.post.mockImplementation(async (_url, payload) => {
      const message = String(payload?.message || "");
      if (message === "pourquoi mon transfert est pending") {
        return {
          status: "INFO",
          message: "Le transfert attend une verification operateur.",
          suggestions: ["suis la reference EXT-AB12CD34"],
          summary: {
            reference_code: "EXT-AB12CD34",
            transfer_status: "pending",
            next_step: "attendre la verification operateur",
          },
        };
      }
      if (message === "suis la reference EXT-AB12CD34") {
        return {
          status: "INFO",
          message: "La demande EXT-AB12CD34 est toujours en cours de revue.",
          suggestions: [],
          summary: {
            reference_code: "EXT-AB12CD34",
            transfer_status: "pending",
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

    fireEvent.click(screen.getByRole("button", { name: "pourquoi mon transfert est pending" }));

    expect(await screen.findByText("Le transfert attend une verification operateur.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "suis la reference EXT-AB12CD34" })[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/agent/transfer-support-chat",
        expect.objectContaining({
          message: "suis la reference EXT-AB12CD34",
        })
      );
    });

    expect(await screen.findByText("La demande EXT-AB12CD34 est toujours en cours de revue.")).toBeInTheDocument();
  });
});
