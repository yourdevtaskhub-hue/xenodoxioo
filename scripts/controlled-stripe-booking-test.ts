/**
 * Controlled Stripe test booking (terminal only).
 *
 * - Uses Stripe TEST mode only (sk_test_...).
 * - Creates a real PENDING booking, pays deposit via pm_card_visa, runs processSuccessfulPayment (same path as webhook).
 * - Refunds the PaymentIntent and sets booking CANCELLED so the stay does NOT appear on your ICS export
 *   (only CONFIRMED/COMPLETED/etc. block Airbnb/Booking import URLs).
 * - Does not call syncExternalCalendars; internal booking rows only.
 *
 * Run from repo root (loads .env via server/lib/env):
 *   pnpm run test:stripe-booking
 *
 * Optional env:
 *   CONTROLLED_STRIPE_TEST_EMAIL — guest email for the row (default: stripe-control-test+<timestamp>@example.com)
 */
import Stripe from "stripe";
import "../server/lib/env";
import { supabase } from "../server/lib/db";
import { checkAvailability, createBooking } from "../server/services/booking.service";
import {
  createGuestPaymentIntent,
  processSuccessfulPayment,
} from "../server/services/payment.service";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY?.startsWith("sk_test_")) {
  console.error("❌ Χρειάζεται STRIPE_SECRET_KEY=sk_test_... (μόνο test mode)");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Χρειάζονται SUPABASE_URL και SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY);

function addUtcDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const email =
    process.env.CONTROLLED_STRIPE_TEST_EMAIL ||
    `stripe-control-test+${Date.now()}@example.com`;

  const { data: unitRow, error: unitErr } = await supabase.from("units").select("id, name").limit(1).maybeSingle();
  if (unitErr || !unitRow) {
    console.error("❌ Δεν βρέθηκε unit στη βάση:", unitErr?.message);
    process.exit(1);
  }

  // Βρες ελεύθερο 7νύχτι (εσωτερικές + external κρατήσεις) ώστε το τεστ να μην κολλάει σε OTA blocks
  let checkIn: Date | null = null;
  let checkOut: Date | null = null;
  for (let startOffset = 90; startOffset <= 800; startOffset += 7) {
    const ci = addUtcDays(new Date(), startOffset);
    const co = addUtcDays(new Date(), startOffset + 7);
    const a = await checkAvailability(unitRow.id, ci, co);
    if (a.isAvailable) {
      checkIn = ci;
      checkOut = co;
      break;
    }
  }
  if (!checkIn || !checkOut) {
    console.error("❌ Δεν βρέθηκαν 7 διαθέσιμες μέρες σε αυτό το unit (δοκίμασε άλλο unit στο script).");
    process.exit(1);
  }

  console.log("▶ Unit:", unitRow.name, unitRow.id);
  console.log("▶ Check-in/out (UTC date-only flow):", checkIn.toISOString().slice(0, 10), "→", checkOut.toISOString().slice(0, 10));
  console.log("▶ Guest email:", email);

  let bookingId: string | null = null;
  let paymentIntentId: string | null = null;

  try {
    const booking = await createBooking(
      unitRow.id,
      null,
      checkIn,
      checkOut,
      2,
      "Stripe controlled test",
      email,
      undefined,
      undefined,
      undefined,
    );
    bookingId = booking.id;
    console.log("✅ Booking δημιουργήθηκε (PENDING):", booking.booking_number, bookingId);

    const { paymentIntentId: piId } = await createGuestPaymentIntent(bookingId);
    paymentIntentId = piId;
    console.log("✅ PaymentIntent:", piId);

    const confirmed = await stripe.paymentIntents.confirm(piId, {
      payment_method: "pm_card_visa",
    });

    if (confirmed.status !== "succeeded") {
      console.error("❌ Η επιβεβαίωση απέτυχε, status:", confirmed.status);
      process.exit(1);
    }

    const latestCharge = confirmed.latest_charge;
    const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;

    await processSuccessfulPayment(piId, chargeId ?? undefined);
    console.log("✅ processSuccessfulPayment — η κράτηση ενημερώθηκε όπως με webhook");

    const { data: after } = await supabase
      .from("bookings")
      .select("status, payment_status, deposit_paid, remaining_amount")
      .eq("id", bookingId)
      .single();
    console.log("▶ Μετά την πληρωμή:", after);

    // Refund (test mode) — καθαρό Stripe balance
    try {
      await stripe.refunds.create({ payment_intent: piId });
      console.log("✅ Stripe refund ολοκληρώθηκε (test)");
    } catch (re: any) {
      console.warn("⚠️ Refund:", re?.message || re);
    }

    // Ακύρωση: δεν μπλοκάρει ICS export (BLOCKING_STATUSES χωρίς CANCELLED)
    await supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Controlled terminal Stripe test — auto-cancelled; no OTA calendar block.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await supabase.from("payments").update({ status: "REFUNDED", last_error: "Controlled test refund" }).eq("stripe_payment_intent_id", piId);

    console.log("✅ Κράτηση CANCELLED — δεν εμφανίζεται στο export προς Airbnb/Booking");
    console.log("Done. Booking id (για έλεγχο στη Supabase):", bookingId);
  } catch (e: any) {
    console.error("❌ Σφάλμα:", e?.message || e);
    if (bookingId) {
      console.error("Cleanup: booking id", bookingId);
      await supabase
        .from("bookings")
        .update({
          status: "CANCELLED",
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Controlled test failed mid-run — manual review",
        })
        .eq("id", bookingId);
    }
    process.exit(1);
  }
}

main();
