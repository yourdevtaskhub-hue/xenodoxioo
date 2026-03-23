/**
 * Contract tests: Verifies that chargeScheduledPayments in payment.service.ts
 * explicitly excludes CANCELLED bookings. If someone removes .neq("status", "CANCELLED"),
 * these tests will fail.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PAYMENT_SERVICE_PATH = join(__dirname, "../../server/services/payment.service.ts");

describe("chargeScheduledPayments - CANCELLED exclusion contract", () => {
  it("payment.service.ts chargeScheduledPayments excludes CANCELLED status", () => {
    const source = readFileSync(PAYMENT_SERVICE_PATH, "utf-8");

    expect(source).toContain('.neq("status", "CANCELLED")');
  });

  it("payment.service.ts chargeScheduledPayments requires DEPOSIT_PAID", () => {
    const source = readFileSync(PAYMENT_SERVICE_PATH, "utf-8");

    expect(source).toContain('.eq("payment_status", "DEPOSIT_PAID")');
  });

  it("payment.service.ts chargeScheduledPayments uses scheduled_charge_date <= today", () => {
    const source = readFileSync(PAYMENT_SERVICE_PATH, "utf-8");

    expect(source).toContain('"scheduled_charge_date"');
    expect(source).toContain(".lte(");
  });
});
