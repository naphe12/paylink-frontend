import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VirtualCardsPage from "@/pages/dashboard/VirtualCardsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listVirtualCards: vi.fn(),
    createVirtualCard: vi.fn(),
    getVirtualCardDetail: vi.fn(),
    updateVirtualCardStatus: vi.fn(),
    updateVirtualCardControls: vi.fn(),
    chargeVirtualCard: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <VirtualCardsPage />
    </MemoryRouter>
  );
}

describe("VirtualCardsPage", () => {
  beforeEach(() => {
    api.listVirtualCards.mockReset();
    api.createVirtualCard.mockReset();
    api.getVirtualCardDetail.mockReset();
    api.updateVirtualCardStatus.mockReset();
    api.updateVirtualCardControls.mockReset();
    api.chargeVirtualCard.mockReset();
  });

  it("creates a virtual card, updates controls and simulates an online charge", async () => {
    api.listVirtualCards.mockResolvedValue([]);
    api.createVirtualCard.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "single_use",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 50,
      spent_amount: 0,
      daily_limit: 20,
      monthly_limit: 40,
      blocked_categories: ["betting"],
      daily_spent: 0,
      monthly_spent: 0,
      daily_remaining: 20,
      monthly_remaining: 40,
      last_decline_reason: null,
      status: "active",
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:00:00Z",
      plain_pan: "4263901234561234",
      plain_cvv: "123",
      transactions: [],
    });
    api.updateVirtualCardControls.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "single_use",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 50,
      spent_amount: 0,
      daily_limit: 25,
      monthly_limit: 45,
      blocked_categories: ["betting", "streaming"],
      daily_spent: 0,
      monthly_spent: 0,
      daily_remaining: 25,
      monthly_remaining: 45,
      last_decline_reason: null,
      status: "active",
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:03:00Z",
      transactions: [],
    });
    api.chargeVirtualCard.mockResolvedValue({
      card_id: "card-1",
      user_id: "user-1",
      linked_wallet_id: "wallet-1",
      cardholder_name: "Alice Demo",
      brand: "visa",
      card_type: "single_use",
      currency_code: "USD",
      masked_pan: "4263 **** **** 1234",
      last4: "1234",
      exp_month: 4,
      exp_year: 2029,
      spending_limit: 50,
      spent_amount: 25,
      daily_limit: 25,
      monthly_limit: 45,
      blocked_categories: ["betting", "streaming"],
      daily_spent: 25,
      monthly_spent: 25,
      daily_remaining: 0,
      monthly_remaining: 20,
      last_decline_reason: null,
      status: "consumed",
      created_at: "2026-04-06T10:00:00Z",
      updated_at: "2026-04-06T10:05:00Z",
      transactions: [
        {
          card_tx_id: "ctx-1",
          card_id: "card-1",
          user_id: "user-1",
          merchant_name: "Super Marche",
          merchant_category: "groceries",
          amount: 25,
          currency_code: "USD",
          status: "authorized",
          decline_reason: null,
          reference: "tx-001",
          created_at: "2026-04-06T10:05:00Z",
        },
      ],
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/Nom porteur carte virtuelle/i), {
      target: { value: "Alice Demo" },
    });
    fireEvent.change(screen.getByLabelText(/Type carte virtuelle/i), {
      target: { value: "single_use" },
    });
    fireEvent.change(screen.getByLabelText(/^Plafond carte virtuelle$/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/Plafond journalier carte virtuelle/i), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText(/Plafond mensuel carte virtuelle/i), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByLabelText(/Categories bloquees carte virtuelle/i), {
      target: { value: "betting" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Emettre la carte/i }));

    await waitFor(() => {
      expect(api.createVirtualCard).toHaveBeenCalledWith({
        cardholder_name: "Alice Demo",
        card_type: "single_use",
        spending_limit: 50,
        daily_limit: 20,
        monthly_limit: 40,
        blocked_categories: ["betting"],
      });
    });

    expect(await screen.findByText(/4263901234561234/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Edition plafond journalier carte virtuelle/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/Edition plafond mensuel carte virtuelle/i), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText(/Edition categories bloquees carte virtuelle/i), {
      target: { value: "betting, streaming" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/i }));

    await waitFor(() => {
      expect(api.updateVirtualCardControls).toHaveBeenCalledWith("card-1", {
        daily_limit: 25,
        monthly_limit: 45,
        blocked_categories: ["betting", "streaming"],
      });
    });

    fireEvent.change(screen.getByLabelText(/^Marchand carte virtuelle$/i), {
      target: { value: "Super Marche" },
    });
    fireEvent.change(screen.getByLabelText(/^Categorie marchand carte virtuelle$/i), {
      target: { value: "groceries" },
    });
    fireEvent.change(screen.getByLabelText(/Montant paiement carte virtuelle/i), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simuler l'achat/i }));

    await waitFor(() => {
      expect(api.chargeVirtualCard).toHaveBeenCalledWith("card-1", {
        merchant_name: "Super Marche",
        merchant_category: "groceries",
        amount: 25,
      });
    });

    expect(await screen.findByText(/Super Marche/i)).toBeInTheDocument();
    expect(screen.getAllByText(/consumed/i).length).toBeGreaterThan(0);
  });
});
