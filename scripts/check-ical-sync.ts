/**
 * Run iCal sync manually and show external_bookings + errors.
 * Usage: pnpm exec tsx scripts/check-ical-sync.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { syncExternalCalendars } from "../server/services/ical.service";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("🔄 Running iCal sync...\n");
  const { ok, failed } = await syncExternalCalendars(supabase);
  console.log(`✅ Sync done: ${ok} feeds OK, ${failed} failed\n`);

  // Show errors from ical_sync_config
  const { data: configs } = await supabase
    .from("ical_sync_config")
    .select("unit_id, source, ical_url, last_error")
    .eq("is_active", true);

  const { data: units } = await supabase.from("units").select("id, name, slug");
  const unitMap = new Map((units || []).map((u) => [u.id, `${u.name} (${u.slug})`]));

  if (failed > 0) {
    console.log("❌ Errors:\n");
    for (const c of configs || []) {
      const name = unitMap.get(c.unit_id) || c.unit_id;
      if (c.last_error) {
        console.log(`   ${name} | ${c.source}:`);
        console.log(`      ${c.last_error}\n`);
      }
    }
  }

  const { data: externals } = await supabase
    .from("external_bookings")
    .select("unit_id, source, start_date, end_date")
    .order("unit_id")
    .order("start_date");

  console.log(`📅 External bookings (${externals?.length || 0} total):\n`);
  if (!externals?.length) {
    console.log("   (none)\n");
    return;
  }

  for (const e of externals) {
    const name = unitMap.get(e.unit_id) || e.unit_id;
    console.log(`   ${name} | ${e.source} | ${e.start_date} → ${e.end_date}`);
  }
}

main().catch(console.error);
