import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SecurityDashboard from "@/pages/admin/SecurityDashboard";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminNotifications: vi.fn(),
    getAdminStepUpEvents: vi.fn(),
    getAdminStepUpSummary: vi.fn(),
  },
}));

vi.mock("@/services/authStore", () => ({
  getAccessToken: vi.fn(() => "access-token"),
}));

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    setTimeout(() => {
      if (typeof this.onopen === "function") this.onopen();
    }, 0);
  }

  close() {
    if (typeof this.onclose === "function") this.onclose();
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SecurityDashboard />
    </MemoryRouter>
  );
}

describe("SecurityDashboard", () => {
  beforeEach(() => {
    api.getAdminNotifications.mockReset();
    api.getAdminStepUpEvents.mockReset();
    api.getAdminStepUpSummary.mockReset();
    api.getAdminNotifications.mockResolvedValue([]);
    api.getAdminStepUpEvents.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    api.getAdminStepUpSummary.mockResolvedValue({
      totals: { total: 0, issued: 0, verified: 0, denied: 0, required: 0 },
      denied_codes: [],
      by_action: [],
    });
    window.sessionStorage.clear();
    window.WebSocket = FakeWebSocket;
  });

  it("loads step-up events with persisted filters", async () => {
    window.sessionStorage.setItem("admin_security_active_panel", "step_up");
    window.sessionStorage.setItem("admin_security_step_up_outcome", "verified");
    window.sessionStorage.setItem("admin_security_step_up_action", "payment_manual_reconcile");
    window.sessionStorage.setItem("admin_security_step_up_query", "alice");

    api.getAdminStepUpEvents.mockResolvedValue({
      items: [
        {
          id: 1,
          created_at: "2026-04-03T10:45:00Z",
          actor_full_name: "Alice Admin",
          actor_email: "alice@example.com",
          actor_role: "admin",
          requested_action: "payment_manual_reconcile",
          outcome: "verified",
          target_type: "payment_intent",
          target_id: "intent-1",
          method: "token",
          code: "admin_step_up_verified",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(api.getAdminStepUpEvents).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        outcome: "verified",
        requested_action: "payment_manual_reconcile",
        q: "alice",
      });
    });
    expect(api.getAdminStepUpSummary).toHaveBeenCalledWith({ window_hours: 24 });

    await screen.findByText("Alice Admin");
    const persistedSelects = screen.getAllByRole("combobox");
    expect(persistedSelects[0]).toHaveValue("verified");
    expect(persistedSelects[1]).toHaveValue("payment_manual_reconcile");
    expect(screen.getByPlaceholderText("Rechercher admin, code ou action")).toHaveValue("alice");
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
  });

  it("persists active panel and step-up search filters across remounts", async () => {
    const firstRender = renderPage();

    await screen.findByText(/notifications temps reel/i);
    fireEvent.click(screen.getByRole("button", { name: "Step-up admin" }));

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "denied" } });
    fireEvent.change(selects[1], { target: { value: "escrow_refund_request" } });
    fireEvent.change(screen.getByPlaceholderText("Rechercher admin, code ou action"), {
      target: { value: "bob" },
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem("admin_security_active_panel")).toBe("step_up");
      expect(window.sessionStorage.getItem("admin_security_step_up_outcome")).toBe("denied");
      expect(window.sessionStorage.getItem("admin_security_step_up_action")).toBe("escrow_refund_request");
      expect(window.sessionStorage.getItem("admin_security_step_up_query")).toBe("bob");
    });

    firstRender.unmount();

    renderPage();

    await screen.findByText(/aucun evenement step-up pour ce filtre/i);
    const restoredSelects = screen.getAllByRole("combobox");
    expect(restoredSelects[0]).toHaveValue("denied");
    expect(restoredSelects[1]).toHaveValue("escrow_refund_request");
    expect(screen.getByPlaceholderText("Rechercher admin, code ou action")).toHaveValue("bob");
  });

  it("shows the step-up summary blocks", async () => {
    window.sessionStorage.setItem("admin_security_active_panel", "step_up");
    api.getAdminStepUpSummary.mockResolvedValue({
      totals: { total: 8, issued: 2, verified: 3, denied: 2, required: 1 },
      denied_codes: [{ code: "admin_step_up_session_mismatch", count: 2 }],
      by_action: [
        {
          requested_action: "payment_manual_reconcile",
          total: 4,
          denied: 2,
          verified: 1,
          required: 1,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Synthese step-up 24h")).toBeInTheDocument();
    expect(screen.getByText("admin_step_up_session_mismatch")).toBeInTheDocument();
    expect(screen.getByText("Actions protegees")).toBeInTheDocument();
    expect(screen.getByText("payment_manual_reconcile")).toBeInTheDocument();
  });
});
