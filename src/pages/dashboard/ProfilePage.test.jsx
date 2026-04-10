import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "@/pages/dashboard/ProfilePage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    getMyTrustProfile: vi.fn(),
    getMyReferralProfile: vi.fn(),
    applyReferralCode: vi.fn(),
    activateReferral: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.getMyTrustProfile.mockReset();
    api.getMyReferralProfile.mockReset();
    api.applyReferralCode.mockReset();
    api.activateReferral.mockReset();
  });

  it("shows trust and referral sections and applies a referral code", async () => {
    api.get.mockResolvedValue({
      full_name: "Alice",
      email: "alice@example.com",
      phone_e164: "+25770000000",
      country_code: "BI",
      status: "active",
      paytag: "@alice",
      credit_limit: 500,
      credit_used: 100,
      risk_score: 12,
    });
    api.getMyTrustProfile.mockResolvedValue({
      profile: {
        trust_score: 68,
        trust_level: "trusted",
        kyc_tier: 1,
        kyc_verified: true,
        successful_payment_requests: 4,
        total_payment_requests: 5,
        payment_request_success_rate: 0.8,
        successful_p2p_trades: 7,
        total_p2p_trades: 8,
        p2p_completion_rate: 0.875,
        p2p_dispute_count: 1,
        open_p2p_dispute_count: 0,
        p2p_dispute_rate: 0.125,
        reputation_tier: "good",
        reputation_note: "Bon profil global avec risque de litige maitrise.",
        account_age_days: 210,
        current_daily_limit: 1250000,
        current_monthly_limit: 6250000,
        recommended_daily_limit: 1250000,
        recommended_monthly_limit: 6250000,
        limit_multiplier: 1.25,
        limit_uplift_active: true,
        last_computed_at: "2026-04-08T12:00:00Z",
        badges: [{ badge_code: "kyc_verified", name: "KYC verifie" }],
      },
      events: [
        {
          event_id: "evt-1",
          reason_code: "profile_recomputed",
          score_delta: 4,
          created_at: "2026-04-08T12:00:00Z",
        },
      ],
    });
    api.getMyReferralProfile
      .mockResolvedValueOnce({
        referral_code: "ALICE001",
        total_referrals: 2,
        activated_referrals: 1,
        rewards_earned: 2500,
        currency_code: "BIF",
        referral_link: "https://app.pesapaid.com/signup?ref=ALICE001",
        pending_rewards: 1,
        rewards: [],
      })
      .mockResolvedValueOnce({
        referral_code: "ALICE001",
        total_referrals: 2,
        activated_referrals: 1,
        rewards_earned: 2500,
        currency_code: "BIF",
        referral_link: "https://app.pesapaid.com/signup?ref=ALICE001",
        pending_rewards: 1,
        rewards: [],
      });
    api.applyReferralCode.mockResolvedValue({ status: "linked" });

    renderPage();

    expect(await screen.findByText(/Parrainage intelligent/i)).toBeInTheDocument();
    expect(screen.getByText(/Boost confiance/i)).toBeInTheDocument();
    expect(screen.getByText(/Taux paiement reussi/i)).toBeInTheDocument();
    expect(screen.getByText(/Reputation :/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique confiance/i)).toBeInTheDocument();
    expect(screen.getByText(/Profil recalcule/i)).toBeInTheDocument();
    expect(screen.getByText(/Le compte beneficie actuellement/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Appliquer un code de parrainage/i), {
      target: { value: "PARRAIN01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Appliquer le code/i }));

    await waitFor(() => {
      expect(api.applyReferralCode).toHaveBeenCalledWith("PARRAIN01");
    });
  });
});
