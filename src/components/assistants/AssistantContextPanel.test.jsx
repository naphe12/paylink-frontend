import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AssistantContextPanel from "@/components/assistants/AssistantContextPanel";

describe("AssistantContextPanel", () => {
  it("renders wallet support context with remaining limits and account signals", () => {
    render(
      <AssistantContextPanel
        assistantKey="wallet_support"
        summary={{
          next_step: "Verifier le dernier retrait en attente",
          eta_hint: "Sous 24 heures",
          dossier_type: "withdraw_blocked",
          who_must_act_now: "operations",
          primary_blocker: "Derniere demande de retrait: pending.",
          wallet_currency: "EUR",
          daily_limit: "1000",
          used_daily: "250",
          monthly_limit: "5000",
          used_monthly: "1300",
          account_status: "active",
          kyc_status: "verified",
          total_capacity: "780",
        }}
      />
    );

    expect(screen.getByText("Prochaine action")).toBeInTheDocument();
    expect(screen.getByText("Verifier le dernier retrait en attente")).toBeInTheDocument();
    expect(screen.getByText("Type de dossier")).toBeInTheDocument();
    expect(screen.getByText("Acteur attendu")).toBeInTheDocument();
    expect(screen.getByText("Derniere demande de retrait: pending.")).toBeInTheDocument();
    expect(screen.getByText("Reste journalier")).toBeInTheDocument();
    expect(screen.getByText("750 EUR")).toBeInTheDocument();
    expect(screen.getByText("Statut compte")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("Capacite totale")).toBeInTheDocument();
    expect(screen.getByText("780 EUR")).toBeInTheDocument();
  });

  it("renders transfer, escrow and p2p specialized context items", () => {
    const { rerender } = render(
      <AssistantContextPanel
        assistantKey="transfer_support"
        summary={{
          reference_code: "EXT-1234",
          dossier_type: "funding",
          who_must_act_now: "client",
          transfer_status: "pending",
          transaction_status: "created",
          review_reasons: ["limit_daily_exceeded"],
          primary_blocker: "Couverture financiere manquante de 75.",
          wallet_currency: "EUR",
          total_capacity: "400",
          shortfall_amount: "75",
        }}
      />
    );

    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("EXT-1234")).toBeInTheDocument();
    expect(screen.getByText("Type de dossier")).toBeInTheDocument();
    expect(screen.getByText("Acteur attendu")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Blocage principal")).toBeInTheDocument();
    expect(screen.getByText("Couverture financiere manquante de 75.")).toBeInTheDocument();
    expect(screen.getByText("Ecart a couvrir")).toBeInTheDocument();
    expect(screen.getByText("75 EUR")).toBeInTheDocument();

    rerender(
      <AssistantContextPanel
        assistantKey="escrow"
        summary={{
          order_id: "ORD-77",
          dossier_type: "review",
          who_must_act_now: "operations",
          status: "PAYOUT_PENDING",
          pending_reasons: ["operator_review"],
          primary_blocker: "Le payout est en cours de traitement ou de verification operateur.",
          usdc_expected: "120",
          bif_target: "350000",
        }}
      />
    );

    expect(screen.getByText("Commande")).toBeInTheDocument();
    expect(screen.getByText("ORD-77")).toBeInTheDocument();
    expect(screen.getByText("Type de dossier")).toBeInTheDocument();
    expect(screen.getByText("En revue")).toBeInTheDocument();
    expect(screen.getByText("Acteur attendu")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Blocage principal")).toBeInTheDocument();
    expect(screen.getByText("Le payout est en cours de traitement ou de verification operateur.")).toBeInTheDocument();
    expect(screen.getByText("120 USDC")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("350") && content.includes("BIF"))).toBeInTheDocument();

    rerender(
      <AssistantContextPanel
        assistantKey="p2p"
        summary={{
          trade_id: "TR-99",
          dossier_type: "dispute",
          who_must_act_now: "operations",
          current_user_role: "buyer",
          status: "DISPUTED",
          blocked_reasons: ["payment_not_confirmed"],
          primary_blocker: "Un litige est ouvert sur ce trade.",
          token_amount: "50",
          token: "USDT",
          bif_amount: "145000",
          open_offers_count: 3,
        }}
      />
    );

    expect(screen.getByText("Trade")).toBeInTheDocument();
    expect(screen.getByText("TR-99")).toBeInTheDocument();
    expect(screen.getByText("Litige")).toBeInTheDocument();
    expect(screen.getByText("Acheteur")).toBeInTheDocument();
    expect(screen.getByText("Blocage principal")).toBeInTheDocument();
    expect(screen.getByText("Un litige est ouvert sur ce trade.")).toBeInTheDocument();
    expect(screen.getByText("50 USDT")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("145") && content.includes("BIF"))).toBeInTheDocument();
    expect(screen.getByText("Offres actives")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("emits contextual prompts and exposes dossier links", () => {
    const onPick = vi.fn();

    const { rerender } = render(
      <AssistantContextPanel
        assistantKey="escrow"
        onPick={onPick}
        summary={{
          order_id: "ORD-88",
          next_step: "Attendre la verification du payout",
          pending_reasons: ["operator_review"],
        }}
      />
    );

    fireEvent.click(screen.getByText("Creuser la prochaine etape"));
    expect(onPick).toHaveBeenCalledWith("quelle est la prochaine etape de mon escrow ?");
    expect(screen.getByText("Ouvrir le suivi escrow")).toHaveAttribute("href", "/dashboard/client/crypto-pay/ORD-88");

    rerender(
      <AssistantContextPanel
        assistantKey="p2p"
        onPick={onPick}
        summary={{
          trade_id: "TR-55",
          next_step: "Le vendeur doit confirmer le paiement",
          blocked_reasons: ["payment_not_confirmed"],
        }}
      />
    );

    fireEvent.click(screen.getByText("Expliquer le blocage"));
    expect(onPick).toHaveBeenCalledWith("pourquoi mon trade p2p est bloque ?");
    expect(screen.getByText("Ouvrir la room P2P")).toHaveAttribute("href", "/app/p2p/trades/TR-55");
  });
});
