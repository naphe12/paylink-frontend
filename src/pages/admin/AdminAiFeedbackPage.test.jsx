import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAiFeedbackPage from "@/pages/admin/AdminAiFeedbackPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminAiAuditLogs: vi.fn(),
    getAdminAiAuditLog: vi.fn(),
    annotateAdminAiAuditLog: vi.fn(),
    applyAdminAiFeedbackSuggestion: vi.fn(),
  },
  getConfiguredApiFallbackUrl: vi.fn(() => ""),
  getConfiguredApiUrl: vi.fn(() => "http://localhost:8000"),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAiFeedbackPage />
    </MemoryRouter>
  );
}

describe("AdminAiFeedbackPage", () => {
  beforeEach(() => {
    api.getAdminAiAuditLogs.mockReset();
    api.getAdminAiAuditLog.mockReset();
    api.annotateAdminAiAuditLog.mockReset();
    api.applyAdminAiFeedbackSuggestion.mockReset();
  });

  it("loads audit logs, detail and applies a suggestion", async () => {
    api.getAdminAiAuditLogs.mockResolvedValue([
      {
        id: "log-1",
        status: "ERROR",
        raw_message: "envoyer 100 a Alexis",
        parsed_intent: { intent: "unknown" },
        error_message: "intent inconnu",
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);
    api.getAdminAiAuditLog
      .mockResolvedValueOnce({
        audit_log: {
          id: "log-1",
          status: "ERROR",
          raw_message: "envoyer 100 a Alexis",
          parsed_intent: { intent: "unknown" },
          resolved_command: null,
          error_message: "intent inconnu",
          user_id: "user-1",
          session_id: "session-1",
        },
        annotation: null,
        suggestions: [
          {
            id: "sug-1",
            suggestion_type: "intent_alias",
            target_key: "transfer.create",
            proposed_value: {
              domain: "intent",
              canonical_value: "transfer.create",
              synonym: "envoyer 100 a alexis",
              language_code: "fr",
            },
            applied: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        audit_log: {
          id: "log-1",
          status: "ERROR",
          raw_message: "envoyer 100 a Alexis",
          parsed_intent: { intent: "unknown" },
          resolved_command: null,
          error_message: "intent inconnu",
          user_id: "user-1",
          session_id: "session-1",
        },
        annotation: null,
        suggestions: [
          {
            id: "sug-1",
            suggestion_type: "intent_alias",
            target_key: "transfer.create",
            proposed_value: {
              domain: "intent",
              canonical_value: "transfer.create",
              synonym: "envoyer 100 a alexis",
              language_code: "fr",
            },
            applied: true,
          },
        ],
      });
    api.applyAdminAiFeedbackSuggestion.mockResolvedValue({ id: "sug-1", applied: true });

    renderPage();

    expect(await screen.findByText("envoyer 100 a Alexis")).toBeInTheDocument();
    expect(await screen.findByText("intent_alias")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /appliquer/i }));

    await waitFor(() => {
      expect(api.applyAdminAiFeedbackSuggestion).toHaveBeenCalledWith("sug-1");
    });

    expect(await screen.findByText("appliquee")).toBeInTheDocument();
  });

  it("submits annotation with parsed JSON entities", async () => {
    api.getAdminAiAuditLogs.mockResolvedValue([
      {
        id: "log-1",
        status: "ERROR",
        raw_message: "envoyer 100 a Alexis",
        parsed_intent: { intent: "unknown" },
        error_message: "intent inconnu",
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);
    api.getAdminAiAuditLog
      .mockResolvedValueOnce({
        audit_log: {
          id: "log-1",
          status: "ERROR",
          raw_message: "envoyer 100 a Alexis",
          parsed_intent: { intent: "unknown" },
          resolved_command: null,
          error_message: "intent inconnu",
          user_id: "user-1",
          session_id: "session-1",
        },
        annotation: null,
        suggestions: [],
      })
      .mockResolvedValueOnce({
        audit_log: {
          id: "log-1",
          status: "ERROR",
          raw_message: "envoyer 100 a Alexis",
          parsed_intent: { intent: "unknown" },
          resolved_command: null,
          error_message: "intent inconnu",
          user_id: "user-1",
          session_id: "session-1",
        },
        annotation: {
          id: "ann-1",
          audit_log_id: "log-1",
          status: "reviewed",
          expected_intent: "transfer.create",
          expected_entities_json: {
            amount: 100,
            partner_name: "Lumicash",
          },
          parser_was_correct: false,
          resolver_was_correct: false,
          final_resolution_notes: "Cas de transfert externe classique.",
        },
        suggestions: [],
      });
    api.annotateAdminAiAuditLog.mockResolvedValue({
      annotation: { id: "ann-1" },
      suggestions: [],
    });

    renderPage();

    expect(await screen.findByText("envoyer 100 a Alexis")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("transfer.create"), {
      target: { value: "transfer.create" },
    });
    fireEvent.change(screen.getByDisplayValue("{}"), {
      target: { value: '{\n  "amount": 100,\n  "partner_name": "Lumicash"\n}' },
    });
    fireEvent.change(screen.getByPlaceholderText("Expliquer le cas ambigu, le bon intent ou la nuance metier utile."), {
      target: { value: "Cas de transfert externe classique." },
    });
    fireEvent.change(screen.getAllByRole("combobox")[2], {
      target: { value: "false" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[3], {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer l'annotation/i }));

    await waitFor(() => {
      expect(api.annotateAdminAiAuditLog).toHaveBeenCalledWith(
        "log-1",
        expect.objectContaining({
          expected_intent: "transfer.create",
          expected_entities_json: {
            amount: 100,
            partner_name: "Lumicash",
          },
          parser_was_correct: false,
          resolver_was_correct: false,
          final_resolution_notes: "Cas de transfert externe classique.",
        })
      );
    });
  });

  it("filters logs by search text and intent", async () => {
    api.getAdminAiAuditLogs.mockResolvedValue([
      {
        id: "log-1",
        status: "DONE",
        raw_message: "quel est mon solde",
        parsed_intent: { intent: "wallet.balance" },
        created_at: "2026-03-29T10:00:00Z",
      },
      {
        id: "log-2",
        status: "ERROR",
        raw_message: "envoyer 100 a Alexis",
        parsed_intent: { intent: "unknown" },
        created_at: "2026-03-29T11:00:00Z",
      },
    ]);
    api.getAdminAiAuditLog.mockResolvedValue({
      audit_log: {
        id: "log-1",
        status: "DONE",
        raw_message: "quel est mon solde",
        parsed_intent: { intent: "wallet.balance" },
        resolved_command: null,
        error_message: null,
        user_id: "user-1",
        session_id: "session-1",
      },
      annotation: null,
      suggestions: [],
    });

    renderPage();

    expect(await screen.findByText("quel est mon solde")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Recherche message, erreur, intent"), {
      target: { value: "solde" },
    });
    expect(screen.getAllByText("quel est mon solde").length).toBeGreaterThan(0);
    expect(screen.queryByText("envoyer 100 a Alexis")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Intent ex: transfer.create"), {
      target: { value: "wallet.balance" },
    });
    expect(screen.getAllByText("quel est mon solde").length).toBeGreaterThan(0);
    expect(screen.queryByText("envoyer 100 a Alexis")).not.toBeInTheDocument();
  });
});
