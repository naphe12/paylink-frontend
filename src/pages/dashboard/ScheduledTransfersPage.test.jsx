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
  return renderPageAt("/");
}

function renderPageAt(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
          transfer_type: "internal",
          external_transfer: null,
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
          transfer_type: "internal",
          external_transfer: null,
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
        transfer_type: "internal",
        external_transfer: null,
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
    const internalPayload = api.createScheduledTransfer.mock.calls[0][0];
    expect(internalPayload).toMatchObject({
      transfer_type: "internal",
      receiver_identifier: "@bob",
      amount: 25,
      frequency: "weekly",
      note: null,
      remaining_runs: null,
    });
    expect(new Date(internalPayload.next_run_at).toISOString()).toBe(internalPayload.next_run_at);

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
          transfer_type: "internal",
          external_transfer: null,
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
          transfer_type: "internal",
          external_transfer: null,
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
          transfer_type: "internal",
          external_transfer: null,
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

  it("creates an external scheduled transfer", async () => {
    api.listScheduledTransfers
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          schedule_id: "sch-3",
          receiver_identifier: "+25761234567",
          transfer_type: "external",
          external_transfer: {
            partner_name: "Lumicash",
            country_destination: "Burundi",
            recipient_name: "Jean Ndayishimiye",
            recipient_phone: "+25761234567",
            recipient_email: "jean@example.com",
          },
          amount: 125,
          currency_code: "EUR",
          frequency: "monthly",
          status: "active",
          next_run_at: "2026-04-08T08:00:00Z",
          last_result: null,
          is_due: false,
        },
      ]);
    api.createScheduledTransfer.mockResolvedValue({});

    renderPage();

    fireEvent.change(screen.getByLabelText(/Type de transfert programme/i), {
      target: { value: "external" },
    });
    fireEvent.change(screen.getByLabelText(/Nom beneficiaire externe/i), {
      target: { value: "Jean Ndayishimiye" },
    });
    fireEvent.change(screen.getByLabelText(/Telephone beneficiaire externe/i), {
      target: { value: "+25761234567" },
    });
    fireEvent.change(screen.getByLabelText(/Pays de destination externe/i), {
      target: { value: "Burundi" },
    });
    fireEvent.change(screen.getByLabelText(/Partenaire externe/i), {
      target: { value: "Lumicash" },
    });
    fireEvent.change(screen.getByLabelText(/Email beneficiaire externe/i), {
      target: { value: "jean@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Montant programme/i), {
      target: { value: "125" },
    });
    fireEvent.change(screen.getByLabelText(/Frequence programmee/i), {
      target: { value: "monthly" },
    });
    fireEvent.change(screen.getByLabelText(/Premiere execution/i), {
      target: { value: "2026-04-08T08:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Programmer le transfert/i }));

    await waitFor(() => {
      expect(api.createScheduledTransfer).toHaveBeenCalled();
    });
    const externalPayload = api.createScheduledTransfer.mock.calls[0][0];
    expect(externalPayload).toMatchObject({
      transfer_type: "external",
      amount: 125,
      frequency: "monthly",
      note: null,
      remaining_runs: null,
      external_transfer: {
        recipient_name: "Jean Ndayishimiye",
        recipient_phone: "+25761234567",
        recipient_email: "jean@example.com",
        country_destination: "Burundi",
        partner_name: "Lumicash",
      },
    });
    expect(new Date(externalPayload.next_run_at).toISOString()).toBe(externalPayload.next_run_at);

    expect(await screen.findByText(/Transfert externe programme cree/i)).toBeInTheDocument();
    expect(await screen.findByText(/Jean Ndayishimiye/i)).toBeInTheDocument();
    expect(await screen.findByText(/Lumicash \| Burundi/i)).toBeInTheDocument();
    expect(await screen.findByText(/Externe \| monthly \| statut: active/i)).toBeInTheDocument();
  });

  it("preselects external transfer type from the menu querystring", async () => {
    api.listScheduledTransfers.mockResolvedValueOnce([]);

    renderPageAt("/dashboard/client/scheduled-transfers?type=external");

    await waitFor(() => {
      expect(screen.getByLabelText(/Type de transfert programme/i)).toHaveValue("external");
    });
    expect(screen.getByLabelText(/Nom beneficiaire externe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telephone beneficiaire externe/i)).toBeInTheDocument();
  });
});
