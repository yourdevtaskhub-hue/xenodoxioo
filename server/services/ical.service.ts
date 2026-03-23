/**
 * iCal two-way sync: generate ICS feed (export) and parse/import from OTAs.
 */
import icalGenerator, { ICalCalendarMethod, ICalEventStatus } from "ical-generator";
import * as nodeIcal from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";

const BLOCKING_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"];

export interface ICalExportOptions {
  /** Cache for N seconds (Cache-Control header) */
  maxAge?: number;
}

/**
 * Generate ICS feed for a unit (internal bookings + date blockages).
 * Used by Airbnb/Booking to import your website's availability.
 */
export async function generateICSForUnit(
  supabase: SupabaseClient,
  unitId: string,
  options: ICalExportOptions = {}
): Promise<string> {
  const { data: unit } = await supabase.from("units").select("id, name, property_id").eq("id", unitId).single();
  if (!unit) throw new Error("Unit not found");

  const calendar = icalGenerator({ name: `Leonidion Houses - ${unit.name}`, method: ICalCalendarMethod.PUBLISH });

  // Blocking internal bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, check_in_date, check_out_date")
    .eq("unit_id", unitId)
    .in("status", BLOCKING_STATUSES)
    .order("check_in_date", { ascending: true });

  for (const b of bookings || []) {
    const start = new Date(b.check_in_date);
    const end = new Date(b.check_out_date);
    calendar.createEvent({
      start,
      end,
      id: `booking-${b.id}@leonidionhouses.com`,
      summary: "Reserved",
      status: ICalEventStatus.CONFIRMED,
    });
  }

  // Property-level date blockages
  const { data: blockages } = await supabase
    .from("date_blockages")
    .select("id, start_date, end_date")
    .eq("property_id", unit.property_id)
    .lte("start_date", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString())
    .gte("end_date", new Date().toISOString());

  for (const blk of blockages || []) {
    const start = new Date(blk.start_date);
    const end = new Date(blk.end_date);
    calendar.createEvent({
      start,
      end,
      id: `blockage-${blk.id}@leonidionhouses.com`,
      summary: "Blocked",
      status: ICalEventStatus.CONFIRMED,
    });
  }

  return calendar.toString();
}

/**
 * Fetch ICS from URL and parse into events.
 */
async function fetchAndParseICS(url: string): Promise<{ uid: string; start: Date; end: Date }[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "LeonidionHouses-iCalSync/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  const parsed = nodeIcal.parseICS(text);

  const events: { uid: string; start: Date; end: Date }[] = [];
  for (const key of Object.keys(parsed)) {
    const ev = parsed[key];
    if (ev?.type !== "VEVENT" || ev?.uid == null) continue;
    const uidVal = ev.uid;
    const uidStr = typeof uidVal === "string" ? uidVal : (uidVal as { val?: string })?.val ?? String(uidVal);
    const start = ev.start ? new Date(ev.start) : null;
    const end = ev.end ? new Date(ev.end) : ev.start ? new Date(ev.start.getTime() + 24 * 60 * 60 * 1000) : null;
    if (start && end) events.push({ uid: uidStr, start, end });
  }
  return events;
}

/**
 * Sync external iCal feeds into external_bookings.
 * Fetches each configured URL, parses ICS, and upserts.
 */
export async function syncExternalCalendars(supabase: SupabaseClient): Promise<{ ok: number; failed: number }> {
  const { data: configs } = await supabase
    .from("ical_sync_config")
    .select("id, unit_id, source, ical_url")
    .eq("is_active", true);

  let ok = 0;
  let failed = 0;

  for (const cfg of configs || []) {
    try {
      const events = await fetchAndParseICS(cfg.ical_url);

      // Replace all external bookings for this unit+source
      await supabase
        .from("external_bookings")
        .delete()
        .eq("unit_id", cfg.unit_id)
        .eq("source", cfg.source);

      if (events.length > 0) {
        const rows = events.map((e) => ({
          unit_id: cfg.unit_id,
          source: cfg.source,
          external_uid: e.uid,
          start_date: e.start.toISOString().slice(0, 10),
          end_date: e.end.toISOString().slice(0, 10),
          summary: "Reserved",
        }));
        const { error } = await supabase.from("external_bookings").insert(rows);
        if (error) throw error;
      }

      await supabase
        .from("ical_sync_config")
        .update({
          last_synced_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cfg.id);

      ok++;
    } catch (err: any) {
      failed++;
      await supabase
        .from("ical_sync_config")
        .update({
          last_synced_at: null,
          last_error: err?.message || String(err),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cfg.id);
    }
  }

  return { ok, failed };
}

/**
 * Get occupied date ranges for a unit (internal + external).
 * Used by checkAvailability and occupied-dates endpoint.
 */
export async function getOccupiedDateRangesIncludingExternal(
  supabase: SupabaseClient,
  unitId: string
): Promise<{ start: string; end: string }[]> {
  const BLOCKING = BLOCKING_STATUSES;

  const { data: internal } = await supabase
    .from("bookings")
    .select("check_in_date, check_out_date")
    .eq("unit_id", unitId)
    .in("status", BLOCKING)
    .order("check_in_date", { ascending: true });

  const { data: external } = await supabase
    .from("external_bookings")
    .select("start_date, end_date")
    .eq("unit_id", unitId)
    .order("start_date", { ascending: true });

  const toStr = (d: string) => (typeof d === "string" ? d : String(d)).slice(0, 10);
  const ranges: { start: string; end: string }[] = [];

  for (const r of internal || []) {
    ranges.push({ start: toStr(r.check_in_date), end: toStr(r.check_out_date) });
  }
  for (const r of external || []) {
    ranges.push({ start: toStr(r.start_date), end: toStr(r.end_date) });
  }

  return ranges;
}
