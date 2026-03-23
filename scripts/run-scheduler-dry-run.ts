/**
 * DRY RUN: Τρέχει το ίδιο query με το chargeScheduledPayments ΑΛΛΑ δεν κάνει charge.
 * Χρησιμοποιείται για να δεις ΤΙ θα χρεωθεί όταν φτάσει η ώρα.
 *
 * Τρέξε: pnpm exec tsx scripts/run-scheduler-dry-run.ts
 *
 * Το query εξαιρεί CANCELLED - αν έχεις ακυρωμένη κράτηση με scheduled_charge_date σήμερα,
 * ΔΕΝ θα εμφανιστεί εδώ (και άρα ΔΕΝ θα χρεωθούν τα 75%).
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Χρειάζεται SUPABASE_URL και SUPABASE_SERVICE_ROLE_KEY στο .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  console.log("\n📅 [DRY RUN] Έλεγχος scheduled payments για:", today);
  console.log("   (ίδιο query με chargeScheduledPayments - χωρίς πραγματική χρέωση)\n");

  // Ακριβώς το ίδιο query με payment.service.ts chargeScheduledPayments
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, booking_number, status, payment_status, scheduled_charge_date, remaining_amount, guest_email")
    .eq("payment_status", "DEPOSIT_PAID")
    .neq("status", "CANCELLED")
    .lte("scheduled_charge_date", now);

  if (error) {
    console.error("❌ Σφάλμα query:", error.message);
    process.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log("✅ Δεν βρέθηκαν κρατήσεις για χρέωση σήμερα.");
    console.log("   (DEPOSIT_PAID + status ≠ CANCELLED + scheduled_charge_date ≤ σήμερα)\n");
    return;
  }

  console.log(`⚠️  Θα χρεωθούν ${bookings.length} κρατήσεις (τα 75%):\n`);
  for (const b of bookings) {
    console.log(`   • ${b.booking_number} | ${b.guest_email} | €${b.remaining_amount} | status=${b.status}`);
  }

  // Επιπλέον: δείξε τι κρατήσεις ΔΕΝ περιλαμβάνονται (CANCELLED με scheduled_charge_date σήμερα)
  const { data: cancelledToday } = await supabase
    .from("bookings")
    .select("id, booking_number, status, scheduled_charge_date, remaining_amount")
    .eq("payment_status", "DEPOSIT_PAID")
    .eq("status", "CANCELLED")
    .lte("scheduled_charge_date", now);

  if (cancelledToday && cancelledToday.length > 0) {
    console.log("\n🔒 Ακυρωμένες που ΔΕΝ χρεώνονται (σωστά εξαιρούνται):");
    for (const c of cancelledToday) {
      console.log(`   • ${c.booking_number} | CANCELLED | €${c.remaining_amount} - ΟΧΙ χρέωση ✓`);
    }
  }

  console.log("\n[DRY RUN - καμία χρέωση δεν έγινε]\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
