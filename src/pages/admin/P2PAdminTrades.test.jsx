import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import P2PAdminTrades from "@/pages/admin/P2PAdminTrades";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/services/authStore", () => ({
  getAccessToken: vi.fn(() => "token-1"),
  suspendForAuthRedirect: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <P2PAdminTrades />
    </MemoryRouter>
  );
}

describe("P2PAdminTrades", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it("filters trades to disputed ones only", async () => {
    api.get.mockImplementation((path) => {
      if (path === "/api/admin/p2p/trades") {
        return Promise.resolve([
          {
            trade_id: "trade-1",
            status: "CREATED",
            created_at: "2026-03-29T10:00:00Z",
            buyer_name: "Buyer A",
            buyer_user_id: "buyer-1",
            seller_name: "Seller A",
            seller_user_id: "seller-1",
            token: "USDT",
            token_amount: 100,
            bif_amount: 290000,
            risk_score: 10,
            disputes_count: 0,
          },
          {
            trade_id: "trade-2",
            status: "DISPUTED",
            created_at: "2026-03-29T11:00:00Z",
            buyer_name: "Buyer B",
            buyer_user_id: "buyer-2",
            seller_name: "Seller B",
            seller_user_id: "seller-2",
            token: "USDC",
            token_amount: 50,
            bif_amount: 145000,
            risk_score: 70,
            disputes_count: 1,
          },
        ]);
      }
      if (path.startsWith("/api/admin/p2p/deposits?")) {
        return Promise.resolve([]);
      }
      if (path === "/api/admin/p2p/deposits/settings") {
        return Promise.resolve({ auto_assign_min_score: 90 });
      }
      if (path === "/api/admin/p2p/deposits/stats") {
        return Promise.resolve({
          total: 0,
          matched: 0,
          unmatched: 0,
          ambiguous: 0,
          auto: 0,
          manual: 0,
          by_provider: [],
          by_token: {
            USDC: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
            USDT: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
          },
        });
      }
      if (path === "/api/admin/p2p/deposits/providers") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    renderPage();

    expect(await screen.findByText("trade-1")).toBeInTheDocument();
    expect(screen.getByText("trade-2")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/disputes only/i));

    expect(screen.queryByText("trade-1")).not.toBeInTheDocument();
    expect(screen.getByText("trade-2")).toBeInTheDocument();
    expect(screen.getByText(/1 trade\(s\) litigieux/i)).toBeInTheDocument();
  });

  it("exports trades as csv", async () => {
    api.get.mockImplementation((path) => {
      if (path === "/api/admin/p2p/trades") {
        return Promise.resolve([
          {
            trade_id: "trade-1",
            status: "CREATED",
            created_at: "2026-03-29T10:00:00Z",
            buyer_name: "Buyer A",
            buyer_user_id: "buyer-1",
            seller_name: "Seller A",
            seller_user_id: "seller-1",
            token: "USDT",
            token_amount: 100,
            bif_amount: 290000,
            risk_score: 10,
            disputes_count: 0,
          },
        ]);
      }
      if (path.startsWith("/api/admin/p2p/deposits?")) {
        return Promise.resolve([]);
      }
      if (path === "/api/admin/p2p/deposits/settings") {
        return Promise.resolve({ auto_assign_min_score: 90 });
      }
      if (path === "/api/admin/p2p/deposits/stats") {
        return Promise.resolve({
          total: 0,
          matched: 0,
          unmatched: 0,
          ambiguous: 0,
          auto: 0,
          manual: 0,
          by_provider: [],
          by_token: {
            USDC: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
            USDT: { total: 0, matched: 0, ambiguous: 0, unmatched: 0 },
          },
        });
      }
      if (path === "/api/admin/p2p/deposits/providers") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("trade_id\ntrade-1", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      })
    );
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn(() => {});
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(HTMLElement.prototype, "remove").mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(await screen.findByText("trade-1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /export csv/i })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/admin\/p2p\/trades\/export\?format=csv$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token-1",
          }),
        })
      );
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    appendSpy.mockRestore();
    removeSpy.mockRestore();
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
