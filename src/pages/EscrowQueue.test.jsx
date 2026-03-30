import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EscrowQueue from "@/pages/EscrowQueue";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    getUsers: vi.fn(),
    post: vi.fn(),
    postIdempotent: vi.fn(),
    requestEscrowRefund: vi.fn(),
    confirmEscrowRefund: vi.fn(),
    updateAdminOperatorWorkItem: vi.fn(),
    getAdminDisputeCodes: vi.fn(),
    issueAdminStepUp: vi.fn(),
    getAdminStepUpStatus: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <EscrowQueue />
    </MemoryRouter>
  );
}

describe("EscrowQueue", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getUsers.mockReset();
    api.post.mockReset();
    api.postIdempotent.mockReset();
    api.requestEscrowRefund.mockReset();
    api.confirmEscrowRefund.mockReset();
    api.updateAdminOperatorWorkItem.mockReset();
    api.getAdminDisputeCodes.mockReset();
    api.issueAdminStepUp.mockReset();
    api.getAdminStepUpStatus.mockReset();
    api.getAdminDisputeCodes.mockResolvedValue({
      escrow_refund_reason_codes: [{ value: "payout_failed", label: "Payout failed" }],
      escrow_refund_resolution_codes: [{ value: "refund_approved", label: "Refund approved" }],
      proof_types: [{ value: "mobile_money_reference", label: "Mobile money reference" }],
    });
    api.getAdminStepUpStatus.mockResolvedValue({
      enabled: true,
      token_expires_in_seconds: 300,
      header_fallback_enabled: true,
    });
  });

  it("requests a refund from the backoffice detail panel", async () => {
    const order = {
      id: "order-1",
      status: "SWAPPED",
      user_name: "Alice",
      user_id: "user-1",
      trader_name: "Trader One",
      trader_id: "trader-1",
      usdc_expected: 100,
      usdc_received: 100,
      usdt_target: 100,
      usdt_received: 100,
      bif_target: 290000,
      bif_paid: 0,
      risk_score: 12,
      created_at: "2026-03-29T10:00:00Z",
      updated_at: "2026-03-29T10:05:00Z",
      flags: [],
    };
    const detail = {
      ...order,
      refund_audit_trail: [],
    };

    api.get.mockImplementation((path) => {
      if (path.startsWith("/backoffice/escrow/orders?") || path === "/backoffice/escrow/orders") {
        return Promise.resolve([order]);
      }
      if (path === "/backoffice/escrow/orders/order-1") {
        return Promise.resolve(detail);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    api.requestEscrowRefund.mockResolvedValue({
      status: "OK",
      order_id: "order-1",
      escrow_status: "REFUND_PENDING",
    });

    renderPage();

    expect(await screen.findByText("order-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("order-1"));
    expect(await screen.findByText("Detail ordre")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Motif de refund"), {
      target: { value: "Payout failed on operator side" },
    });
    fireEvent.change(screen.getByDisplayValue("Code motif (optionnel)"), {
      target: { value: "payout_failed" },
    });
    fireEvent.change(screen.getByDisplayValue("Type de preuve (optionnel)"), {
      target: { value: "mobile_money_reference" },
    });
    fireEvent.change(screen.getByPlaceholderText("Reference preuve refund"), {
      target: { value: "MM-REF-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /demander refund_pending/i }));

    await waitFor(() => {
      expect(api.requestEscrowRefund).toHaveBeenCalledWith("order-1", {
        reason: "Payout failed on operator side",
        reason_code: "payout_failed",
        proof_type: "mobile_money_reference",
        proof_ref: "MM-REF-1",
      }, null);
    });
  });

  it("renders refund audit labels from the API detail payload", async () => {
    const order = {
      id: "order-2",
      status: "REFUND_PENDING",
      user_name: "Alice",
      user_id: "user-1",
      trader_name: "Trader One",
      trader_id: "trader-1",
      usdc_expected: 100,
      usdc_received: 100,
      usdt_target: 100,
      usdt_received: 100,
      bif_target: 290000,
      bif_paid: 0,
      risk_score: 12,
      created_at: "2026-03-29T10:00:00Z",
      updated_at: "2026-03-29T10:05:00Z",
      flags: [],
    };
    const detail = {
      ...order,
      refund_audit_trail: [
        {
          id: "audit-1",
          action: "ESCROW_REFUND_REQUESTED",
          created_at: "2026-03-29T11:00:00Z",
          actor_role: "admin",
          reason: "Payout failed on operator side",
          reason_code: "payout_failed",
          reason_code_label: "Payout failed",
          proof_type: "mobile_money_reference",
          proof_type_label: "Mobile money reference",
          proof_ref: "MM-REF-2",
          step_up_method: "token",
        },
      ],
    };

    api.get.mockImplementation((path) => {
      if (path.startsWith("/backoffice/escrow/orders?") || path === "/backoffice/escrow/orders") {
        return Promise.resolve([order]);
      }
      if (path === "/backoffice/escrow/orders/order-2") {
        return Promise.resolve(detail);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    renderPage();

    expect(await screen.findByText("order-2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("order-2"));

    expect(await screen.findByText(/payout failed \(payout_failed\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/mobile money reference \(mobile_money_reference\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/step-up token/i)).toBeInTheDocument();
  });

  it("requests admin step-up and retries refund with token", async () => {
    const order = {
      id: "order-step",
      status: "SWAPPED",
      user_name: "Alice",
      user_id: "user-1",
      trader_name: "Trader One",
      trader_id: "trader-1",
      usdc_expected: 100,
      usdc_received: 100,
      usdt_target: 100,
      usdt_received: 100,
      bif_target: 290000,
      bif_paid: 0,
      risk_score: 12,
      created_at: "2026-03-29T10:00:00Z",
      updated_at: "2026-03-29T10:05:00Z",
      flags: [],
    };
    const detail = { ...order, refund_audit_trail: [] };
    const stepUpError = new Error("step-up required");
    stepUpError.status = 428;
    stepUpError.detail = { code: "admin_step_up_required" };

    api.get.mockImplementation((path) => {
      if (path.startsWith("/backoffice/escrow/orders?") || path === "/backoffice/escrow/orders") {
        return Promise.resolve([order]);
      }
      if (path === "/backoffice/escrow/orders/order-step") {
        return Promise.resolve(detail);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    api.requestEscrowRefund
      .mockRejectedValueOnce(stepUpError)
      .mockResolvedValueOnce({ status: "OK", order_id: "order-step", escrow_status: "REFUND_PENDING" });
    api.issueAdminStepUp.mockResolvedValue({ token: "step-up-token" });

    renderPage();
    expect(await screen.findByText("order-step")).toBeInTheDocument();
    fireEvent.click(screen.getByText("order-step"));
    fireEvent.change(screen.getByPlaceholderText("Motif de refund"), {
      target: { value: "Payout failed on operator side" },
    });
    fireEvent.click(screen.getByRole("button", { name: /demander refund_pending/i }));

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
        action: "escrow_refund_request",
      });
      expect(api.requestEscrowRefund).toHaveBeenLastCalledWith(
        "order-step",
        expect.objectContaining({ reason: "Payout failed on operator side" }),
        "step-up-token"
      );
    });
  });

  it("shows the step-up active badge", async () => {
    api.get.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/confirmation admin forte active/i)).toBeInTheDocument();
    expect(await screen.findByText(/fallback header encore autorise/i)).toBeInTheDocument();
  });

  it("updates operator workflow from escrow detail", async () => {
    const order = {
      id: "order-ops",
      status: "REFUND_PENDING",
      user_name: "Alice",
      user_id: "user-1",
      trader_name: "Trader One",
      trader_id: "trader-1",
      usdc_expected: 100,
      usdc_received: 100,
      usdt_target: 100,
      usdt_received: 100,
      bif_target: 290000,
      bif_paid: 0,
      risk_score: 12,
      created_at: "2026-03-29T10:00:00Z",
      updated_at: "2026-03-29T10:05:00Z",
      flags: [],
      operator_workflow: {
        operator_status: "blocked",
        owner_name: "Ops Escrow",
      },
    };
    const detail = {
      ...order,
      refund_audit_trail: [],
    };

    api.get.mockImplementation((path) => {
      if (path.startsWith("/backoffice/escrow/orders?") || path === "/backoffice/escrow/orders") {
        return Promise.resolve([order]);
      }
      if (path === "/backoffice/escrow/orders/order-ops") {
        return Promise.resolve(detail);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    api.getUsers.mockResolvedValue([]);
    api.updateAdminOperatorWorkItem.mockResolvedValue({
      entity_type: "escrow_order",
      entity_id: "order-ops",
      operator_status: "blocked",
    });

    renderPage();

    expect(await screen.findByText("order-ops")).toBeInTheDocument();
    fireEvent.click(screen.getByText("order-ops"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer le workflow" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le workflow" }));

    await waitFor(() => {
      expect(api.updateAdminOperatorWorkItem).toHaveBeenCalledWith("escrow_order", "order-ops", {
        operator_status: "blocked",
        blocked_reason: null,
        notes: null,
        follow_up_at: null,
        owner_user_id: null,
      });
    });
  });

  it("filters orders by quick queue view", async () => {
    api.get.mockResolvedValue([
      {
        id: "order-risk",
        status: "FUNDED",
        user_name: "Risky",
        user_id: "user-risk",
        trader_name: "Trader One",
        trader_id: "trader-1",
        risk_score: 91,
      },
      {
        id: "order-refund",
        status: "REFUND_PENDING",
        user_name: "Refund",
        user_id: "user-refund",
        trader_name: "Trader Two",
        trader_id: "trader-2",
        risk_score: 12,
      },
    ]);

    renderPage();

    expect(await screen.findByText("order-risk")).toBeInTheDocument();
    expect(screen.getByText("order-refund")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /refund a traiter \(1\)/i }));

    expect(screen.queryByText("order-risk")).not.toBeInTheDocument();
    expect(screen.getByText("order-refund")).toBeInTheDocument();
  });

  it("filters orders by operator workflow and owner", async () => {
    api.get.mockResolvedValue([
      {
        id: "order-blocked",
        status: "REFUND_PENDING",
        user_name: "Risky",
        user_id: "user-risk",
        trader_name: "Trader One",
        trader_id: "trader-1",
        risk_score: 12,
        operator_workflow: { operator_status: "blocked", owner_name: "Desk A" },
      },
      {
        id: "order-follow",
        status: "PAYOUT_PENDING",
        user_name: "Safe",
        user_id: "user-safe",
        trader_name: "Trader Two",
        trader_id: "trader-2",
        risk_score: 12,
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk B" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("order-blocked")).toBeInTheDocument();
    expect(screen.getByText("order-follow")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Tous les workflows operateur"), {
      target: { value: "blocked" },
    });
    fireEvent.change(screen.getByPlaceholderText("Filtrer par owner operateur..."), {
      target: { value: "Desk A" },
    });

    expect(screen.getByText("order-blocked")).toBeInTheDocument();
    expect(screen.queryByText("order-follow")).not.toBeInTheDocument();
  });

  it("shows only blocked operator dossiers in blocked view", async () => {
    api.get.mockResolvedValue([
      {
        id: "order-blocked-view",
        status: "REFUND_PENDING",
        user_name: "Alice",
        trader_name: "Trader One",
        operator_workflow: { operator_status: "blocked", owner_name: "Desk A" },
      },
      {
        id: "order-open-view",
        status: "PAYOUT_PENDING",
        user_name: "Bob",
        trader_name: "Trader Two",
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk B" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("order-blocked-view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Blocked only" }));

    expect(screen.getByText("order-blocked-view")).toBeInTheDocument();
    expect(screen.queryByText("order-open-view")).not.toBeInTheDocument();
  });
});
