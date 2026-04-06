import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PotsPage from "@/pages/dashboard/PotsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listPots: vi.fn(),
    createPot: vi.fn(),
    getPotDetail: vi.fn(),
    addPotMember: vi.fn(),
    updatePotMember: vi.fn(),
    contributePot: vi.fn(),
    leavePot: vi.fn(),
    closePot: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PotsPage />
    </MemoryRouter>
  );
}

describe("PotsPage", () => {
  beforeEach(() => {
    api.listPots.mockReset();
    api.createPot.mockReset();
    api.getPotDetail.mockReset();
    api.addPotMember.mockReset();
    api.updatePotMember.mockReset();
    api.contributePot.mockReset();
    api.leavePot.mockReset();
    api.closePot.mockReset();
  });

  it("creates a group savings pot, manages a member and contributes", async () => {
    api.listPots
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          pot_id: "pot-1",
          title: "Projet famille",
          current_amount: 0,
          target_amount: 50000,
          currency_code: "BIF",
          status: "active",
          progress_percent: 0,
          pot_mode: "group_savings",
          access_role: "owner",
          members: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          pot_id: "pot-1",
          title: "Projet famille",
          current_amount: 0,
          target_amount: 50000,
          currency_code: "BIF",
          status: "active",
          progress_percent: 0,
          pot_mode: "group_savings",
          access_role: "owner",
          members: [
            {
              membership_id: "m1",
              member_label: "@alice",
              role: "member",
              status: "active",
              user_id: "u2",
              target_amount: 10000,
              contributed_amount: 0,
              remaining_amount: 10000,
              progress_percent: 0,
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          pot_id: "pot-1",
          title: "Projet famille",
          current_amount: 10000,
          target_amount: 50000,
          currency_code: "BIF",
          status: "active",
          progress_percent: 20,
          pot_mode: "group_savings",
          access_role: "owner",
          members: [
            {
              membership_id: "m1",
              member_label: "@alice",
              role: "member",
              status: "paused",
              user_id: "u2",
              target_amount: 15000,
              contributed_amount: 10000,
              remaining_amount: 5000,
              progress_percent: 66.67,
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          pot_id: "pot-1",
          title: "Projet famille",
          current_amount: 0,
          target_amount: 50000,
          currency_code: "BIF",
          status: "active",
          progress_percent: 0,
          pot_mode: "group_savings",
          access_role: "owner",
          members: [
            {
              membership_id: "m1",
              member_label: "@alice",
              role: "member",
              status: "paused",
              user_id: "u2",
              target_amount: 15000,
              contributed_amount: 0,
              remaining_amount: 15000,
              progress_percent: 0,
            },
          ],
        },
      ]);

    api.createPot.mockResolvedValue({ pot_id: "pot-1" });
    api.getPotDetail
      .mockResolvedValueOnce({
        pot_id: "pot-1",
        title: "Projet famille",
        description: "Objectif commun",
        current_amount: 0,
        target_amount: 50000,
        currency_code: "BIF",
        status: "active",
        progress_percent: 0,
        contributions: [],
        share_token: "share1",
        pot_mode: "group_savings",
        access_role: "owner",
        members: [],
      })
      .mockResolvedValueOnce({
        pot_id: "pot-1",
        title: "Projet famille",
        description: "Objectif commun",
        current_amount: 0,
        target_amount: 50000,
        currency_code: "BIF",
        status: "active",
        progress_percent: 0,
        contributions: [],
        share_token: "share1",
        pot_mode: "group_savings",
        access_role: "owner",
        members: [
          {
            membership_id: "m1",
            member_label: "@alice",
            role: "member",
            status: "active",
            user_id: "u2",
            target_amount: 10000,
            contributed_amount: 0,
            remaining_amount: 10000,
            progress_percent: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        pot_id: "pot-1",
        title: "Projet famille",
        description: "Objectif commun",
        current_amount: 0,
        target_amount: 50000,
        currency_code: "BIF",
        status: "active",
        progress_percent: 0,
        contributions: [],
        share_token: "share1",
        pot_mode: "group_savings",
        access_role: "owner",
        members: [
          {
            membership_id: "m1",
            member_label: "@alice",
            role: "member",
            status: "paused",
            user_id: "u2",
            target_amount: 15000,
            contributed_amount: 0,
            remaining_amount: 15000,
            progress_percent: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        pot_id: "pot-1",
        title: "Projet famille",
        description: "Objectif commun",
        current_amount: 10000,
        target_amount: 50000,
        currency_code: "BIF",
        status: "active",
        progress_percent: 20,
        contributions: [
          {
            contribution_id: "c1",
            amount: 10000,
            currency_code: "BIF",
            created_at: "2026-04-06T00:00:00Z",
            note: "Contribution wallet",
            contributor_label: "@alice",
          },
        ],
        share_token: "share1",
        pot_mode: "group_savings",
        access_role: "owner",
        members: [
          {
            membership_id: "m1",
            member_label: "@alice",
            role: "member",
            status: "paused",
            user_id: "u2",
            target_amount: 15000,
            contributed_amount: 10000,
            remaining_amount: 5000,
            progress_percent: 66.67,
          },
        ],
      });
    api.addPotMember.mockResolvedValue({
      pot_id: "pot-1",
      title: "Projet famille",
      description: "Objectif commun",
      current_amount: 0,
      target_amount: 50000,
      currency_code: "BIF",
      status: "active",
      progress_percent: 0,
      contributions: [],
      share_token: "share1",
      pot_mode: "group_savings",
      access_role: "owner",
      members: [
        {
          membership_id: "m1",
          member_label: "@alice",
          role: "member",
          status: "active",
          user_id: "u2",
          target_amount: 10000,
          contributed_amount: 0,
          remaining_amount: 10000,
          progress_percent: 0,
        },
      ],
    });
    api.updatePotMember.mockResolvedValue({
      pot_id: "pot-1",
      title: "Projet famille",
      description: "Objectif commun",
      current_amount: 0,
      target_amount: 50000,
      currency_code: "BIF",
      status: "active",
      progress_percent: 0,
      contributions: [],
      share_token: "share1",
      pot_mode: "group_savings",
      access_role: "owner",
      members: [
        {
          membership_id: "m1",
          member_label: "@alice",
          role: "member",
          status: "paused",
          user_id: "u2",
          target_amount: 15000,
          contributed_amount: 0,
          remaining_amount: 15000,
          progress_percent: 0,
        },
      ],
    });
    api.contributePot.mockResolvedValue({
      pot_id: "pot-1",
      title: "Projet famille",
      description: "Objectif commun",
      current_amount: 10000,
      target_amount: 50000,
      currency_code: "BIF",
      status: "active",
      progress_percent: 20,
      contributions: [
        {
          contribution_id: "c1",
          amount: 10000,
          currency_code: "BIF",
          created_at: "2026-04-06T00:00:00Z",
          note: "Contribution wallet",
          contributor_label: "@alice",
        },
      ],
      share_token: "share1",
      pot_mode: "group_savings",
      access_role: "owner",
      members: [
        {
          membership_id: "m1",
          member_label: "@alice",
          role: "member",
          status: "paused",
          user_id: "u2",
          target_amount: 15000,
          contributed_amount: 10000,
          remaining_amount: 5000,
          progress_percent: 66.67,
        },
      ],
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/Titre cagnotte/i), { target: { value: "Projet famille" } });
    fireEvent.change(screen.getByLabelText(/Montant cible cagnotte/i), { target: { value: "50000" } });
    fireEvent.change(screen.getByLabelText(/Mode cagnotte/i), { target: { value: "group_savings" } });
    fireEvent.click(screen.getByRole("button", { name: /^Creer$/i }));

    await waitFor(() => {
      expect(api.createPot).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Projet famille",
          target_amount: 50000,
          pot_mode: "group_savings",
        })
      );
    });

    fireEvent.change(screen.getByLabelText(/Identifiant membre cagnotte/i), { target: { value: "@alice" } });
    fireEvent.change(screen.getByLabelText(/Objectif membre cagnotte/i), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));

    await waitFor(() => {
      expect(api.addPotMember).toHaveBeenCalledWith("pot-1", {
        identifier: "@alice",
        target_amount: 10000,
      });
    });

    fireEvent.change(screen.getByLabelText(/Cible membre @alice/i), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText(/Statut membre @alice/i), { target: { value: "paused" } });
    fireEvent.click(screen.getByRole("button", { name: /Sauver/i }));

    await waitFor(() => {
      expect(api.updatePotMember).toHaveBeenCalledWith("pot-1", "m1", {
        target_amount: 15000,
        status: "paused",
      });
    });

    fireEvent.change(await screen.findByLabelText(/Montant contribution cagnotte/i), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /Contribuer/i }));

    await waitFor(() => {
      expect(api.contributePot).toHaveBeenCalledWith("pot-1", { amount: 10000 });
    });

    expect((await screen.findAllByText(/@alice/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Progression individuelle: 66.67%/i)).toBeInTheDocument();
  }, 10000);

  it("allows a member to leave a group savings pot", async () => {
    api.listPots.mockResolvedValueOnce([
      {
        pot_id: "pot-2",
        title: "Projet amis",
        current_amount: 1000,
        target_amount: 5000,
        currency_code: "BIF",
        status: "active",
        progress_percent: 20,
        pot_mode: "group_savings",
        access_role: "member",
        members: [],
      },
    ]).mockResolvedValueOnce([]);

    api.getPotDetail.mockResolvedValueOnce({
      pot_id: "pot-2",
      title: "Projet amis",
      description: "Cagnotte membres",
      current_amount: 1000,
      target_amount: 5000,
      currency_code: "BIF",
      status: "active",
      progress_percent: 20,
      contributions: [],
      share_token: "share2",
      pot_mode: "group_savings",
      access_role: "member",
      members: [],
    });
    api.leavePot.mockResolvedValue({ ok: true, pot_id: "pot-2" });

    renderPage();

    expect((await screen.findAllByText(/Projet amis/i)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Quitter le groupe/i }));

    await waitFor(() => {
      expect(api.leavePot).toHaveBeenCalledWith("pot-2", {});
    });
  });
});
