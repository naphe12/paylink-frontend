import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgentOfflineOpsPage from "@/pages/agent/AgentOfflineOpsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listAgentOfflineOperations: vi.fn(),
    searchAgentCashUsers: vi.fn(),
    createAgentOfflineOperation: vi.fn(),
    syncAgentOfflineOperation: vi.fn(),
    syncPendingAgentOfflineOperations: vi.fn(),
    cancelAgentOfflineOperation: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentOfflineOpsPage />
    </MemoryRouter>
  );
}

describe("AgentOfflineOpsPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
  });

  it("queues an offline operation then syncs it", async () => {
    api.listAgentOfflineOperations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          operation_id: "op-1",
          client_label: "Alice Client",
          operation_type: "cash_in",
          amount: 15000,
          currency_code: "BIF",
          offline_reference: "off_ref",
          status: "queued",
          requires_review: true,
          is_stale: true,
          conflict_reason_label: "Le solde client a evolue depuis la capture offline",
          queued_age_minutes: 240,
          snapshot_available: 10000,
          current_available: 7000,
          balance_delta: -3000,
        },
      ])
      .mockResolvedValueOnce([
        {
          operation_id: "op-1",
          client_label: "Alice Client",
          operation_type: "cash_in",
          amount: 15000,
          currency_code: "BIF",
          offline_reference: "off_ref",
          status: "synced",
          requires_review: true,
          is_stale: true,
          conflict_reason_label: "Le solde client a evolue depuis la capture offline",
          queued_age_minutes: 245,
          snapshot_available: 10000,
          current_available: 7000,
          balance_delta: -3000,
        },
      ]);
    api.searchAgentCashUsers.mockResolvedValue([
      { user_id: "u-1", full_name: "Alice Client", phone_e164: "+25770000001" },
    ]);
    api.createAgentOfflineOperation.mockResolvedValue({ operation_id: "op-1" });
    api.syncAgentOfflineOperation.mockResolvedValue({ operation_id: "op-1", status: "synced" });

    renderPage();

    fireEvent.change(screen.getByLabelText(/Recherche client offline/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));

    await screen.findByText(/Alice Client/i);
    fireEvent.click(screen.getByText(/Alice Client/i));

    fireEvent.change(screen.getByLabelText(/Montant offline/i), {
      target: { value: "15000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter a la file offline/i }));

    await waitFor(() => {
      expect(api.createAgentOfflineOperation).toHaveBeenCalledWith({
        client_user_id: "u-1",
        operation_type: "cash_in",
        amount: 15000,
        note: null,
      });
    });

    const syncButtons = await screen.findAllByRole("button", { name: /Synchroniser/i });
    fireEvent.click(syncButtons[syncButtons.length - 1]);

    await waitFor(() => {
      expect(api.syncAgentOfflineOperation).toHaveBeenCalledWith("op-1", { force: false });
    });

    expect((await screen.findAllByText(/A verifier/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Ancienne file/i)).toBeInTheDocument();
    expect(await screen.findByText(/Age file/i)).toBeInTheDocument();
  });
});
