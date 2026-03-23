/**
 * E2E Test: Επαλήθευση ότι όταν ο χρήστης ΔΕΝ ακυρώνει, τα 75% χρεώνονται σωστά.
 *
 * Πολλαπλά σενάρια:
 * - Σενάριο 1: Κράτηση 724.50€ (25%=181.13, 75%=543.37)
 * - Σενάριο 2: Κράτηση 1000€ (25%=250, 75%=750)
 * - Σενάριο 3: 2 κρατήσεις ταυτόχρονα
 *
 * Τρέξε: pnpm run test:scheduled-charge-e2e
 *
 * Απαιτεί: STRIPE_SECRET_KEY (test), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { chargeScheduledPayments } from "../server/services/payment.service";

import "../server/lib/env";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Χρειάζεται STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!STRIPE_KEY.startsWith("sk_test_")) {
  console.error("❌ Χρησιμοποίησε μόνο Stripe TEST key (sk_test_...)");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_PREFIX = "e2e_sched_";

async function getOrCreateUnitId(): Promise<string> {
  const { data: units } = await supabase.from("units").select("id").limit(1);
  if (units && units.length > 0) return units[0].id;

  const { data: prop } = await supabase.from("properties").select("id").limit(1).single();
  if (!prop) throw new Error("Δεν υπάρχει property - τρέξε seed");
  const { data: unit } = await supabase
    .from("units")
    .insert({ property_id: prop.id, name: "E2E Test Unit", base_price: 100 })
    .select("id")
    .single();
  if (!unit) throw new Error("Αποτυχία δημιουργίας unit");
  return unit.id;
}

interface Scenario {
  name: string;
  totalPrice: number;
  deposit: number;
  remaining: number;
}

const SCENARIOS: Scenario[] = [
  { name: "724.50€ (25%+75%)", totalPrice: 724.5, deposit: 181.13, remaining: 543.37 },
  { name: "1000€ (25%+75%)", totalPrice: 1000, deposit: 250, remaining: 750 },
  { name: "500€ (25%+75%)", totalPrice: 500, deposit: 125, remaining: 375 },
];

async function runScenario(scenario: Scenario, runIndex: number): Promise<boolean> {
  const TEST_EMAIL = `test-${Date.now()}-${runIndex}@scheduled-charge-e2e.local`;
  let customerId: string | null = null;
  let bookingId: string | null = null;

  try {
    const customer = await stripe.customers.create({
      email: TEST_EMAIL,
      name: "E2E Test Guest",
      metadata: { source: "e2e_scheduled_charge_test" },
    });
    customerId = customer.id;

    const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customerId });

    const unitId = await getOrCreateUnitId();
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 7);

    const bookingNumber = `${TEST_PREFIX}${Date.now().toString(36)}_${runIndex}`;
    const { data: booking, error: insErr } = await supabase
      .from("bookings")
      .insert({
        booking_number: bookingNumber,
        unit_id: unitId,
        user_id: null,
        check_in_date: checkIn.toISOString(),
        check_out_date: checkOut.toISOString(),
        nights: 7,
        total_nights: 7,
        guests: 2,
        guest_name: "E2E Test Guest",
        guest_email: TEST_EMAIL,
        base_price: 100,
        subtotal: 700,
        cleaning_fee: 50,
        taxes: 112.5,
        total_price: scenario.totalPrice,
        deposit_amount: scenario.deposit,
        balance_amount: scenario.remaining,
        remaining_amount: scenario.remaining,
        total_paid: scenario.deposit,
        payment_status: "DEPOSIT_PAID",
        status: "CONFIRMED",
        deposit_paid: true,
        balance_paid: false,
        payment_type: "DEPOSIT",
        stripe_customer_id: customerId,
        stripe_payment_method_id: pm.id,
        scheduled_charge_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insErr || !booking) {
      throw new Error(`Booking insert failed: ${insErr?.message || "no data"}`);
    }
    bookingId = booking.id;

    const result = await chargeScheduledPayments();

    const { data: after } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (!after) throw new Error("Booking not found after charge");

    const passed =
      after.payment_status === "PAID_FULL" &&
      after.balance_paid === true &&
      Number(after.remaining_amount) === 0 &&
      Math.abs(Number(after.total_paid) - scenario.totalPrice) < 0.01;

    return passed;
  } finally {
    if (bookingId) {
      await supabase.from("payments").delete().eq("booking_id", bookingId);
      await supabase.from("bookings").delete().eq("id", bookingId);
    }
    if (customerId) {
      try {
        await stripe.customers.del(customerId);
      } catch {
        /* ignore */
      }
    }
  }
}

async function runMultiBookingScenario(): Promise<boolean> {
  const TEST_EMAIL1 = `test-${Date.now()}-multi1@scheduled-charge-e2e.local`;
  const TEST_EMAIL2 = `test-${Date.now()}-multi2@scheduled-charge-e2e.local`;
  const customers: string[] = [];
  const bookingIds: string[] = [];

  try {
    const unitId = await getOrCreateUnitId();
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 7);

    for (const [i, email] of [TEST_EMAIL1, TEST_EMAIL2].entries()) {
      const cust = await stripe.customers.create({
        email,
        name: `E2E Multi ${i + 1}`,
        metadata: { source: "e2e_scheduled_charge_test" },
      });
      customers.push(cust.id);
      const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: cust.id });

      const bookingNumber = `${TEST_PREFIX}multi_${Date.now().toString(36)}_${i}`;
      const { data: b } = await supabase
        .from("bookings")
        .insert({
          booking_number: bookingNumber,
          unit_id: unitId,
          user_id: null,
          check_in_date: checkIn.toISOString(),
          check_out_date: checkOut.toISOString(),
          nights: 7,
          total_nights: 7,
          guests: 2,
          guest_name: `E2E Multi ${i + 1}`,
          guest_email: email,
          base_price: 100,
          subtotal: 700,
          cleaning_fee: 50,
          taxes: 112.5,
          total_price: 724.5,
          deposit_amount: 181.13,
          balance_amount: 543.37,
          remaining_amount: 543.37,
          total_paid: 181.13,
          payment_status: "DEPOSIT_PAID",
          status: "CONFIRMED",
          deposit_paid: true,
          balance_paid: false,
          payment_type: "DEPOSIT",
          stripe_customer_id: cust.id,
          stripe_payment_method_id: pm.id,
          scheduled_charge_date: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (b) bookingIds.push(b.id);
    }

    const result = await chargeScheduledPayments();
    if (result.processed !== 2) return false;

    for (const bid of bookingIds) {
      const { data: after } = await supabase.from("bookings").select("*").eq("id", bid).single();
      if (!after || after.payment_status !== "PAID_FULL" || Number(after.remaining_amount) !== 0) {
        return false;
      }
    }
    return true;
  } finally {
    for (const bid of bookingIds) {
      await supabase.from("payments").delete().eq("booking_id", bid);
      await supabase.from("bookings").delete().eq("id", bid);
    }
    for (const cid of customers) {
      try {
        await stripe.customers.del(cid);
      } catch {
        /* ignore */
      }
    }
  }
}

async function main() {
  console.log("\n🧪 E2E: Πολλαπλά σενάρια - τα 75% χρεώνονται σωστά (χωρίς ακύρωση)\n");

  let failed = 0;

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    console.log(`   Σενάριο ${i + 1}/${SCENARIOS.length}: ${scenario.name}`);
    try {
      const ok = await runScenario(scenario, i);
      if (ok) {
        console.log(`   ✅ ΟΚ (€${scenario.remaining} χρεώθηκαν)\n`);
      } else {
        console.log(`   ❌ ΑΠΟΤΥΧΙΑ\n`);
        failed++;
      }
    } catch (err: any) {
      console.log(`   ❌ Σφάλμα: ${err.message}\n`);
      failed++;
    }
  }

  console.log("   Σενάριο: 2 κρατήσεις ταυτόχρονα");
  try {
    const ok = await runMultiBookingScenario();
    if (ok) {
      console.log(`   ✅ ΟΚ (και οι 2 χρεώθηκαν)\n`);
    } else {
      console.log(`   ❌ ΑΠΟΤΥΧΙΑ\n`);
      failed++;
    }
  } catch (err: any) {
    console.log(`   ❌ Σφάλμα: ${err.message}\n`);
    failed++;
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} σενάριο/α απέτυχαν.\n`);
    process.exit(1);
  }

  console.log("   ✅ ΟΛΑ ΤΑ ΣΕΝΑΡΙΑ ΠΕΡΑΣΑΝ: Τα 75% χρεώνονται σωστά στο μέλλον.\n");
}

main().catch((err) => {
  console.error("\n❌ Σφάλμα:", err.message);
  process.exit(1);
});
