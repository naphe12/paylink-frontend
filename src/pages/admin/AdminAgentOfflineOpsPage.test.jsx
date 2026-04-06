import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAgentOfflineOpsPage from "@/pages/admin/AdminAgentOfflineOpsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminAgentOfflineOperations: vi.fn(),
    getAdminAgentOfflineOperationDetail: vi.fn(),
    retryAdminAgentOfflineOperation: vi.fn(),
    cancelAdminAgentOfflineOperation: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAgentOfflineOpsPage />
    </MemoryRouter>
  );
}

describe("AdminAgentOfflineOpsPage", () => {
  beforeEach(() => {
    api.getAdminAgentOfflineOperations.mockReset();
    api.getAdminAgentOfflineOperationDetail.mockReset();
    api.retryAdminAgentOfflineOperation.mockReset();
    api.cancelAdminAgentOfflineOperation.mockReset();
  });

  it("loads offline operations and retries a failed sync", async () => {
    api.getAdminAgentOfflineOperations
      .mockResolvedValueOnce([
        {
          operation_id: "op-1",
          agent_user_id: "agent-user-1",
          agent_id: "agent-1",
          client_user_id: "client-1",
          client_label: "Client Test",
          agent_label: "Agent Marie",
          agent_email: "marie@pesapaid.com",
          agent_phone_e164: "+25770000001",
          client_email: "client@pesapaid.com",
          client_phone_e164: "+25770000002",
          client_paytag: "@client",
          operation_type: "cash_out",
          amount: 25000,
          currency_code: "BIF",
          note: "zone sans reseau",
          offline_reference: "off_ref_1",
          status: "failed",
          failure_reason: "Solde insuffisant pour effectuer ce retrait",
          synced_response: null,
          metadata: {},
          queued_at: "2026-04-06T08:00:00Z",
          synced_at: null,
          created_at: "2026-04-06T08:00:00Z",
          updated_at: "2026-04-06T08:05:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          operation_id: "op-1",
          agent_user_id: "agent-user-1",
          agent_id: "agent-1",
          client_user_id: "client-1",
          client_label: "Client Test",
          agent_label: "Agent Marie",
          agent_email: "marie@pesapaid.com",
          agent_phone_e164: "+25770000001",
          client_email: "client@pesapaid.com",
          client_phone_e164: "+25770000002",
          client_paytag: "@client",
          operation_type: "cash_out",
          amount: 25000,
          currency_code: "BIF",
          note: "zone sans reseau",
          offline_reference: "off_ref_1",
          status: "synced",
          failure_reason: null,
          synced_response: { message: "Cash-out synchronise", new_balance: 5000 },
          metadata: {},
          queued_at: "2026-04-06T08:00:00Z",
          synced_at: "2026-04-06T08:10:00Z",
          created_at: "2026-04-06T08:00:00Z",
          updated_at: "2026-04-06T08:10:00Z",
        },
      ]);
    api.getAdminAgentOfflineOperationDetail
      .mockResolvedValueOnce({
        operation_id: "op-1",
        agent_user_id: "agent-user-1",
        agent_id: "agent-1",
        client_user_id: "client-1",
        client_label: "Client Test",
        agent_label: "Agent Marie",
        agent_email: "marie@pesapaid.com",
        agent_phone_e164: "+25770000001",
        client_email: "client@pesapaid.com",
        client_phone_e164: "+25770000002",
        client_paytag: "@client",
        operation_type: "cash_out",
        amount: 25000,
        currency_code: "BIF",
        note: "zone sans reseau",
        offline_reference: "off_ref_1",
        status: "failed",
        failure_reason: "Solde insuffisant pour effectuer ce retrait",
        synced_response: null,
        metadata: {},
        queued_at: "2026-04-06T08:00:00Z",
        synced_at: null,
        created_at: "2026-04-06T08:00:00Z",
        updated_at: "2026-04-06T08:05:00Z",
      })
      .mockResolvedValueOnce({
        operation_id: "op-1",
        agent_user_id: "agent-user-1",
        agent_id: "agent-1",
        client_user_id: "client-1",
        client_label: "Client Test",
        agent_label: "Agent Marie",
        agent_email: "marie@pesapaid.com",
        agent_phone_e164: "+25770000001",
        client_email: "client@pesapaid.com",
        client_phone_e164: "+25770000002",
        client_paytag: "@client",
        operation_type: "cash_out",
        amount: 25000,
        currency_code: "BIF",
        note: "zone sans reseau",
        offline_reference: "off_ref_1",
        status: "synced",
        failure_reason: null,
        synced_response: { message: "Cash-out synchronise", new_balance: 5000 },
        metadata: {},
        queued_at: "2026-04-06T08:00:00Z",
        synced_at: "2026-04-06T08:10:00Z",
        created_at: "2026-04-06T08:00:00Z",
        updated_at: "2026-04-06T08:10:00Z",
      });
    api.retryAdminAgentOfflineOperation.mockResolvedValue({
      operation_id: "op-1",
      agent_user_id: "agent-user-1",
      agent_id: "agent-1",
      client_user_id: "client-1",
      client_label: "Client Test",
      agent_label: "Agent Marie",
      agent_email: "marie@pesapaid.com",
      agent_phone_e164: "+25770000001",
      client_email: "client@pesapaid.com",
      client_phone_e164: "+25770000002",
      client_paytag: "@client",
      operation_type: "cash_out",
      amount: 25000,
      currency_code: "BIF",
      note: "zone sans reseau",
      offline_reference: "off_ref_1",
      status: "synced",
      failure_reason: null,
      synced_response: { message: "Cash-out synchronise", new_balance: 5000 },
      metadata: {},
      queued_at: "2026-04-06T08:00:00Z",
      synced_at: "2026-04-06T08:10:00Z",
      created_at: "2026-04-06T08:00:00Z",
      updated_at: "2026-04-06T08:10:00Z",
    });

    renderPage();

    expect(await screen.findByText(/Client Test/i)).toBeInTheDocument();
    expect(await screen.findByText(/Motif d'echec/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Relancer/i }));

    await waitFor(() => {
      expect(api.retryAdminAgentOfflineOperation).toHaveBeenCalledWith("op-1");
    });

    expect(await screen.findByText(/Operation offline relancee/i)).toBeInTheDocument();
  });
});
