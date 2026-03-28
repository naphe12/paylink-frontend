import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgentChatPage from "@/pages/dashboard/AgentChatPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getConfiguredApiFallbackUrl: vi.fn(() => ""),
  getConfiguredApiUrl: vi.fn(() => "http://localhost:8000"),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentChatPage />
    </MemoryRouter>
  );
}

describe("AgentChatPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("role", "user");
    api.get.mockReset();
    api.post.mockReset();
  });

  it("confirms a prepared transfer draft", async () => {
    api.post
      .mockResolvedValueOnce({
        status: "CONFIRM",
        message: "Je vais envoyer 100 EUR a Michel. Confirmer ?",
        executable: true,
        data: {
          intent: "external_transfer",
          raw_message: "envoie 100 EUR a Michel",
          amount: "100",
          currency: "EUR",
          recipient: "Michel",
          recipient_phone: "+25761234567",
          partner_name: "Lumicash",
          country_destination: "Burundi",
        },
      })
      .mockResolvedValueOnce({
        status: "DONE",
        message: "Transfert cree.",
        transfer: {
          reference_code: "EXT-123",
          status: "PENDING",
        },
      });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Ex: envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567"),
      {
        target: { value: "envoie 100 EUR a Michel via Lumicash au Burundi au +25761234567" },
      }
    );

    expect(await screen.findByText("Je vais envoyer 100 EUR a Michel. Confirmer ?")).toBeInTheDocument();
    expect(screen.getByText("Proposition de transfert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirmer la demande/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        "/agent/chat/confirm",
        expect.objectContaining({
          draft: expect.objectContaining({
            recipient: "Michel",
            partner_name: "Lumicash",
          }),
        })
      );
    });

    expect(await screen.findByText("Demande creee")).toBeInTheDocument();
    expect(screen.getByText(/Reference : EXT-123/i)).toBeInTheDocument();
  });

  it("sends the selected beneficiary index on confirm", async () => {
    api.post
      .mockResolvedValueOnce({
        status: "CONFIRM",
        message: "Choisis le bon beneficiaire puis confirme.",
        executable: true,
        data: {
          intent: "external_transfer",
          raw_message: "envoie 50 EUR a Alexis",
          amount: "50",
          currency: "EUR",
          recipient: "Alexis",
          beneficiary_candidates: [
            {
              recipient_name: "Alexis",
              partner_name: "Lumicash",
              recipient_phone: "61234567",
            },
            {
              recipient_name: "Alexis",
              partner_name: "Ecocash",
              recipient_phone: "61234567",
              account_ref: "alexis@eco",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        status: "DONE",
        message: "Beneficiaire choisi.",
        transfer: {
          reference_code: "EXT-456",
          status: "PENDING",
        },
      });

    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Ex: envoie 100 EUR a Jean via Lumicash au Burundi au +25761234567"),
      {
        target: { value: "envoie 50 EUR a Alexis" },
      }
    );

    expect(await screen.findByText("Beneficiaires possibles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2\. Alexis/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmer la demande/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        "/agent/chat/confirm",
        expect.objectContaining({
          draft: expect.objectContaining({
            selected_beneficiary_index: 1,
          }),
        })
      );
    });
  });
});
