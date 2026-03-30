import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import P2PAdminDisputes from "@/pages/admin/P2PAdminDisputes";
import api, { getConfiguredApiUrl } from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    resolveP2PDispute: vi.fn(),
  },
  getConfiguredApiUrl: vi.fn(() => "http://localhost:8000"),
}));

vi.mock("@/services/authStore", () => ({
  getAccessToken: vi.fn(() => "token-1"),
  suspendForAuthRedirect: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <P2PAdminDisputes />
    </MemoryRouter>
  );
}

describe("P2PAdminDisputes export", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.resolveP2PDispute.mockReset();
  });

  it("exports disputes as csv", async () => {
    api.get.mockResolvedValue([
      {
        dispute_id: "disp-1",
        trade_id: "trade-1",
        status: "OPEN",
        source: "p2p",
        created_at: "2026-03-29T10:00:00Z",
        reason: "Buyer says payment was sent.",
      },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("dispute_id\n disp-1", {
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

    expect(await screen.findByText("disp-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${getConfiguredApiUrl()}/api/admin/p2p/disputes/export?format=csv`,
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
