/**
 * DRY RUN: Δείχνει ποιες κρατήσεις θα «έφταναν» στον scheduler χωρίς Stripe charge.
 *
 * Λογική (ίδια με chargeScheduledPayments): DEPOSIT_PAID, όχι CANCELLED, balance_paid=false,
 * και σήμερα (UTC ημερολογιακά) >= μέρα 1ης προσπάθειας (check-in − balance_charge_days_before)
 * εάν attempt=0, ή >= μέρα 2ης (check-in − 19) εάν attempt=1.
 *
 * Τρέξε: pnpm exec tsx scripts/run-scheduler-dry-run.ts
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const BALANCE_RETRY_DAYS_BEFORE_CHECK_IN = 19;

function utcCalendarDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcCalendarDays(day: Date, delta: number): Date {
  const t = new Date(day.getTime());
  t.setUTCDate(t.getUTCDate() + delta);
  return t;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Χρειάζεται SUPABASE_URL και SUPABASE_SERVICE_ROLE_KEY στο .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const todayUtc = utcCalendarDay(new Date());
  const todayStr = todayUtc.toISOString().split("T")[0];

  console.log("\n📅 [DRY RUN] UTC ημέρα:", todayStr);
  console.log("   Φίλτρο DB: DEPOSIT_PAID, status≠CANCELLED, balance_paid=false\n");

  const { data: paySettings } = await supabase
    .from("payment_settings")
    .select("balance_charge_days_before")
    .eq("is_active", true)
    .maybeSingle();
  const balDays = Number(paySettings?.balance_charge_days_before) || 21;
  console.log(`   balance_charge_days_before (1η προσπάθεια): ${balDays}`);
  console.log(`   2η προσπάθεια: ${BALANCE_RETRY_DAYS_BEFORE_CHECK_IN} ημέρες πριν το check-in (UTC ημέρα)\n`);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_number, status, payment_status, balance_paid, balance_charge_attempt_count, remaining_amount, check_in_date, guest_email, scheduled_charge_date",
    )
    .eq("payment_status", "DEPOSIT_PAID")
    .neq("status", "CANCELLED")
    .eq("balance_paid", false);

  if (error) {
    console.error("❌ Σφάλμα query:", error.message);
    process.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log("✅ Δεν υπάρχουν κρατήσεις με ανεξόφλητο υπόλοιπο (DEPOSIT_PAID & balance unpaid).\n");
    return;
  }

  let wouldCharge = 0;
  for (const b of bookings) {
    const remaining = Number(b.remaining_amount) || 0;
    if (remaining <= 0) continue;

    const attempt = Number(b.balance_charge_attempt_count) || 0;
    const checkInDay = utcCalendarDay(new Date(b.check_in_date));
    const firstDay = addUtcCalendarDays(checkInDay, -balDays);
    const retryDay = addUtcCalendarDays(checkInDay, -BALANCE_RETRY_DAYS_BEFORE_CHECK_IN);

    const canFirst = attempt === 0 && todayUtc.getTime() >= firstDay.getTime();
    const canRetry = attempt === 1 && todayUtc.getTime() >= retryDay.getTime();
    const eligible = canFirst || canRetry;

    if (eligible) wouldCharge++;

    const phase =
      attempt === 0
        ? `1η (από ${firstDay.toISOString().slice(0, 10)})`
        : attempt === 1
          ? `2η retry (από ${retryDay.toISOString().slice(0, 10)})`
          : `attempt=${attempt}`;

    console.log(
      `${eligible ? "⚡" : "○"} ${b.booking_number} | ${b.guest_email} | €${remaining} | ${phase} | ${eligible ? "ΘΑ τρέξει charge σήμερα" : "όχι σήμερα"}`,
    );
  }

  console.log(`\nΣύνολο με υπόλοιπο: ${bookings.length}, επιλέξιμες για προσπάθεια σήμερα: ${wouldCharge}`);
  console.log("[DRY RUN - καμία χρέωση]\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
