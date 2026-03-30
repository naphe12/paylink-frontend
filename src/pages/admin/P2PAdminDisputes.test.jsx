import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import P2PAdminDisputes from "@/pages/admin/P2PAdminDisputes";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    getUsers: vi.fn(),
    resolveP2PDispute: vi.fn(),
    getAdminP2PDisputeDetail: vi.fn(),
    getAdminDisputeCodes: vi.fn(),
    updateAdminOperatorWorkItem: vi.fn(),
    issueAdminStepUp: vi.fn(),
    getAdminStepUpStatus: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <P2PAdminDisputes />
    </MemoryRouter>
  );
}

describe("P2PAdminDisputes", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getUsers.mockReset();
    api.resolveP2PDispute.mockReset();
    api.getAdminP2PDisputeDetail.mockReset();
    api.getAdminDisputeCodes.mockReset();
    api.updateAdminOperatorWorkItem.mockReset();
    api.issueAdminStepUp.mockReset();
    api.getAdminStepUpStatus.mockReset();
    api.getAdminDisputeCodes.mockResolvedValue({
      p2p_dispute_resolution_codes: [
        { value: "payment_proof_validated", label: "Payment proof validated" },
      ],
      proof_types: [{ value: "screenshot", label: "Screenshot" }],
    });
    api.getAdminStepUpStatus.mockResolvedValue({
      enabled: true,
      token_expires_in_seconds: 300,
      header_fallback_enabled: true,
    });
  });

  it("resolves a p2p dispute in favor of the buyer", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-1",
        trade_id: "trade-1",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        created_at: "2026-03-29T10:00:00Z",
        updated_at: "2026-03-29T10:01:00Z",
        resolved_at: null,
        reason: "Buyer says payment was sent.",
        resolution: null,
        buyer_name: "Buyer A",
        seller_name: "Seller B",
      },
    ]);
    api.resolveP2PDispute.mockResolvedValue({ status: "OK" });
    api.getAdminP2PDisputeDetail.mockResolvedValue({
      dispute: { dispute_id: "disp-1", trade_id: "trade-1", status: "OPEN", source: "p2p" },
      timeline: [],
    });

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Payment proof validated");

    renderPage();

    expect(await screen.findByText("disp-1")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Code resolution admin (optionnel)"), {
      target: { value: "payment_proof_validated" },
    });
    fireEvent.change(screen.getByDisplayValue("Type de preuve (optionnel)"), {
      target: { value: "screenshot" },
    });
    fireEvent.change(screen.getByPlaceholderText("URL, reference mobile money, receipt id..."), {
      target: { value: "https://example.com/proof.png" },
    });

    fireEvent.click(screen.getByRole("button", { name: /acheteur gagne/i }));

    await waitFor(() => {
      expect(api.resolveP2PDispute).toHaveBeenCalledWith("trade-1", {
        outcome: "buyer_wins",
        resolution: "Payment proof validated",
        resolution_code: "payment_proof_validated",
        proof_type: "screenshot",
        proof_ref: "https://example.com/proof.png",
      }, null);
    });

    promptSpy.mockRestore();
  });

  it("loads dispute detail timeline", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-2",
        trade_id: "trade-2",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        created_at: "2026-03-29T10:00:00Z",
        updated_at: "2026-03-29T10:01:00Z",
        resolved_at: null,
        reason: "Payment missing.",
        resolution: null,
      },
    ]);
    api.getAdminP2PDisputeDetail.mockResolvedValue({
      dispute: { dispute_id: "disp-2", trade_id: "trade-2", status: "OPEN", source: "p2p" },
      timeline: [
        {
          id: "audit-1",
          action: "P2P_DISPUTE_OPENED",
          created_at: "2026-03-29T10:02:00Z",
          reason: "Payment missing.",
          reason_code: "payment_not_received",
          reason_code_label: "Payment not received",
          step_up_method: "token",
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("disp-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /voir detail/i }));

    await waitFor(() => {
      expect(api.getAdminP2PDisputeDetail).toHaveBeenCalledWith("disp-2");
    });

    expect(await screen.findByText("Detail litige")).toBeInTheDocument();
    expect(await screen.findByText("P2P_DISPUTE_OPENED")).toBeInTheDocument();
    expect(await screen.findByText(/payment not received \(payment_not_received\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/step-up token/i)).toBeInTheDocument();
  });

  it("requests admin step-up and retries dispute resolution with token", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-step",
        trade_id: "trade-step",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        created_at: "2026-03-29T10:00:00Z",
        updated_at: "2026-03-29T10:01:00Z",
        resolved_at: null,
        reason: "Buyer says payment was sent.",
        resolution: null,
      },
    ]);
    const stepUpError = new Error("step-up required");
    stepUpError.status = 428;
    stepUpError.detail = { code: "admin_step_up_required" };
    api.resolveP2PDispute
      .mockRejectedValueOnce(stepUpError)
      .mockResolvedValueOnce({ status: "OK" });
    api.issueAdminStepUp.mockResolvedValue({ token: "step-up-token" });
    api.getAdminP2PDisputeDetail.mockResolvedValue({
      dispute: { dispute_id: "disp-step", trade_id: "trade-step", status: "OPEN", source: "p2p" },
      timeline: [],
    });

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Payment proof validated");

    renderPage();

    expect(await screen.findByText("disp-step")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /acheteur gagne/i }));

    expect(await screen.findByText(/mot de passe admin/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Mot de passe admin"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /confirmer/i }).at(-1));

    await waitFor(() => {
      expect(api.issueAdminStepUp).toHaveBeenCalledWith({
        password: "secret",
        action: "p2p_dispute_resolve",
      });
      expect(api.resolveP2PDispute).toHaveBeenLastCalledWith(
        "trade-step",
        expect.objectContaining({
          outcome: "buyer_wins",
          resolution: "Payment proof validated",
        }),
        "step-up-token"
      );
    });

    promptSpy.mockRestore();
  });

  it("shows the step-up active badge", async () => {
    api.get.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/confirmation admin forte active/i)).toBeInTheDocument();
    expect(await screen.findByText(/fallback header encore autorise/i)).toBeInTheDocument();
  });

  it("filters disputes by quick queue view", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-open",
        trade_id: "trade-open",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        reason: "Open issue",
      },
      {
        dispute_id: "disp-legacy",
        trade_id: null,
        status: "CLOSED",
        source: "paylink",
        trade_status: null,
        reason: "Legacy issue",
      },
    ]);

    renderPage();

    expect(await screen.findByText("disp-open")).toBeInTheDocument();
    expect(screen.getByText("disp-legacy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /a traiter \(1\)/i }));

    expect(screen.getByText("disp-open")).toBeInTheDocument();
    expect(screen.queryByText("disp-legacy")).not.toBeInTheDocument();
  });

  it("updates operator workflow from dispute detail", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-ops",
        trade_id: "trade-ops",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        reason: "Payment missing.",
      },
    ]);
    api.getUsers.mockResolvedValue([]);
    api.getAdminP2PDisputeDetail.mockResolvedValue({
      dispute: {
        dispute_id: "disp-ops",
        trade_id: "trade-ops",
        status: "OPEN",
        source: "p2p",
        operator_workflow: {
          operator_status: "needs_follow_up",
          owner_name: "Desk Arbitrage",
        },
      },
      timeline: [],
    });
    api.updateAdminOperatorWorkItem.mockResolvedValue({
      entity_type: "p2p_dispute",
      entity_id: "disp-ops",
      operator_status: "needs_follow_up",
    });

    renderPage();

    expect(await screen.findByText("disp-ops")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /voir detail/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer le workflow" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le workflow" }));

    await waitFor(() => {
      expect(api.updateAdminOperatorWorkItem).toHaveBeenCalledWith("p2p_dispute", "disp-ops", {
        operator_status: "needs_follow_up",
        blocked_reason: null,
        notes: null,
        follow_up_at: null,
        owner_user_id: null,
      });
    });
  });

  it("filters disputes by operator workflow and owner", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-blocked",
        trade_id: "trade-blocked",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        reason: "Open issue",
        operator_workflow: { operator_status: "blocked", owner_name: "Desk Arbitrage" },
      },
      {
        dispute_id: "disp-follow",
        trade_id: "trade-follow",
        status: "OPEN",
        source: "p2p",
        trade_status: "DISPUTED",
        reason: "Other issue",
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk Review" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("disp-blocked")).toBeInTheDocument();
    expect(screen.getByText("disp-follow")).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("combobox")[4], {
      target: { value: "blocked" },
    });
    fireEvent.change(screen.getByPlaceholderText("Filtrer par owner..."), {
      target: { value: "Desk Arbitrage" },
    });

    expect(screen.getByText("disp-blocked")).toBeInTheDocument();
    expect(screen.queryByText("disp-follow")).not.toBeInTheDocument();
  });

  it("shows only blocked operator disputes in blocked view", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-blocked-view",
        trade_id: "trade-blocked-view",
        status: "OPEN",
        source: "p2p",
        operator_workflow: { operator_status: "blocked", owner_name: "Desk Arbitrage" },
      },
      {
        dispute_id: "disp-open-view",
        trade_id: "trade-open-view",
        status: "OPEN",
        source: "p2p",
        operator_workflow: { operator_status: "needs_follow_up", owner_name: "Desk Review" },
      },
    ]);

    renderPage();

    expect(await screen.findByText("disp-blocked-view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Blocked only" }));

    expect(screen.getByText("disp-blocked-view")).toBeInTheDocument();
    expect(screen.queryByText("disp-open-view")).not.toBeInTheDocument();
  });
});
