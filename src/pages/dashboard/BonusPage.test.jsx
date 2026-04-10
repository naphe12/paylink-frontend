import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BonusPage from "@/pages/dashboard/BonusPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getMyReferralProfile: vi.fn(),
    applyReferralCode: vi.fn(),
    activateReferral: vi.fn(),
    getBonusBalance: vi.fn(),
    listBonusHistory: vi.fn(),
    sendBonusTransfer: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BonusPage />
    </MemoryRouter>
  );
}

describe("BonusPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
  });

  it("loads referral profile, applies a code and activates a reward", async () => {
    api.getMyReferralProfile
      .mockResolvedValueOnce({
        referral_code: "PESA123",
        referral_link: "https://app.pesapaid.com/signup?ref=PESA123",
        total_referrals: 2,
        activated_referrals: 1,
        pending_rewards: 1,
        rewards_earned: 2500,
        currency_code: "BIF",
        activation_rate_percent: 50,
        my_activation_progress_percent: 0,
        my_activation_ready: false,
        my_activation_next_step: null,
        targeted_bonus_policy: "real-activity-only",
        rewards: [
          {
            reward_id: "rw-1",
            referred_user_id: "user-2",
            amount: 2500,
            currency_code: "BIF",
            status: "pending",
            activation_reason: null,
            activation_progress_percent: 40,
          },
        ],
      })
      .mockResolvedValueOnce({
        referral_code: "PESA123",
        referral_link: "https://app.pesapaid.com/signup?ref=PESA123",
        total_referrals: 3,
        activated_referrals: 1,
        pending_rewards: 2,
        rewards_earned: 2500,
        currency_code: "BIF",
        activation_rate_percent: 33.33,
        my_activation_progress_percent: 60,
        my_activation_ready: false,
        my_activation_next_step: "Realiser encore une operation wallet d'un type different pour valider l'activation.",
        targeted_bonus_policy: "real-activity-only",
        rewards: [],
      })
      .mockResolvedValueOnce({
        referral_code: "PESA123",
        referral_link: "https://app.pesapaid.com/signup?ref=PESA123",
        total_referrals: 3,
        activated_referrals: 2,
        pending_rewards: 1,
        rewards_earned: 5000,
        currency_code: "BIF",
        activation_rate_percent: 66.67,
        my_activation_progress_percent: 100,
        my_activation_ready: true,
        my_activation_next_step: null,
        targeted_bonus_policy: "real-activity-only",
        rewards: [
          {
            reward_id: "rw-2",
            referred_user_id: "user-3",
            amount: 2500,
            currency_code: "BIF",
            status: "activated",
            activation_reason: "qualified_real_activity",
            activation_progress_percent: 100,
          },
        ],
      });
    api.getBonusBalance.mockResolvedValue({ bonus_balance: 8000, currency_code: "BIF" });
    api.listBonusHistory.mockResolvedValue([]);
    api.applyReferralCode.mockResolvedValue({ status: "linked" });
    api.activateReferral.mockResolvedValue({ status: "activated", amount: 2500, currency_code: "BIF" });

    renderPage();

    expect(await screen.findByText(/signup\?ref=PESA123/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Code parrainage a appliquer/i), {
      target: { value: "friend99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Appliquer/i }));

    await waitFor(() => {
      expect(api.applyReferralCode).toHaveBeenCalledWith("FRIEND99");
    });

    fireEvent.click(screen.getByRole("button", { name: /Verifier mon activation reelle/i }));

    await waitFor(() => {
      expect(api.activateReferral).toHaveBeenCalled();
    });

    expect(await screen.findByText(/5.?000 BIF/i)).toBeInTheDocument();
    expect(screen.getByText(/qualified_real_activity/i)).toBeInTheDocument();
  });

  it("sends a bonus transfer and refreshes history", async () => {
    api.getMyReferralProfile.mockResolvedValue({
      referral_code: "PESA123",
      referral_link: "https://app.pesapaid.com/signup?ref=PESA123",
      total_referrals: 0,
      activated_referrals: 0,
      pending_rewards: 0,
      rewards_earned: 0,
      currency_code: "BIF",
      rewards: [],
    });
    api.getBonusBalance
      .mockResolvedValueOnce({ bonus_balance: 10000, currency_code: "BIF" })
      .mockResolvedValueOnce({ bonus_balance: 7500, currency_code: "BIF" });
    api.listBonusHistory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "hist-1",
          user_id: "user-1",
          amount_bif: 2500,
          currency_code: "BIF",
          source: "sent",
          label: "Bonus envoye",
          counterparty_label: "alice@example.com",
          created_at: "2026-04-06T10:00:00Z",
        },
      ]);
    api.sendBonusTransfer.mockResolvedValue({
      transfer_id: "tr-1",
      amount_bif: 2500,
      currency_code: "BIF",
      sender_label: "me@example.com",
      recipient_label: "alice@example.com",
    });

    renderPage();

    expect(await screen.findByText(/Bonus disponible/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Destinataire bonus/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Montant bonus BIF/i), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer le bonus/i }));

    await waitFor(() => {
      expect(api.sendBonusTransfer).toHaveBeenCalledWith({
        recipient_identifier: "alice@example.com",
        amount_bif: 2500,
      });
    });

    expect(await screen.findByText(/Bonus envoye: 2.?500 BIF vers alice@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Contrepartie: alice@example.com/i)).toBeInTheDocument();
  });
});
