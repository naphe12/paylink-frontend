import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaymentPage from "@/pages/dashboard/PaymentPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listPaymentRequests: vi.fn(),
    createPaymentRequest: vi.fn(),
    runDuePaymentRequests: vi.fn(),
    getPaymentRequestDetail: vi.fn(),
    payPaymentRequest: vi.fn(),
    declinePaymentRequest: vi.fn(),
    cancelPaymentRequest: vi.fn(),
    remindPaymentRequest: vi.fn(),
    updatePaymentRequestAutoPay: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentPage />
    </MemoryRouter>
  );
}

describe("PaymentPage", () => {
  beforeEach(() => {
    api.listPaymentRequests.mockReset();
    api.createPaymentRequest.mockReset();
    api.runDuePaymentRequests.mockReset();
    api.getPaymentRequestDetail.mockReset();
    api.payPaymentRequest.mockReset();
    api.declinePaymentRequest.mockReset();
    api.cancelPaymentRequest.mockReset();
    api.remindPaymentRequest.mockReset();
    api.updatePaymentRequestAutoPay.mockReset();
  });

  it("creates a payment request and reloads the sent view", async () => {
    api.listPaymentRequests
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          request_id: "req-1",
          amount: 120,
          currency_code: "EUR",
          status: "pending",
          title: "Loyer",
          note: "Avril",
          share_token: "PR-1",
          created_at: "2026-04-05T10:00:00Z",
          updated_at: "2026-04-05T10:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@bob",
          role: "requester",
        },
      ]);
    api.createPaymentRequest.mockResolvedValue({});
    api.getPaymentRequestDetail.mockResolvedValue({
      request: {
        request_id: "req-1",
        amount: 120,
        currency_code: "EUR",
        status: "pending",
        title: "Loyer",
        note: "Avril",
        share_token: "PR-1",
        created_at: "2026-04-05T10:00:00Z",
        updated_at: "2026-04-05T10:00:00Z",
        requester_user_id: "u-1",
        payer_user_id: "u-2",
        counterpart_label: "@bob",
        role: "requester",
      },
      events: [],
    });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Email, username, paytag ou numero/i), {
      target: { value: "@bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Montant"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByPlaceholderText("Titre"), {
      target: { value: "Loyer" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Creer la demande/i }));

    await waitFor(() => {
      expect(api.createPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          payer_identifier: "@bob",
          amount: 120,
          currency_code: "EUR",
          title: "Loyer",
        })
      );
    });

    expect(await screen.findByText("Demande envoyee a @bob")).toBeInTheDocument();
    expect(await screen.findAllByText("Loyer")).toHaveLength(2);
  });

  it("pays a received request from the detail panel", async () => {
    api.listPaymentRequests
      .mockResolvedValueOnce([
        {
          request_id: "req-2",
          amount: 55,
          currency_code: "EUR",
          status: "pending",
          title: "Courses",
          note: null,
          share_token: "PR-2",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T09:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
        },
      ])
      .mockResolvedValueOnce([
        {
          request_id: "req-2",
          amount: 55,
          currency_code: "EUR",
          status: "paid",
          title: "Courses",
          note: null,
          share_token: "PR-2",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T10:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          paid_at: "2026-04-05T10:00:00Z",
        },
      ]);
    api.getPaymentRequestDetail
      .mockResolvedValueOnce({
        request: {
          request_id: "req-2",
          amount: 55,
          currency_code: "EUR",
          status: "pending",
          title: "Courses",
          note: null,
          share_token: "PR-2",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T09:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
        },
        events: [],
      })
      .mockResolvedValueOnce({
        request: {
          request_id: "req-2",
          amount: 55,
          currency_code: "EUR",
          status: "paid",
          title: "Courses",
          note: null,
          share_token: "PR-2",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T10:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          paid_at: "2026-04-05T10:00:00Z",
        },
        events: [{ event_id: "evt-paid", event_type: "paid", created_at: "2026-04-05T10:00:00Z" }],
      });
    api.payPaymentRequest.mockResolvedValue({});

    renderPage();

    expect(await screen.findAllByText("Courses")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Payer/i }));

    await waitFor(() => {
      expect(api.payPaymentRequest).toHaveBeenCalledWith("req-2", {});
    });

    expect(await screen.findAllByText("Payee")).toHaveLength(2);
  });

  it("runs due maintenance for sent requests", async () => {
    api.listPaymentRequests
      .mockResolvedValueOnce([
        {
          request_id: "req-3",
          amount: 80,
          currency_code: "EUR",
          status: "pending",
          title: "Facture",
          note: "Rappel client",
          share_token: "PR-3",
          created_at: "2026-04-05T08:00:00Z",
          updated_at: "2026-04-05T08:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@client",
          role: "requester",
          due_at: "2026-04-05T09:00:00Z",
          expires_at: "2026-04-07T09:00:00Z",
          is_due: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          request_id: "req-3",
          amount: 80,
          currency_code: "EUR",
          status: "pending",
          title: "Facture",
          note: "Rappel client",
          share_token: "PR-3",
          created_at: "2026-04-05T08:00:00Z",
          updated_at: "2026-04-06T09:30:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@client",
          role: "requester",
          due_at: "2026-04-05T09:00:00Z",
          expires_at: "2026-04-07T09:00:00Z",
          last_reminder_at: "2026-04-06T09:30:00Z",
          is_due: true,
        },
      ]);
    api.getPaymentRequestDetail
      .mockResolvedValueOnce({
        request: {
          request_id: "req-3",
          amount: 80,
          currency_code: "EUR",
          status: "pending",
          title: "Facture",
          note: "Rappel client",
          share_token: "PR-3",
          created_at: "2026-04-05T08:00:00Z",
          updated_at: "2026-04-05T08:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@client",
          role: "requester",
          due_at: "2026-04-05T09:00:00Z",
          expires_at: "2026-04-07T09:00:00Z",
          is_due: true,
        },
        events: [],
      })
      .mockResolvedValueOnce({
        request: {
          request_id: "req-3",
          amount: 80,
          currency_code: "EUR",
          status: "pending",
          title: "Facture",
          note: "Rappel client",
          share_token: "PR-3",
          created_at: "2026-04-05T08:00:00Z",
          updated_at: "2026-04-06T09:30:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@client",
          role: "requester",
          due_at: "2026-04-05T09:00:00Z",
          expires_at: "2026-04-07T09:00:00Z",
          last_reminder_at: "2026-04-06T09:30:00Z",
          is_due: true,
        },
        events: [{ event_id: "evt-reminder", event_type: "reminder_sent", created_at: "2026-04-06T09:30:00Z" }],
      });
    api.runDuePaymentRequests.mockResolvedValue({
      auto_paid_count: 0,
      reminded_count: 1,
      expired_count: 0,
      processed_requests: [
        {
          request_id: "req-3",
          amount: 80,
          currency_code: "EUR",
          status: "pending",
          title: "Facture",
          role: "requester",
          is_due: true,
        },
      ],
    });

    renderPage();

    expect((await screen.findAllByText(/Echeance due/i)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Traiter les echeances dues/i }));

    await waitFor(() => {
      expect(api.runDuePaymentRequests).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/Echeances traitees: 0 auto-paiement\(s\), 1 relance\(s\) automatique\(s\), 0 expiration\(s\)\./i)
    ).toBeInTheDocument();
  });

  it("updates auto-pay from the payer detail panel", async () => {
    api.listPaymentRequests
      .mockResolvedValueOnce([
        {
          request_id: "req-4",
          amount: 90,
          currency_code: "EUR",
          status: "pending",
          title: "Abonnement",
          share_token: "PR-4",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T09:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          auto_pay_enabled: false,
          auto_pay_max_amount: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          request_id: "req-4",
          amount: 90,
          currency_code: "EUR",
          status: "pending",
          title: "Abonnement",
          share_token: "PR-4",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T10:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          auto_pay_enabled: true,
          auto_pay_max_amount: 120,
        },
      ]);
    api.getPaymentRequestDetail
      .mockResolvedValueOnce({
        request: {
          request_id: "req-4",
          amount: 90,
          currency_code: "EUR",
          status: "pending",
          title: "Abonnement",
          share_token: "PR-4",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T09:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          auto_pay_enabled: false,
          auto_pay_max_amount: null,
        },
        events: [],
      })
      .mockResolvedValueOnce({
        request: {
          request_id: "req-4",
          amount: 90,
          currency_code: "EUR",
          status: "pending",
          title: "Abonnement",
          share_token: "PR-4",
          created_at: "2026-04-05T09:00:00Z",
          updated_at: "2026-04-05T10:00:00Z",
          requester_user_id: "u-1",
          payer_user_id: "u-2",
          counterpart_label: "@alice",
          role: "payer",
          auto_pay_enabled: true,
          auto_pay_max_amount: 120,
        },
        events: [{ event_id: "evt-autopay", event_type: "autopay_updated", created_at: "2026-04-05T10:00:00Z" }],
      });
    api.updatePaymentRequestAutoPay.mockResolvedValue({});

    renderPage();

    expect(await screen.findAllByText("Abonnement")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(/Plafond auto-pay detail/i), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Activer \/ mettre a jour/i }));

    await waitFor(() => {
      expect(api.updatePaymentRequestAutoPay).toHaveBeenCalledWith("req-4", { enabled: true, max_amount: 120 });
    });
  });

  it("disables manual reminder when cooldown is active", async () => {
    api.listPaymentRequests.mockResolvedValueOnce([
      {
        request_id: "req-5",
        amount: 42,
        currency_code: "EUR",
        status: "pending",
        title: "Facture eau",
        share_token: "PR-5",
        created_at: "2026-04-05T09:00:00Z",
        updated_at: "2026-04-05T09:30:00Z",
        requester_user_id: "u-1",
        payer_user_id: "u-2",
        counterpart_label: "@client",
        role: "requester",
        manual_reminder_count: 1,
        next_manual_reminder_at: "2026-04-06T18:00:00Z",
        can_send_manual_reminder: false,
      },
    ]);
    api.getPaymentRequestDetail.mockResolvedValueOnce({
      request: {
        request_id: "req-5",
        amount: 42,
        currency_code: "EUR",
        status: "pending",
        title: "Facture eau",
        share_token: "PR-5",
        created_at: "2026-04-05T09:00:00Z",
        updated_at: "2026-04-05T09:30:00Z",
        requester_user_id: "u-1",
        payer_user_id: "u-2",
        counterpart_label: "@client",
        role: "requester",
        manual_reminder_count: 1,
        next_manual_reminder_at: "2026-04-06T18:00:00Z",
        can_send_manual_reminder: false,
      },
      events: [],
    });

    renderPage();

    expect(await screen.findByText(/Facture eau/i)).toBeInTheDocument();
    expect(screen.getByText(/Relance manuelle temporairement indisponible/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Relancer/i })).toBeDisabled();
    expect(api.remindPaymentRequest).not.toHaveBeenCalled();
  });
});
