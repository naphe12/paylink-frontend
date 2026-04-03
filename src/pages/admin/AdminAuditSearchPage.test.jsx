import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAuditSearchPage from "@/pages/admin/AdminAuditSearchPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminAuditSearch: vi.fn(),
    getAdminAuditSearchDetail: vi.fn(),
  },
}));

function renderPage(initialEntry = "/dashboard/admin/audit-search") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard/admin/audit-search" element={<AdminAuditSearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminAuditSearchPage", () => {
  beforeEach(() => {
    api.getAdminAuditSearch.mockReset();
    api.getAdminAuditSearchDetail.mockReset();
    api.getAdminAuditSearch.mockResolvedValue({
      items: [],
      total: 0,
      limit: 25,
      offset: 0,
    });
    api.getAdminAuditSearchDetail.mockResolvedValue({
      source: "step_up",
      raw_ref: "101",
      raw: { action: "ADMIN_STEP_UP_CHECK" },
    });
    window.sessionStorage.clear();
  });

  it("loads search results from deep-link params and opens detail", async () => {
    api.getAdminAuditSearch.mockResolvedValue({
      items: [
        {
          source: "step_up",
          created_at: "2026-04-03T10:45:00Z",
          event_type: "admin_step_up",
          action: "ADMIN_STEP_UP_CHECK",
          outcome: "verified",
          actor_user_id: "admin-1",
          actor_full_name: "Alice Admin",
          actor_email: "alice@example.com",
          actor_role: "admin",
          target_type: "payment_intent",
          target_id: "intent-42",
          request_id: "req-42",
          summary: "payment_manual_reconcile verified",
          raw_ref: "101",
        },
        {
          source: "audit",
          created_at: "2026-04-03T09:30:00Z",
          event_type: "audit_log",
          action: "USER_LIMIT_UPDATED",
          outcome: null,
          actor_user_id: "operator-1",
          actor_full_name: "Bob Operator",
          actor_email: "bob@example.com",
          actor_role: "operator",
          target_type: "user",
          target_id: "user-7",
          request_id: "",
          summary: "USER_LIMIT_UPDATED user-7",
          raw_ref: "99",
        },
      ],
      total: 2,
      limit: 25,
      offset: 0,
    });

    renderPage("/dashboard/admin/audit-search?source=step_up&request_id=req-42");

    await waitFor(() => {
      expect(api.getAdminAuditSearch).toHaveBeenCalledWith({
        q: "req-42",
        source: "step_up",
        outcome: "",
        action: "",
        role: "",
        date_from: "",
        date_to: "",
        limit: 25,
        offset: 0,
      });
    });

    expect(await screen.findByText("Alice Admin")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice Admin"));

    await waitFor(() => {
      expect(api.getAdminAuditSearchDetail).toHaveBeenCalledWith("step_up", "101");
    });
    expect(await screen.findByText(/Reference brute:/)).toBeInTheDocument();
  });

  it("persists filters and resets pagination when the query changes", async () => {
    api.getAdminAuditSearch.mockResolvedValue({
      items: Array.from({ length: 25 }, (_, index) => ({
        source: "audit",
        created_at: "2026-04-03T09:30:00Z",
        event_type: "audit_log",
        action: `ACTION_${index}`,
        outcome: null,
        actor_user_id: `user-${index}`,
        actor_full_name: `User ${index}`,
        actor_email: `user${index}@example.com`,
        actor_role: "admin",
        target_type: "user",
        target_id: `target-${index}`,
        request_id: "",
        summary: `summary ${index}`,
        raw_ref: String(index),
      })),
      total: 50,
      limit: 25,
      offset: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(api.getAdminAuditSearch).toHaveBeenCalledWith({
        q: "",
        source: "",
        outcome: "",
        action: "",
        role: "",
        date_from: "",
        date_to: "",
        limit: 25,
        offset: 0,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Suiv." }));
    await waitFor(() => {
      expect(api.getAdminAuditSearch).toHaveBeenLastCalledWith({
        q: "",
        source: "",
        outcome: "",
        action: "",
        role: "",
        date_from: "",
        date_to: "",
        limit: 25,
        offset: 25,
      });
    });

    fireEvent.change(
      screen.getByPlaceholderText("Rechercher user, action, target ou request id"),
      { target: { value: "alice" } }
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("admin_audit_search:q")).toBe("alice");
      expect(api.getAdminAuditSearch).toHaveBeenLastCalledWith({
        q: "alice",
        source: "",
        outcome: "",
        action: "",
        role: "",
        date_from: "",
        date_to: "",
        limit: 25,
        offset: 0,
      });
    });
  });
});
