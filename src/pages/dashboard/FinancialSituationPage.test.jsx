import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FinancialSituationPage from "@/pages/dashboard/FinancialSituationPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    getFinancialSummary: vi.fn(),
    getFinancialInsights: vi.fn(),
    upsertFinancialBudgetRule: vi.fn(),
    deleteFinancialBudgetRule: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <FinancialSituationPage />
    </MemoryRouter>
  );
}

describe("FinancialSituationPage", () => {
  beforeEach(() => {
    api.getFinancialSummary.mockReset();
    api.getFinancialInsights.mockReset();
    api.upsertFinancialBudgetRule.mockReset();
    api.deleteFinancialBudgetRule.mockReset();
  });

  it("shows financial insights with budget guidance and saves a budget rule", async () => {
    api.getFinancialSummary.mockResolvedValue({
      wallet_available: 250000,
      wallet_currency: "BIF",
      bonus_balance: 1200,
      credit_limit: 500,
      credit_available: 300,
      credit_used: 200,
      tontines_count: 2,
    });
    api.getFinancialInsights.mockResolvedValue({
      currency_code: "BIF",
      month_inflows: 400000,
      month_outflows: 280000,
      month_net: 120000,
      suggested_budget: 250000,
      active_budget: 300000,
      budget_source: "custom",
      remaining_to_spend: 20000,
      current_savings: 50000,
      budget_usage_percent: 93.33,
      daily_budget_allowance: 1111.11,
      projected_month_outflows: 350000,
      projected_overrun_amount: 50000,
      days_remaining_in_month: 18,
      pace_status: "at_risk",
      over_limit_count: 1,
      alert_level: "critical",
      alert_message: "Au moins une categorie depasse son plafond.",
      top_spending_categories: [
        {
          category: "transferts",
          amount: 200000,
          share_percent: 71.43,
          budget_limit: 180000,
          remaining_budget: 0,
          is_over_limit: true,
        },
      ],
      budget_rules: [
        {
          category: "transferts",
          limit_amount: 180000,
          spent_amount: 200000,
          remaining_amount: 0,
          progress_percent: 111.11,
          is_over_limit: true,
        },
      ],
      guidance: ["Vos depenses du mois depassent votre budget actif."],
    });
    api.upsertFinancialBudgetRule.mockResolvedValue({
      currency_code: "BIF",
      month_inflows: 400000,
      month_outflows: 280000,
      month_net: 120000,
      suggested_budget: 250000,
      active_budget: 320000,
      budget_source: "custom",
      remaining_to_spend: 40000,
      current_savings: 50000,
      budget_usage_percent: 87.5,
      daily_budget_allowance: 2222.22,
      projected_month_outflows: 290000,
      projected_overrun_amount: 0,
      days_remaining_in_month: 18,
      pace_status: "on_track",
      over_limit_count: 0,
      alert_level: "watch",
      alert_message: "Le budget du mois approche de sa limite.",
      top_spending_categories: [
        {
          category: "transferts",
          amount: 200000,
          share_percent: 71.43,
          budget_limit: 220000,
          remaining_budget: 20000,
          is_over_limit: false,
        },
      ],
      budget_rules: [
        {
          category: "transferts",
          limit_amount: 220000,
          spent_amount: 200000,
          remaining_amount: 20000,
          progress_percent: 90.91,
          is_over_limit: false,
        },
      ],
      guidance: ["Votre rythme de depense reste coherent avec votre historique recent."],
    });
    api.deleteFinancialBudgetRule.mockResolvedValue({
      currency_code: "BIF",
      month_inflows: 400000,
      month_outflows: 280000,
      month_net: 120000,
      suggested_budget: 250000,
      active_budget: 250000,
      budget_source: "suggested",
      remaining_to_spend: 0,
      current_savings: 50000,
      budget_usage_percent: 112,
      daily_budget_allowance: 0,
      projected_month_outflows: 336000,
      projected_overrun_amount: 86000,
      days_remaining_in_month: 0,
      pace_status: "at_risk",
      over_limit_count: 0,
      alert_level: "critical",
      alert_message: "Le budget mensuel est depasse.",
      top_spending_categories: [
        {
          category: "transferts",
          amount: 200000,
          share_percent: 71.43,
          budget_limit: null,
          remaining_budget: null,
          is_over_limit: false,
        },
      ],
      budget_rules: [],
      guidance: ["Vos depenses du mois depassent votre budget actif."],
    });

    renderPage();

    expect(await screen.findByText(/Assistant financier/i)).toBeInTheDocument();
    expect(await screen.findByText(/Postes de depense dominants/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/transferts/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Budget personnalise/i)).toBeInTheDocument();
    expect(await screen.findByText(/111.11%/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alerte budget/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cadence budgetaire/i)).toBeInTheDocument();
    expect(await screen.findByText(/Categories depassees: 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Projection fin de mois/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Categorie budgetaire/i), {
      target: { value: "transferts" },
    });
    fireEvent.change(screen.getByLabelText(/Montant budgetaire/i), {
      target: { value: "220000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(api.upsertFinancialBudgetRule).toHaveBeenCalledWith({
        category: "transferts",
        limit_amount: 220000,
      });
    });

    expect(await screen.findByText(/90.91%/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/20.?000 BIF/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Supprimer/i }));

    await waitFor(() => {
      expect(api.deleteFinancialBudgetRule).toHaveBeenCalledWith("transferts");
    });

    expect((await screen.findAllByText(/Budget suggere/i)).length).toBeGreaterThan(0);
  });
});
