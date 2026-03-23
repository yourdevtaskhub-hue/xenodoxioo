/**
 * Contract tests: Netlify functions (create-guest-payment-intent, api.ts)
 * must use the same 25%/75% and 21-day logic as the main payment service.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("Netlify create-guest-payment-intent - 25% / 21 days contract", () => {
  const path = join(__dirname, "../../netlify/functions/create-guest-payment-intent.ts");
  const source = readFileSync(path, "utf-8");

  it("uses fullPaymentThresholdDays default 21", () => {
    expect(source).toContain("fullPaymentThresholdDays = 21");
  });

  it("uses depositPct default 25", () => {
    expect(source).toContain("depositPct = 25");
  });

  it("determines FULL when daysToCheckIn <= fullPaymentThresholdDays", () => {
    expect(source).toContain("daysToCheckIn <= fullPaymentThresholdDays");
    expect(source).toContain("FULL");
    expect(source).toContain("DEPOSIT");
  });

  it("charges total_price for FULL, deposit_amount for DEPOSIT", () => {
    expect(source).toContain("effectiveType === \"FULL\"");
    expect(source).toContain("booking.total_price");
    expect(source).toContain("deposit_amount");
  });

  it("sets setup_future_usage for DEPOSIT (off-session balance charge)", () => {
    expect(source).toContain("setup_future_usage");
    expect(source).toContain("off_session");
  });
});

describe("Netlify stripe-webhook - scheduled_charge_date 21 days", () => {
  const path = join(__dirname, "../../netlify/functions/stripe-webhook.ts");
  const source = readFileSync(path, "utf-8");

  it("sets scheduled_charge_date on DEPOSIT payment (for balance charge 21 days before)", () => {
    expect(source).toContain("scheduled_charge_date");
    expect(source).toContain("setDate");
    expect(source).toContain("- 21");
  });

  it("updates DEPOSIT_PAID and stores stripe_payment_method_id for future charge", () => {
    expect(source).toContain("DEPOSIT_PAID");
    expect(source).toContain("stripe_payment_method_id");
  });
});
