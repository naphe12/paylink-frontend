import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SupportCasesPage from "@/pages/dashboard/SupportCasesPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listSupportCases: vi.fn(),
    createSupportCase: vi.fn(),
    getSupportCaseDetail: vi.fn(),
    addSupportCaseMessage: vi.fn(),
    addSupportCaseAttachment: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SupportCasesPage />
    </MemoryRouter>
  );
}

describe("SupportCasesPage", () => {
  beforeEach(() => {
    api.listSupportCases.mockReset();
    api.createSupportCase.mockReset();
    api.getSupportCaseDetail.mockReset();
    api.addSupportCaseMessage.mockReset();
    api.addSupportCaseAttachment.mockReset();
  });

  it("creates a support case and refreshes the list", async () => {
    api.listSupportCases
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          case_id: "case-1",
          subject: "Blocage wallet",
          description: "Mon retrait reste bloque",
          category: "wallet",
          status: "open",
          created_at: "2026-04-05T10:00:00Z",
        },
      ]);
    api.createSupportCase.mockResolvedValue({ case_id: "case-1" });
    api.getSupportCaseDetail.mockResolvedValue({
      case: {
        case_id: "case-1",
        subject: "Blocage wallet",
        description: "Mon retrait reste bloque",
        category: "wallet",
        status: "open",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [],
      events: [],
    });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Sujet"), { target: { value: "Blocage wallet" } });
    fireEvent.change(screen.getByPlaceholderText(/Expliquez le probleme/i), {
      target: { value: "Mon retrait reste bloque" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir le dossier/i }));

    await waitFor(() => {
      expect(api.createSupportCase).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Blocage wallet",
          description: "Mon retrait reste bloque",
        })
      );
    });

    expect(await screen.findAllByText("Blocage wallet")).toHaveLength(2);
  });

  it("adds an attachment to an existing support case", async () => {
    api.listSupportCases.mockResolvedValue([
      {
        case_id: "case-2",
        subject: "Preuve virement",
        description: "Je joins le justificatif",
        category: "wallet",
        status: "open",
        created_at: "2026-04-05T10:00:00Z",
      },
    ]);
    api.getSupportCaseDetail.mockResolvedValue({
      case: {
        case_id: "case-2",
        subject: "Preuve virement",
        description: "Je joins le justificatif",
        category: "wallet",
        status: "open",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [],
      events: [],
    });
    api.addSupportCaseAttachment.mockResolvedValue({
      case: {
        case_id: "case-2",
        subject: "Preuve virement",
        description: "Je joins le justificatif",
        category: "wallet",
        status: "open",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [
        {
          attachment_id: "att-1",
          file_name: "capture.png",
          storage_key: "https://files.example.com/capture.png",
          file_mime_type: "image/png",
          created_at: "2026-04-06T10:00:00Z",
        },
      ],
      events: [],
    });

    renderPage();

    await screen.findAllByText(/Preuve virement/i);
    fireEvent.change(screen.getByPlaceholderText("Nom de la preuve"), {
      target: { value: "capture.png" },
    });
    fireEvent.change(screen.getByPlaceholderText("Lien ou reference de stockage"), {
      target: { value: "https://files.example.com/capture.png" },
    });
    fireEvent.change(screen.getByPlaceholderText("Type MIME (optionnel)"), {
      target: { value: "image/png" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Ajouter$/i }));

    await waitFor(() => {
      expect(api.addSupportCaseAttachment).toHaveBeenCalledWith("case-2", {
        file_name: "capture.png",
        storage_key: "https://files.example.com/capture.png",
        file_mime_type: "image/png",
      });
    });
  });
});
