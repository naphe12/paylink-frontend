import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AmountEvolution from "./AmountEvolution";
import { evolutionRows } from "@/utils/amountEvolution";

const config = { before: "balance_before", after: "balance_after" };
describe("AmountEvolution", () => {
  it("sorts snapshots and excludes missing amounts and invalid dates", () => {
    const rows = evolutionRows([
      { occurred_at: "2000-02-02", balance_before: 20, balance_after: 0, currency: "EUR" },
      { occurred_at: "2000-02-01", balance_before: "10", balance_after: "20", currency: "EUR" },
      { occurred_at: "2000-02-03", balance_before: null, balance_after: 50 },
      { occurred_at: "invalid", balance_before: 0, balance_after: 1 },
    ], config);
    expect(rows.map((row) => row.after)).toEqual([20, 0]);
  });
  it("keeps currencies separate and calculates the signed change from the first before value", () => {
    const rows = evolutionRows([
      { occurred_at: "2000-02-01", balance_before: 100, balance_after: 60, currency: "EUR" },
      { occurred_at: "2000-02-02", balance_before: 60, balance_after: 80, currency: "EUR" },
      { occurred_at: "2000-02-01", balance_before: 1000, balance_after: 1200, currency: "USD" },
    ], config);
    render(<AmountEvolution title="Solde" rows={rows} />);
    const variation = screen.getByText("Variation observée").parentElement;
    expect(within(variation).getByText("-20 EUR")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Devise — Solde"), { target: { value: "USD" } });
    expect(within(variation).getByText("+200 USD")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Période — Solde"), { target: { value: "7" } });
    expect(screen.getByText("Aucun événement exploitable sur cette période.")).toBeInTheDocument();
  });
  it("distinguishes a load error from an empty history", () => {
    render(<AmountEvolution title="Solde" rows={[]} error="Historique indisponible" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Historique indisponible");
    expect(screen.queryByText("Aucun événement exploitable sur cette période.")).not.toBeInTheDocument();
  });
});
