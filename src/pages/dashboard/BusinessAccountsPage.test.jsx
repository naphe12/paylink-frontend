import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BusinessAccountsPage from "@/pages/dashboard/BusinessAccountsPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listBusinessAccounts: vi.fn(),
    createBusinessAccount: vi.fn(),
    addBusinessMember: vi.fn(),
    updateBusinessMember: vi.fn(),
    createBusinessSubWallet: vi.fn(),
    updateBusinessSubWallet: vi.fn(),
    fundBusinessSubWallet: vi.fn(),
    releaseBusinessSubWallet: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BusinessAccountsPage />
    </MemoryRouter>
  );
}

describe("BusinessAccountsPage", () => {
  beforeEach(() => {
    api.listBusinessAccounts.mockReset();
    api.createBusinessAccount.mockReset();
    api.addBusinessMember.mockReset();
    api.updateBusinessMember.mockReset();
    api.createBusinessSubWallet.mockReset();
    api.updateBusinessSubWallet.mockReset();
    api.fundBusinessSubWallet.mockReset();
    api.releaseBusinessSubWallet.mockReset();
  });

  it("creates a business account, adds a member and creates a sub-wallet", async () => {
    api.listBusinessAccounts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          business_id: "biz-1",
          legal_name: "Boutique Alpha SARL",
          display_name: "Boutique Alpha",
          current_membership_role: "owner",
          sub_wallets: [],
          members: [{ membership_id: "m-1", member_label: "@owner", role: "owner", status: "active" }],
        },
      ])
      .mockResolvedValueOnce([
        {
          business_id: "biz-1",
          legal_name: "Boutique Alpha SARL",
          display_name: "Boutique Alpha",
          current_membership_role: "owner",
          sub_wallets: [],
          members: [
            { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active" },
            { membership_id: "m-2", member_label: "@cashier", role: "cashier", status: "active" },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          business_id: "biz-1",
          legal_name: "Boutique Alpha SARL",
          display_name: "Boutique Alpha",
          current_membership_role: "owner",
          sub_wallets: [
            { sub_wallet_id: "sw-1", label: "Caisse boutique", current_amount: 0, spending_limit: 50000, currency_code: "BIF", status: "active" },
          ],
          members: [
            { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active" },
            { membership_id: "m-2", member_label: "@cashier", role: "cashier", status: "active", user_id: "u-2" },
          ],
        },
      ]);
    api.createBusinessAccount.mockResolvedValue({ business_id: "biz-1" });
    api.addBusinessMember.mockResolvedValue({
      business_id: "biz-1",
      legal_name: "Boutique Alpha SARL",
      display_name: "Boutique Alpha",
      current_membership_role: "owner",
      sub_wallets: [],
      members: [
        { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active" },
        { membership_id: "m-2", member_label: "@cashier", role: "cashier", status: "active" },
      ],
    });
    api.createBusinessSubWallet.mockResolvedValue({
      business_id: "biz-1",
      legal_name: "Boutique Alpha SARL",
      display_name: "Boutique Alpha",
      current_membership_role: "owner",
      sub_wallets: [
        { sub_wallet_id: "sw-1", label: "Caisse boutique", current_amount: 0, spending_limit: 50000, currency_code: "BIF", status: "active" },
      ],
      members: [
        { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active" },
        { membership_id: "m-2", member_label: "@cashier", role: "cashier", status: "active", user_id: "u-2" },
      ],
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/Raison sociale business/i), {
      target: { value: "Boutique Alpha SARL" },
    });
    fireEvent.change(screen.getByLabelText(/Nom affichage business/i), {
      target: { value: "Boutique Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Creer le compte business/i }));

    await waitFor(() => {
      expect(api.createBusinessAccount).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText(/Identifiant membre business/i), {
      target: { value: "@cashier" },
    });
    fireEvent.change(screen.getByLabelText(/Role membre business/i), {
      target: { value: "cashier" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));

    await waitFor(() => {
      expect(api.addBusinessMember).toHaveBeenCalledWith("biz-1", {
        identifier: "@cashier",
        role: "cashier",
      });
    });

    fireEvent.change(screen.getByLabelText(/Label sous wallet business/i), {
      target: { value: "Caisse boutique" },
    });
    fireEvent.change(screen.getByLabelText(/Limite sous wallet business/i), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Creer$/i }));

    await waitFor(() => {
      expect(api.createBusinessSubWallet).toHaveBeenCalledWith("biz-1", {
        label: "Caisse boutique",
        spending_limit: 50000,
        assigned_user_id: null,
      });
    });
  });

  it("disables management actions for a viewer membership", async () => {
    api.listBusinessAccounts.mockResolvedValue([
      {
        business_id: "biz-view",
        legal_name: "Lecture SARL",
        display_name: "Lecture",
        current_membership_role: "viewer",
        sub_wallets: [],
        members: [{ membership_id: "m-1", member_label: "@viewer", role: "viewer", status: "active" }],
      },
    ]);

    renderPage();

    expect(await screen.findByText(/Lecture seule/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Creer$/i })).toBeDisabled();
  });

  it("updates a business member and sub-wallet settings", async () => {
    api.listBusinessAccounts
      .mockResolvedValueOnce([
        {
          business_id: "biz-2",
          legal_name: "Market Beta SARL",
          display_name: "Market Beta",
          current_membership_role: "owner",
          members: [
            { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active", user_id: "u-1" },
            { membership_id: "m-2", member_label: "@cashier", role: "cashier", status: "active", user_id: "u-2" },
          ],
          sub_wallets: [
            {
              sub_wallet_id: "sw-2",
              label: "Caisse mobile",
              current_amount: 12000,
              spending_limit: 30000,
              currency_code: "BIF",
              status: "active",
              assigned_user_id: "u-2",
              assigned_label: "@cashier",
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          business_id: "biz-2",
          legal_name: "Market Beta SARL",
          display_name: "Market Beta",
          current_membership_role: "owner",
          members: [
            { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active", user_id: "u-1" },
            { membership_id: "m-2", member_label: "@cashier", role: "admin", status: "inactive", user_id: "u-2" },
          ],
          sub_wallets: [
            {
              sub_wallet_id: "sw-2",
              label: "Caisse mobile",
              current_amount: 12000,
              spending_limit: 30000,
              currency_code: "BIF",
              status: "active",
              assigned_user_id: "u-2",
              assigned_label: "@cashier",
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          business_id: "biz-2",
          legal_name: "Market Beta SARL",
          display_name: "Market Beta",
          current_membership_role: "owner",
          members: [
            { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active", user_id: "u-1" },
            { membership_id: "m-2", member_label: "@cashier", role: "admin", status: "inactive", user_id: "u-2" },
          ],
          sub_wallets: [
            {
              sub_wallet_id: "sw-2",
              label: "Caisse terrain",
              current_amount: 12000,
              spending_limit: 45000,
              currency_code: "BIF",
              status: "suspended",
              assigned_user_id: "",
              assigned_label: null,
            },
          ],
        },
      ]);
    api.updateBusinessMember.mockResolvedValue({
      business_id: "biz-2",
      legal_name: "Market Beta SARL",
      display_name: "Market Beta",
      current_membership_role: "owner",
      members: [
        { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active", user_id: "u-1" },
        { membership_id: "m-2", member_label: "@cashier", role: "admin", status: "inactive", user_id: "u-2" },
      ],
      sub_wallets: [
        {
          sub_wallet_id: "sw-2",
          label: "Caisse mobile",
          current_amount: 12000,
          spending_limit: 30000,
          currency_code: "BIF",
          status: "active",
          assigned_user_id: "u-2",
          assigned_label: "@cashier",
        },
      ],
    });
    api.updateBusinessSubWallet.mockResolvedValue({
      business_id: "biz-2",
      legal_name: "Market Beta SARL",
      display_name: "Market Beta",
      current_membership_role: "owner",
      members: [
        { membership_id: "m-1", member_label: "@owner", role: "owner", status: "active", user_id: "u-1" },
        { membership_id: "m-2", member_label: "@cashier", role: "admin", status: "inactive", user_id: "u-2" },
      ],
      sub_wallets: [
        {
          sub_wallet_id: "sw-2",
          label: "Caisse terrain",
          current_amount: 12000,
          spending_limit: 45000,
          currency_code: "BIF",
          status: "suspended",
          assigned_user_id: "",
          assigned_label: null,
        },
      ],
    });

    renderPage();

    expect((await screen.findAllByText(/Market Beta/i)).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Role edition membre @cashier/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/Statut edition membre @cashier/i), {
      target: { value: "inactive" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Mettre a jour/i }));

    await waitFor(() => {
      expect(api.updateBusinessMember).toHaveBeenCalledWith("biz-2", "m-2", {
        role: "admin",
        status: "inactive",
      });
    });
    expect(await screen.findByText(/Membre business mis a jour/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Label edition sous wallet Caisse mobile/i), {
      target: { value: "Caisse terrain" },
    });
    fireEvent.change(screen.getByLabelText(/Limite edition sous wallet Caisse mobile/i), {
      target: { value: "45000" },
    });
    fireEvent.change(screen.getByLabelText(/Assignation edition sous wallet Caisse mobile/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/Statut edition sous wallet Caisse mobile/i), {
      target: { value: "suspended" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer les reglages/i }));

    await waitFor(() => {
      expect(api.updateBusinessSubWallet).toHaveBeenCalledWith("sw-2", {
        label: "Caisse terrain",
        spending_limit: 45000,
        assigned_user_id: null,
        status: "suspended",
      });
    });
  });
});
