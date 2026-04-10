import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminSupportCasesPage from "@/pages/admin/AdminSupportCasesPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminSupportCases: vi.fn(),
    getAdminSupportCaseDetail: vi.fn(),
    assignAdminSupportCase: vi.fn(),
    updateAdminSupportCaseStatus: vi.fn(),
    replyAdminSupportCase: vi.fn(),
    addAdminSupportCaseAttachment: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSupportCasesPage />
    </MemoryRouter>
  );
}

describe("AdminSupportCasesPage", () => {
  beforeEach(() => {
    api.getAdminSupportCases.mockReset();
    api.getAdminSupportCaseDetail.mockReset();
    api.assignAdminSupportCase.mockReset();
    api.updateAdminSupportCaseStatus.mockReset();
    api.replyAdminSupportCase.mockReset();
    api.addAdminSupportCaseAttachment.mockReset();
  });

  it("shows support case detail and allows a status update", async () => {
    api.getAdminSupportCases.mockResolvedValue([
      {
        case_id: "case-admin-1",
        subject: "Incident paiement",
        description: "Le paiement n'arrive pas",
        category: "payment_request",
        status: "open",
        customer_label: "@alice",
        created_at: "2026-04-05T10:00:00Z",
      },
    ]);
    api.getAdminSupportCaseDetail.mockResolvedValue({
      case: {
        case_id: "case-admin-1",
        subject: "Incident paiement",
        description: "Le paiement n'arrive pas",
        category: "payment_request",
        status: "open",
        customer_label: "@alice",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [{ message_id: "msg-1", author_role: "client", body: "Le paiement n'arrive pas", created_at: "2026-04-05T10:01:00Z" }],
      attachments: [],
      events: [{ event_id: "evt-1", event_type: "created", created_at: "2026-04-05T10:00:00Z" }],
    });
    api.updateAdminSupportCaseStatus.mockResolvedValue({
      case: {
        case_id: "case-admin-1",
        subject: "Incident paiement",
        description: "Le paiement n'arrive pas",
        category: "payment_request",
        status: "resolved",
        customer_label: "@alice",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [],
      events: [],
    });

    renderPage();

    expect(await screen.findByText("Support cases")).toBeInTheDocument();
    const updateButton = await screen.findByRole("button", { name: /Mettre a jour/i });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "resolved" } });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateAdminSupportCaseStatus).toHaveBeenCalledWith("case-admin-1", {
        status: "resolved",
        message: "",
      });
    });
  });

  it("assigns a support case to a typed admin id", async () => {
    api.getAdminSupportCases.mockResolvedValue([
      {
        case_id: "case-admin-2",
        subject: "Blocage wallet",
        description: "Le retrait reste pending",
        category: "wallet",
        status: "open",
        customer_label: "@bob",
        created_at: "2026-04-05T10:00:00Z",
      },
    ]);
    api.getAdminSupportCaseDetail.mockResolvedValue({
      case: {
        case_id: "case-admin-2",
        subject: "Blocage wallet",
        description: "Le retrait reste pending",
        category: "wallet",
        status: "open",
        customer_label: "@bob",
        created_at: "2026-04-05T10:00:00Z",
        assigned_to_user_id: null,
      },
      messages: [],
      events: [],
    });
    api.assignAdminSupportCase.mockResolvedValue({
      case: {
        case_id: "case-admin-2",
        subject: "Blocage wallet",
        description: "Le retrait reste pending",
        category: "wallet",
        status: "open",
        customer_label: "@bob",
        created_at: "2026-04-05T10:00:00Z",
        assigned_to_user_id: "admin-uuid-1",
      },
      messages: [],
      events: [],
    });

    renderPage();

    const assignInput = await screen.findByPlaceholderText("UUID admin assigne");
    const assignButton = await screen.findByRole("button", { name: /Assigner/i });
    fireEvent.change(assignInput, { target: { value: "admin-uuid-1" } });
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(api.assignAdminSupportCase).toHaveBeenCalledWith("case-admin-2", {
        assigned_to_user_id: "admin-uuid-1",
      });
    });
  });

  it("adds an attachment from the admin panel", async () => {
    api.getAdminSupportCases.mockResolvedValue([
      {
        case_id: "case-admin-3",
        subject: "KYC incomplet",
        description: "Document a rattacher",
        category: "kyc",
        status: "open",
        customer_label: "@carla",
        created_at: "2026-04-05T10:00:00Z",
      },
    ]);
    api.getAdminSupportCaseDetail.mockResolvedValue({
      case: {
        case_id: "case-admin-3",
        subject: "KYC incomplet",
        description: "Document a rattacher",
        category: "kyc",
        status: "open",
        customer_label: "@carla",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [],
      events: [],
    });
    api.addAdminSupportCaseAttachment.mockResolvedValue({
      case: {
        case_id: "case-admin-3",
        subject: "KYC incomplet",
        description: "Document a rattacher",
        category: "kyc",
        status: "open",
        customer_label: "@carla",
        created_at: "2026-04-05T10:00:00Z",
      },
      messages: [],
      attachments: [
        {
          attachment_id: "att-admin-1",
          file_name: "piece-kyc.pdf",
          storage_key: "proofs/kyc/piece-kyc.pdf",
          file_mime_type: "application/pdf",
          created_at: "2026-04-06T11:00:00Z",
        },
      ],
      events: [],
    });

    renderPage();

    await screen.findAllByText(/KYC incomplet/i);
    fireEvent.change(screen.getByPlaceholderText("Nom de la preuve"), {
      target: { value: "piece-kyc.pdf" },
    });
    fireEvent.change(screen.getByPlaceholderText("Lien ou reference de stockage"), {
      target: { value: "proofs/kyc/piece-kyc.pdf" },
    });
    fireEvent.change(screen.getByPlaceholderText("Type MIME (optionnel)"), {
      target: { value: "application/pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Ajouter$/i }));

    await waitFor(() => {
      expect(api.addAdminSupportCaseAttachment).toHaveBeenCalledWith("case-admin-3", {
        file_name: "piece-kyc.pdf",
        storage_key: "proofs/kyc/piece-kyc.pdf",
        file_mime_type: "application/pdf",
      });
    });
  });
});
