/**
 * Στέλνει μέσω Resend (πραγματικό API) δύο δοκιμαστικά emails:
 * 1) PAYMENT_REMINDER — υπόλοιπο 75% / ημερομηνία χρέωσης
 * 2) BOOKING_CANCELLED_UNPAID_BALANCE — αυτόματη ακύρωση μετά από 2 αποτυχημένες χρεώσεις
 *
 * Δημιουργεί προσωρινή κράτηση στη Supabase, στέλνει, στη συνέχεια διαγράφει την κράτηση.
 *
 * Ρυθμίσεις: RESEND_API_KEY, SUPABASE_*, FROM_EMAIL (verified domain)
 * Προαιρετικά: BALANCE_EMAIL_TEST_TO=your@email.com (αλλιώς ADMIN_EMAIL)
 *
 * Run: pnpm run test:balance-emails
 */
import "../server/lib/env";
import { createClient } from "@supabase/supabase-js";
import {
  sendBalanceDueReminderEmail,
  sendBookingCancelledUnpaidBalanceEmail,
} from "../server/services/email.service";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const to =
  (process.env.BALANCE_EMAIL_TEST_TO || process.env.ADMIN_EMAIL || "").trim() || null;

if (!process.env.RESEND_API_KEY) {
  console.error("❌ Χρειάζεται RESEND_API_KEY");
  process.exit(1);
}
if (!url || !key) {
  console.error("❌ Χρειάζονται SUPABASE_URL και SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!to) {
  console.error("❌ Βάλε BALANCE_EMAIL_TEST_TO ή ADMIN_EMAIL στο .env (ποιος θα λάβει τα test mails)");
  process.exit(1);
}

const recipient = to;
const supabase = createClient(url, key);

async function main() {
  const { data: unit, error: uErr } = await supabase
    .from("units")
    .select("id, name, property:properties(name)")
    .limit(1)
    .maybeSingle();

  if (uErr || !unit) {
    console.error("❌ Δεν βρέθηκε unit:", uErr?.message);
    process.exit(1);
  }

  const prop = unit.property as { name?: string } | null;
  const propertyName = prop?.name ?? "Test property";
  const unitName = unit.name ?? "Unit";

  const checkIn = new Date(Date.UTC(2026, 10, 15, 12, 0, 0));
  const checkOut = new Date(Date.UTC(2026, 10, 22, 12, 0, 0));
  const scheduledCharge = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));

  const bookingNumber = `MAILTEST-${Date.now().toString(36)}`;
  const guestName = "Balance email test";

  const { data: row, error: insErr } = await supabase
    .from("bookings")
    .insert({
      booking_number: bookingNumber,
      unit_id: unit.id,
      user_id: null,
      check_in_date: checkIn.toISOString(),
      check_out_date: checkOut.toISOString(),
      nights: 7,
      total_nights: 7,
      guests: 2,
      guest_name: guestName,
      guest_email: recipient,
      base_price: 100,
      subtotal: 700,
      cleaning_fee: 50,
      taxes: 100,
      discount_amount: 0,
      total_price: 2330,
      deposit_amount: 582.5,
      balance_amount: 1747.5,
      remaining_amount: 1747.5,
      total_paid: 582.5,
      payment_status: "DEPOSIT_PAID",
      payment_type: "DEPOSIT",
      status: "CONFIRMED",
      deposit_paid: true,
      balance_paid: false,
      scheduled_charge_date: scheduledCharge.toISOString(),
      balance_charge_attempt_count: 0,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    console.error("❌ Insert booking:", insErr?.message);
    process.exit(1);
  }

  const bookingId = row.id;
  console.log("▶ Test booking:", bookingNumber, bookingId);
  console.log("▶ Sending to:", recipient);

  try {
    await sendBalanceDueReminderEmail(recipient, {
      bookingId,
      bookingNumber,
      guestName,
      remainingEur: 1747.5,
      scheduledChargeDateIso: scheduledCharge.toISOString(),
      checkInDateIso: checkIn.toISOString(),
      propertyName,
      unitName,
    });
    console.log("✅ 1/2 PAYMENT_REMINDER (υπόλοιπο 75%) στάλθηκε μέσω Resend");

    await supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason:
          "Test only: simulating auto-cancel after two failed balance charge attempts.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await sendBookingCancelledUnpaidBalanceEmail(bookingId);
    console.log("✅ 2/2 BOOKING_CANCELLED_UNPAID_BALANCE στάλθηκε μέσω Resend");
  } finally {
    const { error: delErr } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (delErr) console.warn("⚠️ Διαγραφή test booking:", delErr.message);
    else console.log("▶ Test booking διαγράφηκε από τη βάση");
  }

  console.log("\nΈλεγξε το inbox (και Resend → Emails). Ολοκληρώθηκε.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
