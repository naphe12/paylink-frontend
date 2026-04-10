import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminVirtualCardsPage from "@/pages/admin/AdminVirtualCardsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getAdminVirtualCards: vi.fn(),
    getAdminVirtualCardDetail: vi.fn(),
    updateAdminVirtualCardStatus: vi.fn(),
    updateAdminVirtualCardControls: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminVirtualCardsPage />
    </MemoryRouter>
  );
}

describe("AdminVirtualCardsPage", () => {
  beforeEach(() => {
    api.getAdminVirtualCards.mockReset();
    api.getAdminVirtualCardDetail.mockReset();
    api.updateAdminVirtualCardStatus.mockReset();
    api.updateAdminVirtualCardControls.mockReset();
  });

  it("lists cards, updates controls and freezes a card", async () => {
    api.getAdminVirtualCards.mockResolvedValue([
      {
        card_id: "card-1",
        user_id: "user-1",
        linked_wallet_id: "wallet-1",
        cardholder_name: "Alice Demo",
        brand: "visa",
        card_type: "standard",
        currency_code: "USD",
        masked_pan: "4263 **** **** 1234",
        last4: "1234",
        exp_month: 4,
        exp_year: 2029,
        spending_limit: 100,
        spent_amount: 25,
        per_tx_limit: 20,
        daily_limit: 30,
        monthly_limit: 90,
        blocked_categories: ["betting"],
        daily_spent: 10,
        monthly_spent: 25,
        daily_remaining: 20,
        monthly_remaining: 65,
        consecutive_declines: 0,
        max_consecutive_declines: 3,
        auto_frozen_for_declines: false,
        last_decline_reason: null,
        status: "active",
        user_label: "Alice Demo",
        user_email: "alice@example.com",
        user_paytag: "@alice",
        transaction_count: 1,
        declined_count: 0,
        utilization_percent: 25,
        transactions: [],
        created_at: "2026-04-06T10:00:00Z",
        updated_at: "2026-04-06T10:00:00Z",
      },
    ]);
    api.getAdminVirtualCardDetail.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "standard",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 100,
      spent_amount: 25,
      per_tx_limit: 20,
      daily_limit: 30,
      monthly_limit: 90,
      blocked_categories: ["betting"],
      daily_spent: 10,
      monthly_spent: 25,
      daily_remaining: 20,
      monthly_remaining: 65,
      consecutive_declines: 0,
      max_consecutive_declines: 3,
      auto_frozen_for_declines: false,
      last_decline_reason: null,
      status: "active",
      user_label: "Alice Demo",
      user_email: "alice@example.com",
      user_paytag: "@alice",
      transaction_count: 1,
      declined_count: 0,
      utilization_percent: 25,
      transactions: [
        {
          card_tx_id: "ctx-1",
          merchant_name: "Netflix",
          merchant_category: "streaming",
          amount: 25,
          currency_code: "USD",
          status: "authorized",
          reference: "tx-1",
          created_at: "2026-04-06T10:05:00Z",
        },
      ],
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:05:00Z",
    });
    api.updateAdminVirtualCardControls.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "standard",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 100,
      spent_amount: 25,
      per_tx_limit: 20,
      daily_limit: 35,
      monthly_limit: 95,
      blocked_categories: ["betting", "streaming"],
      daily_spent: 10,
      monthly_spent: 25,
      daily_remaining: 25,
      monthly_remaining: 70,
      consecutive_declines: 0,
      max_consecutive_declines: 4,
      auto_frozen_for_declines: false,
      last_decline_reason: null,
      status: "active",
      user_label: "Alice Demo",
      user_email: "alice@example.com",
      user_paytag: "@alice",
      transaction_count: 1,
      declined_count: 0,
      utilization_percent: 25,
      transactions: [
        {
          card_tx_id: "ctx-1",
          merchant_name: "Netflix",
          merchant_category: "streaming",
          amount: 25,
          currency_code: "USD",
          status: "authorized",
          reference: "tx-1",
          created_at: "2026-04-06T10:05:00Z",
        },
      ],
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:06:00Z",
    });
    api.updateAdminVirtualCardStatus.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "standard",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 100,
      spent_amount: 25,
      per_tx_limit: 20,
      daily_limit: 35,
      monthly_limit: 95,
      blocked_categories: ["betting", "streaming"],
      daily_spent: 10,
      monthly_spent: 25,
      daily_remaining: 25,
      monthly_remaining: 70,
      consecutive_declines: 0,
      max_consecutive_declines: 4,
      auto_frozen_for_declines: false,
      last_decline_reason: null,
      status: "frozen",
      user_label: "Alice Demo",
      user_email: "alice@example.com",
      user_paytag: "@alice",
      transaction_count: 1,
      declined_count: 0,
      utilization_percent: 25,
      transactions: [
        {
          card_tx_id: "ctx-1",
          merchant_name: "Netflix",
          merchant_category: "streaming",
          amount: 25,
          currency_code: "USD",
          status: "authorized",
          reference: "tx-1",
          created_at: "2026-04-06T10:05:00Z",
        },
      ],
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:06:00Z",
    });

    renderPage();

    expect(await screen.findByText(/Cartes virtuelles/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alice Demo/i)).toBeInTheDocument();
    expect(await screen.findByText(/Netflix/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Admin plafond journalier carte virtuelle/i), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText(/Admin plafond transaction carte virtuelle/i), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText(/Admin plafond mensuel carte virtuelle/i), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByLabelText(/Admin refus consecutifs max carte virtuelle/i), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText(/Admin categories bloquees carte virtuelle/i), {
      target: { value: "betting, streaming" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/i }));

    await waitFor(() => {
      expect(api.updateAdminVirtualCardControls).toHaveBeenCalledWith("card-1", {
        per_tx_limit: 20,
        daily_limit: 35,
        monthly_limit: 95,
        max_consecutive_declines: 4,
        blocked_categories: ["betting", "streaming"],
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Geler/i }));

    await waitFor(() => {
      expect(api.updateAdminVirtualCardStatus).toHaveBeenCalledWith("card-1", { status: "frozen" });
    });

    expect(await screen.findAllByText(/frozen/i)).not.toHaveLength(0);
  });
});
