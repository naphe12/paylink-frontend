import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminOpsUrgenciesPage from "@/pages/admin/AdminOpsUrgenciesPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    getUsers: vi.fn(),
    getAdminPaymentIntents: vi.fn(),
    getAdminOpsUrgencies: vi.fn(),
    getAdminOperatorWorkflowSummary: vi.fn(),
    updateAdminOperatorWorkItem: vi.fn(),
  },
}));

vi.mock("@/services/authStore", () => ({
  getCurrentUser: () => ({ user_id: "admin-1", full_name: "Admin Ops" }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOpsUrgenciesPage />
    </MemoryRouter>
  );
}

describe("AdminOpsUrgenciesPage", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getUsers.mockReset();
    api.getAdminPaymentIntents.mockReset();
    api.getAdminOpsUrgencies.mockReset();
    api.getAdminOperatorWorkflowSummary.mockReset();
    api.updateAdminOperatorWorkItem.mockReset();
  });

  it("aggregates escrow, disputes and payment urgencies", async () => {
    api.getAdminOpsUrgencies.mockResolvedValue([
      {
        id: "escrow:order-1",
        entity_type: "escrow_order",
        entity_id: "11111111-1111-1111-1111-111111111111",
        kind: "escrow",
        title: "order-1",
        subtitle: "Alice -> Trader One",
        status: "REFUND_PENDING",
        priority: "critical",
        operator_status: "blocked",
        age: "3h",
        stale: true,
        owner: "Ops Escrow",
        last_action_at: "2026-03-29T05:00:00Z",
        to: "/dashboard/admin/escrow?queue=stale",
        meta: "Beneficiary not reachable",
        operator_workflow: {
          operator_status: "blocked",
          owner_name: "Ops Escrow",
          blocked_reason: "Beneficiary not reachable",
          last_action_at: "2026-03-29T05:00:00Z",
        },
      },
      {
        id: "dispute:disp-1",
        entity_type: "p2p_dispute",
        entity_id: "22222222-2222-2222-2222-222222222222",
        kind: "p2p_dispute",
        title: "disp-1",
        subtitle: "Buyer A / Seller B",
        status: "OPEN",
        priority: "warning",
        operator_status: "needs_follow_up",
        age: "2h",
        stale: false,
        owner: "Desk Arbitrage",
        last_action_at: "2026-03-29T08:00:00Z",
        to: "/dashboard/admin/p2p/disputes?queue=to_review",
        meta: "Waiting for buyer proof",
        operator_workflow: {
          operator_status: "needs_follow_up",
          owner_name: "Desk Arbitrage",
          notes: "Waiting for buyer proof",
        },
      },
      {
        id: "payment:intent-1",
        entity_type: "payment_intent",
        entity_id: "33333333-3333-3333-3333-333333333333",
        kind: "payment_intent",
        title: "PMT-1",
        subtitle: "Carol",
        status: "pending_provider",
        priority: "critical",
        operator_status: "blocked",
        age: "20m",
        stale: false,
        owner: "Desk Payments",
        last_action_at: "2026-03-29T15:00:00Z",
        to: "/dashboard/admin/payment-intents?queue=actionable",
        meta: "Provider timeout",
        operator_workflow: {
          operator_status: "blocked",
          owner_name: "Desk Payments",
          blocked_reason: "Provider timeout",
        },
      },
    ]);
    api.get.mockImplementation((path) => {
      if (path === "/backoffice/escrow/orders") {
        return Promise.resolve([
          {
            id: "order-1",
            status: "REFUND_PENDING",
            user_name: "Alice",
            trader_name: "Trader One",
            updated_at: "2026-03-28T08:00:00Z",
            risk_score: 12,
            operator_workflow: {
              operator_status: "blocked",
              owner_name: "Ops Escrow",
              blocked_reason: "Beneficiary not reachable",
              last_action_at: "2026-03-29T05:00:00Z",
            },
          },
        ]);
      }
      if (path === "/api/admin/p2p/disputes") {
        return Promise.resolve([
          {
            dispute_id: "disp-1",
            status: "OPEN",
            buyer_name: "Buyer A",
            seller_name: "Seller B",
            updated_at: "2026-03-28T01:00:00Z",
            reason: "Payment missing",
            operator_workflow: {
              operator_status: "needs_follow_up",
              owner_name: "Desk Arbitrage",
              notes: "Waiting for buyer proof",
            },
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    api.getAdminPaymentIntents.mockResolvedValue([
      {
        intent_id: "intent-1",
        merchant_reference: "PMT-1",
        status: "pending_provider",
        provider_channel: "Lumicash",
        updated_at: "2026-03-29T15:00:00Z",
        user: { full_name: "Carol" },
        operator_workflow: {
          operator_status: "blocked",
          owner_name: "Desk Payments",
          blocked_reason: "Provider timeout",
        },
      },
    ]);
    api.getAdminOperatorWorkflowSummary.mockResolvedValue({
      all: 3,
      mine: 0,
      team: 3,
      unassigned: 0,
      blocked_only: 2,
      needs_follow_up: 1,
      watching: 0,
      resolved: 0,
      overdue_follow_up: 1,
      owner_breakdown: [
        { owner_key: "ops escrow", owner_label: "Ops Escrow", count: 1, blocked_count: 1, overdue_follow_up_count: 0, mine: false },
        { owner_key: "desk arbitrage", owner_label: "Desk Arbitrage", count: 1, blocked_count: 0, overdue_follow_up_count: 0, mine: false },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("order-1")).toBeInTheDocument();
      expect(screen.getByText("disp-1")).toBeInTheDocument();
      expect(screen.getByText("PMT-1")).toBeInTheDocument();
      expect(screen.getByText("Ops Escrow")).toBeInTheDocument();
      expect(screen.getByText("Desk Arbitrage")).toBeInTheDocument();
      expect(screen.getByText("Desk Payments")).toBeInTheDocument();
      expect(api.getAdminOperatorWorkflowSummary).toHaveBeenCalled();
    });
  });

  it("updates operator workflow for the selected urgency", async () => {
    api.getAdminOpsUrgencies.mockResolvedValue(null);
    api.get.mockImplementation((path) => {
      if (path === "/backoffice/escrow/orders") {
        return Promise.resolve([
          {
            id: "order-2",
            status: "REFUND_PENDING",
            user_name: "Alice",
            trader_name: "Trader One",
            updated_at: "2026-03-28T08:00:00Z",
            risk_score: 12,
            operator_workflow: {
              operator_status: "blocked",
              owner_name: "Ops Escrow",
              blocked_reason: "",
            },
          },
        ]);
      }
      if (path === "/api/admin/p2p/disputes") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    api.getAdminPaymentIntents.mockResolvedValue([]);
    api.getAdminOperatorWorkflowSummary.mockResolvedValue(null);
    api.getUsers.mockResolvedValue([]);
    api.updateAdminOperatorWorkItem.mockResolvedValue({
      entity_type: "escrow_order",
      entity_id: "order-2",
      operator_status: "blocked",
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("order-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("order-2")[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer le workflow" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le workflow" }));

    await waitFor(() => {
      expect(api.updateAdminOperatorWorkItem).toHaveBeenCalledWith("escrow_order", "order-2", {
        operator_status: "blocked",
        blocked_reason: null,
        notes: null,
        follow_up_at: null,
        owner_user_id: null,
      });
    });
  });

  it("filters urgencies by mine and owner shortcuts", async () => {
    api.getAdminOpsUrgencies.mockResolvedValue(null);
    api.get.mockImplementation((path) => {
      if (path === "/backoffice/escrow/orders") {
        return Promise.resolve([
          {
            id: "order-mine",
            status: "REFUND_PENDING",
            user_name: "Alice",
            trader_name: "Trader One",
            updated_at: "2026-03-28T08:00:00Z",
            risk_score: 12,
            operator_workflow: {
              operator_status: "blocked",
              owner_name: "Admin Ops",
              owner_user_id: "admin-1",
            },
          },
          {
            id: "order-team",
            status: "PAYOUT_PENDING",
            user_name: "Bob",
            trader_name: "Trader Two",
            updated_at: "2026-03-28T08:00:00Z",
            risk_score: 12,
            operator_workflow: {
              operator_status: "needs_follow_up",
              owner_name: "Desk Arbitrage",
            },
          },
        ]);
      }
      if (path === "/api/admin/p2p/disputes") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    api.getAdminPaymentIntents.mockResolvedValue([]);
    api.getAdminOperatorWorkflowSummary.mockResolvedValue({
      all: 2,
      mine: 1,
      team: 1,
      unassigned: 0,
      blocked_only: 1,
      needs_follow_up: 1,
      watching: 0,
      resolved: 0,
      overdue_follow_up: 0,
      owner_breakdown: [
        { owner_key: "desk arbitrage", owner_label: "Desk Arbitrage", count: 1, blocked_count: 0, overdue_follow_up_count: 0, mine: false },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("order-mine")).toBeInTheDocument();
      expect(screen.getByText("order-team")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Mes urgences 1/i }));
    await waitFor(() => {
      expect(api.getAdminOpsUrgencies).toHaveBeenLastCalledWith(
        expect.objectContaining({ view: "mine" })
      );
    });
    expect(screen.getAllByText("order-mine").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Toutes 2/i }));
    fireEvent.click(screen.getByRole("button", { name: /Desk Arbitrage \(1\)/ }));
    await waitFor(() => {
      expect(api.getAdminOpsUrgencies).toHaveBeenLastCalledWith(
        expect.objectContaining({ owner_key: "desk arbitrage" })
      );
    });
    expect(screen.getAllByText("order-team").length).toBeGreaterThan(0);
  });
});
