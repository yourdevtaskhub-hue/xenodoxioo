/**
 * Integration test: Τρέχει το πραγματικό chargeScheduledPayments().
 *
 * - Χρησιμοποιεί πραγματικό Supabase + Stripe (test mode)
 * - Δεν δημιουργεί test bookings - απλά καλεί τη function
 * - Αν δεν υπάρχουν eligible bookings: επιστρέφει { processed: 0, failed: 0 }
 * - Αν υπάρχουν: θα προσπαθήσει να χρεώσει (Stripe test mode)
 *
 * Το κρίσιμο: το query περιλαμβάνει .neq("status", "CANCELLED") άρα τα
 * ακυρωμένα ΔΕΝ επιστρέφονται ποτέ από το Supabase.
 *
 * Για πλήρη επαλήθευση "τι θα χρεωθεί": τρέξε
 *   pnpm run test:scheduler-dry-run
 */

import { describe, it, expect, beforeAll } from "vitest";
import { chargeScheduledPayments } from "../../server/services/payment.service";

describe("chargeScheduledPayments - πραγματική εκτέλεση", () => {
  beforeAll(() => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL) {
      console.warn("⚠️ STRIPE_SECRET_KEY ή SUPABASE_URL missing - test μπορεί να skip");
    }
  });

  it("τρέχει χωρίς σφάλμα και επιστρέφει processed + failed", async () => {
    const result = await chargeScheduledPayments();

    expect(result).toBeDefined();
    expect(typeof result.processed).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(result.processed).toBeGreaterThanOrEqual(0);
    expect(result.failed).toBeGreaterThanOrEqual(0);
  });
});
