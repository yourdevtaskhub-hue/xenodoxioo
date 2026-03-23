# iCal Two-Way Calendar Synchronization — Implementation Plan

This document describes the implementation of two-way iCal (ICS) synchronization between your booking website and OTAs (Booking.com, Airbnb) to prevent double bookings.

---

## 1. Architecture Overview

```
┌─────────────────┐     Export ICS      ┌─────────────────┐
│  Your Website   │ ──────────────────► │ Airbnb/Booking  │
│  (leonidionhouses)│                    │  (pulls your    │
│                 │                     │   feed URL)      │
└────────┬────────┘                     └────────▲────────┘
         │                                        │
         │ Import ICS                             │ Export ICS
         │ (cron every 10 min)                    │ (OTAs provide
         ▼                                        │  their feed)
┌─────────────────────────────────────────────────────────────┐
│                    external_bookings table                    │
│  (stores OTA reservations → blocks dates on your website)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Property & Unit Mapping (CRITICAL)

| Website Unit   | Slug        | Airbnb Listing      | Booking.com Property / Room        |
|----------------|-------------|---------------------|------------------------------------|
| LYKOSKUFI 1    | lykoskufi-1 | Lykoskufi 1         | One-Bedroom Villa                  |
| LYKOSKUFI 2    | lykoskufi-2 | —                   | Two-Bedroom Villa                  |
| LYKOSKUFI 5    | lykoskufi-5 | Lykoskufi 5         | The Lykoskufi Villas               |
| The Ogra House | ogra-house  | The Ogra House      | The Ogra House                     |

---

## 3. Database Schema

### New Tables

```sql
-- Unit-to-OTA iCal configuration (which feeds to import per unit)
CREATE TABLE IF NOT EXISTS ical_sync_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('AIRBNB', 'BOOKING')),
  ical_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, source)
);

-- External reservations (from Airbnb/Booking) — blocks dates on website
CREATE TABLE IF NOT EXISTS external_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('AIRBNB', 'BOOKING')),
  external_uid TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  summary TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, source, external_uid)
);

CREATE INDEX idx_external_bookings_unit_dates ON external_bookings(unit_id, start_date, end_date);
CREATE INDEX idx_ical_sync_config_unit ON ical_sync_config(unit_id);
```

### Tokenized ICS Export URLs

Store per-unit secret tokens for the export feed (no new table; use env or `ical_sync_config`):

- Export token stored in `ical_export_tokens` or env var `ICAL_EXPORT_SECRET` (single secret, unit in path).

---

## 4. Two-Way Sync Logic

### Internal → External (Export)

1. Your website exposes: `GET /api/ical/feed/:unitSlug?token=XXX`
2. Endpoint generates ICS from `bookings` (blocking statuses only) + optional `date_blockages`
3. Airbnb/Booking paste this URL in their "Import calendar" and pull periodically.

### External → Internal (Import)

1. Cron job (every 10 min) fetches each configured `ical_url` from `ical_sync_config`
2. Parses ICS with `node-ical`
3. Upserts `external_bookings` by `(unit_id, source, external_uid)`
4. `checkAvailability` and `occupied-dates` include `external_bookings` as blocked dates.

### Conflict Strategy

- **Same dates, different sources**: Treat as blocked. First write wins; last sync overwrites `external_bookings`.
- **Internal vs external overlap**: Both block. Internal reservations are in `bookings`; external in `external_bookings` — union for availability.
- **Cancelled on OTA**: UID removed from feed → delete from `external_bookings` on next sync (delete-and-reinsert strategy).

---

## 5. Sync Frequency & Limitations

| Aspect | Recommendation |
|--------|----------------|
| **Cron frequency** | Every 10–15 minutes. Netlify Scheduled: `*/10 * * * *` (every 10 min) or `@hourly` if 30s limit is tight. |
| **Execution limit** | Netlify Scheduled = 30s. If sync takes longer, use Background Function or external cron (e.g. cron-job.org) hitting a protected endpoint. |
| **iCal delay** | Airbnb/Booking fetch your feed on their schedule (often 24h+). Not real-time. |
| **Alternatives for real-time** | Booking.com Extranet API, Airbnb Host API — require API keys and different integration. |

---

## 6. Security

| Measure | Implementation |
|---------|----------------|
| **Export URL** | `token` query param: `?token=<ICAL_EXPORT_SECRET>` or per-unit token from DB. Reject missing/invalid. |
| **No PII in ICS** | Use generic SUMMARY e.g. "Reserved" — no guest names/emails. |
| **Import URLs** | Store in DB; never expose. Fetch server-side only. |

---

## 7. Caching

- **Export**: Short cache (60–300s) via `Cache-Control` header to reduce DB load when OTAs poll.
- **Import**: No cache; always fetch fresh from OTA URLs on cron run.

---

## 8. File Structure

```
server/
  services/
    ical.service.ts      # generateICS, parseAndUpsertExternalBookings
  routes/
    ical.ts              # GET /api/ical/feed/:unitSlug
netlify/functions/
  ical-sync-scheduled.ts # Scheduled function: import from all configured URLs
  api.ts                 # Add /api/ical/feed/:unitSlug route (or separate function)
scripts/
  seed-ical-config.sql   # Insert initial ical_sync_config from your URLs
```

---

## 9. Libraries (Node.js)

- **ical-generator** — generate ICS for export
- **node-ical** — parse ICS from Airbnb/Booking

```bash
pnpm add ical-generator node-ical
pnpm add -D @types/node-ical  # if needed
```

---

## 10. Step-by-Step Setup

1. **Run migration** in Supabase SQL Editor:
   - Open `supabase/migrations/20260323000000_ical_sync.sql` and execute its contents.

2. **Seed ical_sync_config**:
   ```bash
   pnpm exec tsx scripts/seed-ical-config.ts
   ```

3. **Set Netlify env vars**:
   - `ICAL_EXPORT_SECRET` — random string for securing ICS feed URLs (e.g. `openssl rand -hex 24`)
   - `ICAL_SYNC_SECRET` — (optional) for manual sync via `GET /api/ical/sync?token=XXX` if you use cron-job.org

4. **Deploy** to Netlify. The scheduled function runs every 15 minutes automatically.

5. **Add export URLs to Airbnb/Booking** "Import calendar" (paste in each listing's calendar sync):
   - lykoskufi-1: `https://www.leonidionhouses.com/api/ical/feed/lykoskufi-1?token=YOUR_ICAL_EXPORT_SECRET`
   - lykoskufi-2: `https://www.leonidionhouses.com/api/ical/feed/lykoskufi-2?token=YOUR_ICAL_EXPORT_SECRET`
   - lykoskufi-5: `https://www.leonidionhouses.com/api/ical/feed/lykoskufi-5?token=YOUR_ICAL_EXPORT_SECRET`
   - ogra-house: `https://www.leonidionhouses.com/api/ical/feed/ogra-house?token=YOUR_ICAL_EXPORT_SECRET`

6. **Obtain Booking.com export URLs** from Extranet → Calendar → Export for each room type.

7. **Update ical_sync_config** with Booking URLs (run seed again or update via SQL).

8. **Test**: Create a booking on your website → verify it appears in Airbnb/Booking after their next fetch. Create a reservation on Airbnb → verify dates are blocked on your website after the next sync (within ~15 min).

---

## 11. OTA Setup URLs (Quick Reference)

### Airbnb — Import (paste your website feed)

- Lykoskufi 1: `https://www.leonidionhouses.com/api/ical/feed/lykoskufi-1?token=YOUR_SECRET`
- Lykoskufi 5: `https://www.leonidionhouses.com/api/ical/feed/lykoskufi-5?token=YOUR_SECRET`
- The Ogra House: `https://www.leonidionhouses.com/api/ical/feed/ogra-house?token=YOUR_SECRET`

### Airbnb — Import (your config to fetch)

- lykoskufi-1: `https://www.airbnb.gr/calendar/ical/1215038454512982017.ics?t=...`
- lykoskufi-5: `https://www.airbnb.gr/calendar/ical/1212087610298077267.ics?t=...`
- ogra-house: `https://www.airbnb.gr/calendar/ical/7248697.ics?t=...`

### Booking.com — Import (your config to fetch)

- lykoskufi-1: `https://ical.booking.com/v1/export/t/c59de431-a5a0-4104-acc7-c2180b3bd6ae.ics`
- lykoskufi-2: `https://ical.booking.com/v1/export/t/9b198a70-c5fe-4ccc-8377-f84bbdcf8038.ics`
- lykoskufi-5: `https://ical.booking.com/v1/export/t/582c4568-ed0d-4400-b190-0491aa5a166e.ics`
- ogra-house: `https://ical.booking.com/v1/export/t/0e54f0e6-03af-4c26-9341-c7f1190a8527.ics`
