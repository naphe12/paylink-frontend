import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MerchantApiPage from "@/pages/dashboard/MerchantApiPage";
import api from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    listBusinessAccounts: vi.fn(),
    getBusinessMerchantIntegration: vi.fn(),
    listBusinessPaymentRequests: vi.fn(),
    createBusinessPaymentRequest: vi.fn(),
    createMerchantApiKey: vi.fn(),
    revokeMerchantApiKey: vi.fn(),
    createMerchantWebhook: vi.fn(),
    updateMerchantWebhookStatus: vi.fn(),
    rotateMerchantWebhookSecret: vi.fn(),
    sendMerchantWebhookTest: vi.fn(),
    retryMerchantWebhookEvent: vi.fn(),
    retryDueMerchantWebhookEvents: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MerchantApiPage />
    </MemoryRouter>
  );
}

describe("MerchantApiPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
  });

  it("creates merchant key, webhook and payment link", async () => {
    api.listBusinessAccounts.mockResolvedValue([
      { business_id: "biz-1", display_name: "Alpha Shop", legal_name: "Alpha Shop SARL" },
    ]);
    api.listBusinessPaymentRequests
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          request_id: "req-1",
          amount: 45,
          currency_code: "USD",
          status: "pending",
          title: "Commande #42",
          share_token: "PR-BIZ1",
          expires_at: "2026-04-06T12:00:00Z",
          requester_label: "Alpha Shop",
          payer_label: null,
          metadata: { merchant_reference: "CMD-42" },
        },
      ]);
    api.getBusinessMerchantIntegration
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [],
        webhooks: [],
        recent_events: [],
      })
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [{ key_id: "key-1", key_name: "Serveur prod", key_prefix: "pk_live_alpha", is_active: true, metadata: { last4: "9z9z" } }],
        webhooks: [],
        recent_events: [],
      })
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [{ key_id: "key-1", key_name: "Serveur prod", key_prefix: "pk_live_alpha", is_active: true, metadata: { last4: "9z9z" } }],
        webhooks: [{ webhook_id: "wh-1", target_url: "https://merchant.example.com/webhook", status: "active", event_types: ["payment.request.paid"] }],
        recent_events: [],
      })
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [{ key_id: "key-1", key_name: "Serveur prod", key_prefix: "pk_live_alpha", is_active: true, metadata: { last4: "9z9z" } }],
        webhooks: [{ webhook_id: "wh-1", target_url: "https://merchant.example.com/webhook", status: "active", event_types: ["payment.request.paid"] }],
        recent_events: [{
          event_id: "evt-1",
          event_type: "merchant.webhook.test",
          delivery_status: "failed",
          request_signature: "abc123",
          response_status_code: 503,
          response_body: "Upstream unavailable",
          attempt_count: 1,
          last_attempted_at: "2026-04-06T10:00:00Z",
          next_retry_at: "2000-01-01T00:00:00Z",
          created_at: "2026-04-06T10:00:00Z",
        }],
      })
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [{ key_id: "key-1", key_name: "Serveur prod", key_prefix: "pk_live_alpha", is_active: true, metadata: { last4: "9z9z" } }],
        webhooks: [{ webhook_id: "wh-1", target_url: "https://merchant.example.com/webhook", status: "active", event_types: ["payment.request.paid"] }],
        recent_events: [{
          event_id: "evt-1",
          event_type: "merchant.webhook.test",
          delivery_status: "failed",
          request_signature: "abc123",
          response_status_code: 503,
          response_body: "Upstream unavailable",
          attempt_count: 1,
          last_attempted_at: "2026-04-06T10:00:00Z",
          next_retry_at: "2000-01-01T00:00:00Z",
          created_at: "2026-04-06T10:00:00Z",
        }],
      })
      .mockResolvedValueOnce({
        business_id: "biz-1",
        business_label: "Alpha Shop",
        membership_role: "owner",
        api_keys: [{ key_id: "key-1", key_name: "Serveur prod", key_prefix: "pk_live_alpha", is_active: true, metadata: { last4: "9z9z" } }],
        webhooks: [{ webhook_id: "wh-1", target_url: "https://merchant.example.com/webhook", status: "active", event_types: ["payment.request.paid"] }],
        recent_events: [{
          event_id: "evt-1",
          event_type: "merchant.webhook.test",
          delivery_status: "delivered",
          request_signature: "abc123",
          response_status_code: 200,
          response_body: "ok",
          attempt_count: 2,
          last_attempted_at: "2026-04-06T10:06:00Z",
          next_retry_at: null,
          created_at: "2026-04-06T10:00:00Z",
        }],
      });
    api.createMerchantApiKey.mockResolvedValue({ plain_api_key: "pk_live_secret" });
    api.createMerchantWebhook.mockResolvedValue({ plain_signing_secret: "whsec_secret" });
    api.rotateMerchantWebhookSecret.mockResolvedValue({ plain_signing_secret: "whsec_rotated" });
    api.sendMerchantWebhookTest.mockResolvedValue({ event_id: "evt-1", delivery_status: "failed" });
    api.retryMerchantWebhookEvent.mockResolvedValue({ event_id: "evt-1", delivery_status: "delivered" });
    api.retryDueMerchantWebhookEvents.mockResolvedValue([]);
    api.createBusinessPaymentRequest.mockResolvedValue({ share_token: "PR-BIZ1" });

    renderPage();

    fireEvent.change(await screen.findByLabelText(/Nom cle API marchande/i), {
      target: { value: "Serveur prod" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Creer une cle/i }));

    await waitFor(() => {
      expect(api.createMerchantApiKey).toHaveBeenCalledWith("biz-1", { key_name: "Serveur prod" });
    });

    fireEvent.change(screen.getByLabelText(/URL webhook marchande/i), {
      target: { value: "https://merchant.example.com/webhook" },
    });
    fireEvent.change(screen.getByLabelText(/Evenements webhook marchand/i), {
      target: { value: "payment.request.paid" },
    });
    fireEvent.change(screen.getByLabelText(/Echecs consecutifs webhook marchand/i), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Creer un webhook/i }));

    await waitFor(() => {
      expect(api.createMerchantWebhook).toHaveBeenCalledWith("biz-1", {
        target_url: "https://merchant.example.com/webhook",
        event_types: ["payment.request.paid"],
        max_consecutive_failures: 4,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Tester/i }));

    await waitFor(() => {
      expect(api.sendMerchantWebhookTest).toHaveBeenCalledWith("wh-1", {});
    });

    expect(await screen.findByText(/Tentatives: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Upstream unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/A echeance: 1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Regenerer secret/i }));

    await waitFor(() => {
      expect(api.rotateMerchantWebhookSecret).toHaveBeenCalledWith("wh-1", {});
    });
    expect(await screen.findByText(/whsec_rotated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Relancer$/i }));

    await waitFor(() => {
      expect(api.retryMerchantWebhookEvent).toHaveBeenCalledWith("evt-1", {});
    });

    fireEvent.change(screen.getByLabelText(/Montant lien marchand/i), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText(/Titre lien marchand/i), {
      target: { value: "Commande #42" },
    });
    fireEvent.change(screen.getByLabelText(/Reference lien marchand/i), {
      target: { value: "CMD-42" },
    });
    fireEvent.change(screen.getByLabelText(/Canal lien marchand/i), {
      target: { value: "static_qr" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Creer un lien de paiement/i }));

    await waitFor(() => {
      expect(api.createBusinessPaymentRequest).toHaveBeenCalledWith("biz-1", {
        payer_identifier: undefined,
        amount: 45,
        currency_code: "USD",
        title: "Commande #42",
        note: undefined,
        merchant_reference: "CMD-42",
        expires_at: undefined,
        channel: "static_qr",
      });
    });

    const paymentLinkMatches = await screen.findAllByText(/PR-BIZ1/i);
    expect(paymentLinkMatches.length).toBeGreaterThan(0);
    expect(await screen.findByText(/abc123/i)).toBeInTheDocument();
    expect(await screen.findByText(/Tentatives: 2/i)).toBeInTheDocument();
  });
});
