import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SavingsGoalsPage from "@/pages/dashboard/SavingsGoalsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listSavingsGoals: vi.fn(),
    createSavingsGoal: vi.fn(),
    getSavingsGoalDetail: vi.fn(),
    contributeSavingsGoal: vi.fn(),
    withdrawSavingsGoal: vi.fn(),
    configureSavingsGoalRoundUp: vi.fn(),
    applySavingsGoalRoundUp: vi.fn(),
    configureSavingsGoalAutoContribution: vi.fn(),
    runSavingsGoalAutoContribution: vi.fn(),
    runDueSavingsAutoContributions: vi.fn(),
  },
}));

function buildRoundUpRule(overrides = {}) {
  return {
    enabled: false,
    increment: null,
    max_amount: null,
    last_applied_at: null,
    updated_at: null,
    ...overrides,
  };
}

function buildAutoContributionRule(overrides = {}) {
  return {
    enabled: false,
    amount: null,
    frequency: null,
    next_run_at: null,
    last_applied_at: null,
    updated_at: null,
    is_due: false,
    ...overrides,
  };
}

function buildGoal(overrides = {}) {
  const goal = {
    goal_id: "goal-1",
    user_id: "user-1",
    title: "Objectif epargne",
    note: null,
    current_amount: 0,
    target_amount: 500,
    currency_code: "BIF",
    progress_percent: 0,
    remaining_amount: 500,
    status: "active",
    locked: false,
    target_date: null,
    metadata: {},
    created_at: "2026-04-06T08:00:00Z",
    updated_at: "2026-04-06T08:00:00Z",
    round_up_rule: buildRoundUpRule(),
    auto_contribution_rule: buildAutoContributionRule(),
    movements: [],
    ...overrides,
  };
  goal.round_up_rule = buildRoundUpRule(overrides.round_up_rule);
  goal.auto_contribution_rule = buildAutoContributionRule(overrides.auto_contribution_rule);
  goal.movements = overrides.movements ?? [];
  return goal;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SavingsGoalsPage />
    </MemoryRouter>
  );
}

describe("SavingsGoalsPage", () => {
  beforeEach(() => {
    api.listSavingsGoals.mockReset();
    api.createSavingsGoal.mockReset();
    api.getSavingsGoalDetail.mockReset();
    api.contributeSavingsGoal.mockReset();
    api.withdrawSavingsGoal.mockReset();
    api.configureSavingsGoalRoundUp.mockReset();
    api.applySavingsGoalRoundUp.mockReset();
    api.configureSavingsGoalAutoContribution.mockReset();
    api.runSavingsGoalAutoContribution.mockReset();
    api.runDueSavingsAutoContributions.mockReset();
  });

  it("creates a goal then contributes to it", async () => {
    api.listSavingsGoals
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        buildGoal({
          title: "Frais scolaires",
        }),
      ])
      .mockResolvedValueOnce([
        buildGoal({
          title: "Frais scolaires",
          current_amount: 150,
          progress_percent: 30,
          remaining_amount: 350,
          movements: [
            {
              movement_id: "mov-1",
              direction: "in",
              amount: 150,
              currency_code: "BIF",
              source: "manual",
              created_at: "2026-04-05T10:00:00Z",
            },
          ],
        }),
      ]);
    api.createSavingsGoal.mockResolvedValue({ goal_id: "goal-1" });
    api.getSavingsGoalDetail
      .mockResolvedValueOnce(
        buildGoal({
          title: "Frais scolaires",
        })
      )
      .mockResolvedValueOnce(
        buildGoal({
          title: "Frais scolaires",
          current_amount: 150,
          progress_percent: 30,
          remaining_amount: 350,
          movements: [
            {
              movement_id: "mov-1",
              direction: "in",
              amount: 150,
              currency_code: "BIF",
              source: "manual",
              created_at: "2026-04-05T10:00:00Z",
            },
          ],
        })
      );
    api.contributeSavingsGoal.mockResolvedValue(
      buildGoal({
        title: "Frais scolaires",
        current_amount: 150,
        progress_percent: 30,
        remaining_amount: 350,
        movements: [
          {
            movement_id: "mov-1",
            direction: "in",
            amount: 150,
            currency_code: "BIF",
            source: "manual",
            created_at: "2026-04-05T10:00:00Z",
          },
        ],
      })
    );

    renderPage();

    fireEvent.change(screen.getByLabelText(/Titre objectif epargne/i), {
      target: { value: "Frais scolaires" },
    });
    fireEvent.change(screen.getByLabelText(/Montant cible epargne/i), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Creer l'objectif/i }));

    await waitFor(() => {
      expect(api.createSavingsGoal).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Objectif d'epargne cree/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Montant mouvement epargne/i), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Alimenter/i }));

    await waitFor(() => {
      expect(api.contributeSavingsGoal).toHaveBeenCalledWith("goal-1", { amount: 150 });
    });
  });

  it("configures and applies a round-up rule", async () => {
    api.listSavingsGoals.mockResolvedValue([
      buildGoal({
        title: "Voyage",
        current_amount: 250,
        target_amount: 1000,
        progress_percent: 25,
        remaining_amount: 750,
      }),
    ]);
    api.getSavingsGoalDetail
      .mockResolvedValueOnce(
        buildGoal({
          title: "Voyage",
          current_amount: 250,
          target_amount: 1000,
          progress_percent: 25,
          remaining_amount: 750,
        })
      )
      .mockResolvedValueOnce(
        buildGoal({
          title: "Voyage",
          current_amount: 250,
          target_amount: 1000,
          progress_percent: 25,
          remaining_amount: 750,
          round_up_rule: { enabled: true, increment: 100, max_amount: 50 },
        })
      )
      .mockResolvedValueOnce(
        buildGoal({
          title: "Voyage",
          current_amount: 292,
          target_amount: 1000,
          progress_percent: 29.2,
          remaining_amount: 708,
          round_up_rule: {
            enabled: true,
            increment: 100,
            max_amount: 50,
            last_applied_at: "2026-04-06T11:00:00Z",
          },
          movements: [
            {
              movement_id: "mov-2",
              direction: "in",
              amount: 42,
              currency_code: "BIF",
              source: "round_up",
              created_at: "2026-04-06T11:00:00Z",
            },
          ],
        })
      );
    api.configureSavingsGoalRoundUp.mockResolvedValue(
      buildGoal({
        title: "Voyage",
        current_amount: 250,
        target_amount: 1000,
        progress_percent: 25,
        remaining_amount: 750,
        round_up_rule: { enabled: true, increment: 100, max_amount: 50 },
      })
    );
    api.applySavingsGoalRoundUp.mockResolvedValue(
      buildGoal({
        title: "Voyage",
        current_amount: 292,
        target_amount: 1000,
        progress_percent: 29.2,
        remaining_amount: 708,
        round_up_rule: {
          enabled: true,
          increment: 100,
          max_amount: 50,
          last_applied_at: "2026-04-06T11:00:00Z",
        },
        movements: [
          {
            movement_id: "mov-2",
            direction: "in",
            amount: 42,
            currency_code: "BIF",
            source: "round_up",
            created_at: "2026-04-06T11:00:00Z",
          },
        ],
      })
    );

    renderPage();

    expect((await screen.findAllByText(/Voyage/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText(/Activer l'arrondi/i));
    fireEvent.change(screen.getByLabelText(/Palier arrondi epargne/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Plafond arrondi epargne/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer la regle/i }));

    await waitFor(() => {
      expect(api.configureSavingsGoalRoundUp).toHaveBeenCalledWith("goal-1", {
        enabled: true,
        increment: 100,
        max_amount: 50,
      });
    });

    expect(await screen.findByText(/Statut: actif/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Montant depense arrondi epargne/i), {
      target: { value: "458" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Appliquer l'arrondi/i }));

    await waitFor(() => {
      expect(api.applySavingsGoalRoundUp).toHaveBeenCalledWith("goal-1", {
        spent_amount: 458,
      });
    });
  });

  it("configures and executes an automatic contribution", async () => {
    api.listSavingsGoals
      .mockResolvedValueOnce([
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 400,
          target_amount: 2000,
          progress_percent: 20,
          remaining_amount: 1600,
        }),
      ])
      .mockResolvedValueOnce([
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 400,
          target_amount: 2000,
          progress_percent: 20,
          remaining_amount: 1600,
          auto_contribution_rule: {
            enabled: true,
            amount: 200,
            frequency: "weekly",
            next_run_at: "2026-04-06T09:00:00Z",
            is_due: true,
          },
        }),
      ])
      .mockResolvedValueOnce([
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 600,
          target_amount: 2000,
          progress_percent: 30,
          remaining_amount: 1400,
          auto_contribution_rule: {
            enabled: true,
            amount: 200,
            frequency: "weekly",
            next_run_at: "2026-04-13T09:00:00Z",
            last_applied_at: "2026-04-06T09:15:00Z",
            is_due: false,
          },
        }),
      ]);
    api.getSavingsGoalDetail
      .mockResolvedValueOnce(
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 400,
          target_amount: 2000,
          progress_percent: 20,
          remaining_amount: 1600,
        })
      )
      .mockResolvedValueOnce(
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 400,
          target_amount: 2000,
          progress_percent: 20,
          remaining_amount: 1600,
          auto_contribution_rule: {
            enabled: true,
            amount: 200,
            frequency: "weekly",
            next_run_at: "2026-04-06T09:00:00Z",
            is_due: true,
          },
        })
      )
      .mockResolvedValueOnce(
        buildGoal({
          goal_id: "goal-2",
          title: "Maison",
          current_amount: 600,
          target_amount: 2000,
          progress_percent: 30,
          remaining_amount: 1400,
          auto_contribution_rule: {
            enabled: true,
            amount: 200,
            frequency: "weekly",
            next_run_at: "2026-04-13T09:00:00Z",
            last_applied_at: "2026-04-06T09:15:00Z",
            is_due: false,
          },
        })
      );
    api.configureSavingsGoalAutoContribution.mockResolvedValue(
      buildGoal({
        goal_id: "goal-2",
        title: "Maison",
        current_amount: 400,
        target_amount: 2000,
        progress_percent: 20,
        remaining_amount: 1600,
        auto_contribution_rule: {
          enabled: true,
          amount: 200,
          frequency: "weekly",
          next_run_at: "2026-04-06T09:00:00Z",
          is_due: true,
        },
      })
    );
    api.runSavingsGoalAutoContribution.mockResolvedValue(
      buildGoal({
        goal_id: "goal-2",
        title: "Maison",
        current_amount: 600,
        target_amount: 2000,
        progress_percent: 30,
        remaining_amount: 1400,
        auto_contribution_rule: {
          enabled: true,
          amount: 200,
          frequency: "weekly",
          next_run_at: "2026-04-13T09:00:00Z",
          last_applied_at: "2026-04-06T09:15:00Z",
          is_due: false,
        },
      })
    );
    api.runDueSavingsAutoContributions.mockResolvedValue([]);

    renderPage();

    expect((await screen.findAllByText(/Maison/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText(/^Activer$/i));
    fireEvent.change(screen.getByLabelText(/Montant contribution automatique epargne/i), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText(/Frequence contribution automatique epargne/i), {
      target: { value: "weekly" },
    });
    fireEvent.change(screen.getByLabelText(/Prochaine contribution automatique epargne/i), {
      target: { value: "2026-04-06T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer la contribution auto/i }));

    await waitFor(() => {
      expect(api.configureSavingsGoalAutoContribution).toHaveBeenCalledWith("goal-2", {
        enabled: true,
        amount: 200,
        frequency: "weekly",
        next_run_at: new Date("2026-04-06T09:00").toISOString(),
      });
    });

    expect(await screen.findByText(/1 due/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Executer maintenant/i }));

    await waitFor(() => {
      expect(api.runSavingsGoalAutoContribution).toHaveBeenCalledWith("goal-2", {});
    });
  });
});
