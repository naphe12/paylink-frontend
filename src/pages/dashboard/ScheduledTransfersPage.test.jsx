import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ScheduledTransfersPage from "@/pages/dashboard/ScheduledTransfersPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listScheduledTransfers: vi.fn(),
    createScheduledTransfer: vi.fn(),
    runDueScheduledTransfers: vi.fn(),
    runScheduledTransferNow: vi.fn(),
    pauseScheduledTransfer: vi.fn(),
    resumeScheduledTransfer: vi.fn(),
    cancelScheduledTransfer: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ScheduledTransfersPage />
    </MemoryRouter>
  );
}

describe("ScheduledTransfersPage", () => {
  beforeEach(() => {
    api.listScheduledTransfers.mockReset();
    api.createScheduledTransfer.mockReset();
    api.runDueScheduledTransfers.mockReset();
    api.runScheduledTransferNow.mockReset();
    api.pauseScheduledTransfer.mockReset();
    api.resumeScheduledTransfer.mockReset();
    api.cancelScheduledTransfer.mockReset();
  });

  it("creates and executes a scheduled transfer", async () => {
    api.listScheduledTransfers
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-1",
          receiver_identifier: "@bob",
          amount: 25,
          currency_code: "EUR",
          frequency: "weekly",
          status: "active",
          next_run_at: "2026-04-07T10:00:00Z",
          last_result: null,
          is_due: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-1",
          receiver_identifier: "@bob",
          amount: 25,
          currency_code: "EUR",
          frequency: "weekly",
          status: "active",
          next_run_at: "2026-04-14T10:00:00Z",
          last_result: "Execution reussie",
          is_due: false,
        },
      ]);
    api.createScheduledTransfer.mockResolvedValue({});
    api.runDueScheduledTransfers.mockResolvedValue([
      {
        schedule_id: "sch-1",
        receiver_identifier: "@bob",
        amount: 25,
        currency_code: "EUR",
        frequency: "weekly",
        status: "active",
        next_run_at: "2026-04-14T10:00:00Z",
        last_result: "Execution reussie",
        is_due: false,
      },
    ]);
    api.runScheduledTransferNow.mockResolvedValue({});

    renderPage();

    fireEvent.change(screen.getByLabelText(/Destinataire programme/i), {
      target: { value: "@bob" },
    });
    fireEvent.change(screen.getByLabelText(/Montant programme/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Frequence programmee/i), {
      target: { value: "weekly" },
    });
    fireEvent.change(screen.getByLabelText(/Premiere execution/i), {
      target: { value: "2026-04-07T10:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Programmer le transfert/i }));

    await waitFor(() => {
      expect(api.createScheduledTransfer).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Transfert programme cree/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Executer les echeances dues/i }));

    await waitFor(() => {
      expect(api.runDueScheduledTransfers).toHaveBeenCalledWith();
    });

    fireEvent.click(screen.getByRole("button", { name: /Executer maintenant/i }));

    await waitFor(() => {
      expect(api.runScheduledTransferNow).toHaveBeenCalledWith("sch-1");
    });
  });

  it("pauses and resumes a scheduled transfer", async () => {
    api.listScheduledTransfers
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-2",
          receiver_identifier: "@alice",
          amount: 10,
          currency_code: "EUR",
          frequency: "daily",
          status: "active",
          next_run_at: "2026-04-07T08:00:00Z",
          last_result: null,
          is_due: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-2",
          receiver_identifier: "@alice",
          amount: 10,
          currency_code: "EUR",
          frequency: "daily",
          status: "paused",
          next_run_at: "2026-04-07T08:00:00Z",
          last_result: "Mis en pause par l'utilisateur",
          is_due: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-2",
          receiver_identifier: "@alice",
          amount: 10,
          currency_code: "EUR",
          frequency: "daily",
          status: "active",
          next_run_at: "2026-04-07T08:00:00Z",
          last_result: "Repris par l'utilisateur",
          is_due: false,
        },
      ]);
    api.pauseScheduledTransfer.mockResolvedValue({});
    api.resumeScheduledTransfer.mockResolvedValue({});

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Mettre en pause/i }));

    await waitFor(() => {
      expect(api.pauseScheduledTransfer).toHaveBeenCalledWith("sch-2");
    });

    fireEvent.click(await screen.findByRole("button", { name: /Reprendre/i }));

    await waitFor(() => {
      expect(api.resumeScheduledTransfer).toHaveBeenCalledWith("sch-2");
    });
  });
});
