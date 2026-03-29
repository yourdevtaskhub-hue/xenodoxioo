/**
 * Integration test — OFF by default (no real Supabase/Stripe calls).
 *
 * Προϊόν / iCal: το default `pnpm test` ΔΕΝ καλεί chargeScheduledPayments πάνω σε παραγωγική DB,
 * ώστε να μην υπάρχουν χρεώσεις ή ακυρώσεις που θα άλλαζαν availability προς Booking/Airbnb.
 *
 * Για τοπική δοκιμή με test keys μόνο: RUN_INTEGRATION_SCHEDULER=1 pnpm exec vitest run tests/integration/charge-scheduled-payments.test.ts
 *
 * Για "τι θα χρεωθεί" χωρίς Stripe: pnpm exec tsx scripts/run-scheduler-dry-run.ts
 */

import { describe, it, expect } from "vitest";
import { chargeScheduledPayments } from "../../server/services/payment.service";

const RUN = process.env.RUN_INTEGRATION_SCHEDULER === "1";

describe.skipIf(!RUN)("chargeScheduledPayments — integration (RUN_INTEGRATION_SCHEDULER=1)", () => {
  it("επιστρέφει processed, failed, cancelled", async () => {
    const result = await chargeScheduledPayments();

    expect(result).toBeDefined();
    expect(typeof result.processed).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(typeof result.cancelled).toBe("number");
    expect(result.processed).toBeGreaterThanOrEqual(0);
    expect(result.failed).toBeGreaterThanOrEqual(0);
    expect(result.cancelled).toBeGreaterThanOrEqual(0);
  });
});
