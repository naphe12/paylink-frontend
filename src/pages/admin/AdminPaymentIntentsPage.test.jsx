import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPaymentIntentsPage from "@/pages/admin/AdminPaymentIntentsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminPaymentIntents: vi.fn(),
    getAdminPaymentIntentDetail: vi.fn(),
    getUsers: vi.fn(),
    manualReconcileAdminPaymentIntent: vi.fn(),
    adminPaymentIntentStatusAction: vi.fn(),
    updateAdminOperatorWorkItem: vi.fn(),
    issueAdminStepUp: vi.fn(),
    getAdminStepUpStatus: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPaymentIntentsPage />
    </MemoryRouter>
  );
}

describe("AdminPaymentIntentsPage", () => {
  beforeEach(() => {
    api.getAdminPaymentIntents.mockReset();
    api.getAdminPaymentIntentDetail.mockReset();
    api.getUsers.mockReset();
    api.manualReconcileAdminPaymentIntent.mockReset();
    api.adminPaymentIntentStatusAction.mockReset();
    api.updateAdminOperatorWorkItem.mockReset();
    api.issueAdminStepUp.mockReset();
    api.getAdminStepUpStatus.mockReset();
    api.getAdminStepUpStatus.mockResolvedValue({
      enabled: true,
      token_expires_in_seconds: 300,
      header_fallback_enabled: true,
    });
  });

  it("requests admin step-up and retries manual reconciliation with token", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-1",
        merchant_reference: "PMT-1",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);
    api.getAdminPaymentIntentDetail.mockResolvedValue({
      intent: {
        intent_id: "intent-1",
        merchant_reference: "PMT-1",
        amount: 25000,
        currency_code: "BIF",
        status: "pending_provider",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        target_instructions: {},
        metadata: {},
      },
      events: [
        {
          event_id: "evt-1",
          provider_event_type: "manual_reconcile",
          status: "settled_manual",
          reason_code: "manual_reconciliation",
          created_at: "2026-03-29T10:10:00Z",
          external_event_id: null,
          payload: { step_up_method: "token" },
        },
      ],
    });
    const stepUpError = new Error("step-up required");
    stepUpError.status = 428;
    stepUpError.detail = { code: "admin_step_up_required" };
    api.manualReconcileAdminPaymentIntent
      .mockRejectedValueOnce(stepUpError)
      .mockResolvedValueOnce({
        intent: {
          intent_id: "intent-1",
          merchant_reference: "PMT-1",
          amount: 25000,
          currency_code: "BIF",
          status: "credited",
          user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
          target_instructions: {},
          metadata: {},
        },
        events: [],
      });
    api.issueAdminStepUp.mockResolvedValue({ token: "step-up-token" });

    const promptSpy = vi.spyOn(window, "prompt");
    promptSpy.mockReturnValueOnce("LUMI-REF-1").mockReturnValueOnce("Manual admin note");

    renderPage();

    expect(await screen.findByText("PMT-1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("PMT-1"));
    expect(await screen.findByText("Detail intent")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /crediter manuellement/i }));

    expect(await screen.findByText(/mot de passe admin/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Mot de passe admin"), {
      target: { value: "secret" },
    });
    const passwordInput = screen.getByPlaceholderText("Mot de passe admin");
    expect(passwordInput).toHaveValue("secret");
    const confirmButton = screen
      .getAllByRole("button", { name: /confirmer/i })
      .find((button) => !button.disabled);
    expect(confirmButton).toBeTruthy();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.issueAdminStepUp).toHaveBeenCalledWith({
        password: "secret",
        action: "payment_manual_reconcile",
      });
      expect(api.manualReconcileAdminPaymentIntent).toHaveBeenLastCalledWith(
        "intent-1",
        {
          provider_reference: "LUMI-REF-1",
          note: "Manual admin note",
        },
        "step-up-token"
      );
    });

    promptSpy.mockRestore();
  });

  it("shows the step-up active badge", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/confirmation admin forte active/i)).toBeInTheDocument();
    expect(await screen.findByText(/fallback header encore autorise/i)).toBeInTheDocument();
  });

  it("shows step-up validation method on payment events", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-2",
        merchant_reference: "PMT-2",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "credited",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);
    api.getAdminPaymentIntentDetail.mockResolvedValue({
      intent: {
        intent_id: "intent-2",
        merchant_reference: "PMT-2",
        amount: 25000,
        currency_code: "BIF",
        status: "credited",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        target_instructions: {},
        metadata: {},
      },
      events: [
        {
          event_id: "evt-2",
          provider_event_type: "manual_reconcile",
          status: "settled_manual",
          reason_code: "manual_reconciliation",
          created_at: "2026-03-29T10:10:00Z",
          external_event_id: null,
          payload: { step_up_method: "token" },
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("PMT-2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("PMT-2"));

    expect(await screen.findByText(/validation admin: step-up token/i)).toBeInTheDocument();
  });

  it("filters intents by quick queue view", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-pending",
        merchant_reference: "PMT-PENDING",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        created_at: "2026-03-29T10:00:00Z",
      },
      {
        intent_id: "intent-credited",
        merchant_reference: "PMT-CREDITED",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "credited",
        user: { full_name: "Bob", email: "b@example.com", phone_e164: "+257111" },
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("PMT-PENDING")).toBeInTheDocument();
    expect(screen.getByText("PMT-CREDITED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /actionnables \(1\)/i }));

    expect(screen.getByText("PMT-PENDING")).toBeInTheDocument();
    expect(screen.queryByText("PMT-CREDITED")).not.toBeInTheDocument();
  });

  it("updates operator workflow from payment detail", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-ops",
        merchant_reference: "PMT-OPS",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);
    api.getUsers.mockResolvedValue([]);
    api.getAdminPaymentIntentDetail.mockResolvedValue({
      intent: {
        intent_id: "intent-ops",
        merchant_reference: "PMT-OPS",
        amount: 25000,
        currency_code: "BIF",
        status: "pending_provider",
        provider_channel: "Lumicash",
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        target_instructions: {},
        metadata: {},
        operator_workflow: {
          operator_status: "needs_follow_up",
          owner_name: "Desk Payments",
        },
      },
      events: [],
    });
    api.updateAdminOperatorWorkItem.mockResolvedValue({
      entity_type: "payment_intent",
      entity_id: "intent-ops",
      operator_status: "needs_follow_up",
    });

    renderPage();

    expect(await screen.findByText("PMT-OPS")).toBeInTheDocument();
    fireEvent.click(screen.getByText("PMT-OPS"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer le workflow" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le workflow" }));

    await waitFor(() => {
      expect(api.updateAdminOperatorWorkItem).toHaveBeenCalledWith("payment_intent", "intent-ops", {
        operator_status: "needs_follow_up",
        blocked_reason: null,
        notes: null,
        follow_up_at: null,
        owner_user_id: null,
      });
    });
  });

  it("filters intents by operator workflow and owner", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-blocked",
        merchant_reference: "PMT-BLOCKED",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        operator_workflow: { operator_status: "blocked", owner_name: "Desk Payments" },
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
        created_at: "2026-03-29T10:00:00Z",
      },
      {
        intent_id: "intent-follow",
        merchant_reference: "PMT-FOLLOW",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk Review" },
        user: { full_name: "Bob", email: "b@example.com", phone_e164: "+257111" },
        created_at: "2026-03-29T10:00:00Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("PMT-BLOCKED")).toBeInTheDocument();
    expect(screen.getByText("PMT-FOLLOW")).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("combobox")[2], {
      target: { value: "blocked" },
    });
    fireEvent.change(screen.getByPlaceholderText("Filtrer par owner..."), {
      target: { value: "Desk Payments" },
    });

    expect(screen.getByText("PMT-BLOCKED")).toBeInTheDocument();
    expect(screen.queryByText("PMT-FOLLOW")).not.toBeInTheDocument();
  });

  it("shows only blocked operator payment intents in blocked view", async () => {
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-blocked-view",
        merchant_reference: "PMT-BLOCKED-VIEW",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        operator_workflow: { operator_status: "blocked", owner_name: "Desk Payments" },
        user: { full_name: "Alice", email: "a@example.com", phone_e164: "+257000" },
      },
      {
        intent_id: "intent-open-view",
        merchant_reference: "PMT-OPEN-VIEW",
        amount: 25000,
        currency_code: "BIF",
        provider_channel: "Lumicash",
        status: "pending_provider",
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk Review" },
        user: { full_name: "Bob", email: "b@example.com", phone_e164: "+257111" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("PMT-BLOCKED-VIEW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Blocked only" }));

    expect(screen.getByText("PMT-BLOCKED-VIEW")).toBeInTheDocument();
    expect(screen.queryByText("PMT-OPEN-VIEW")).not.toBeInTheDocument();
  });
});
