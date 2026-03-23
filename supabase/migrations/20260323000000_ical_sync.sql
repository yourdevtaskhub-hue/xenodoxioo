-- iCal two-way sync: external bookings and OTA feed config
-- Run this in Supabase SQL Editor or via migration tool

-- Unit-to-OTA iCal configuration (which feeds to import per unit)
CREATE TABLE IF NOT EXISTS ical_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_ical_sync_config_unit ON ical_sync_config(unit_id);

-- External reservations from Airbnb/Booking — block dates on website
CREATE TABLE IF NOT EXISTS external_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_external_bookings_unit_dates ON external_bookings(unit_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_external_bookings_unit ON external_bookings(unit_id);

-- RLS: Service role bypasses RLS; these policies allow full access if needed
ALTER TABLE ical_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ical_sync_config_service_access" ON ical_sync_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "external_bookings_service_access" ON external_bookings FOR ALL USING (true) WITH CHECK (true);

-- Seed ical_sync_config: run scripts/seed-ical-config.ts after migration
-- Example (replace unit IDs with your actual UUIDs from units table):
/*
INSERT INTO ical_sync_config (unit_id, source, ical_url) VALUES
  ((SELECT id FROM units WHERE slug = 'lykoskufi-1' LIMIT 1), 'AIRBNB', 'https://www.airbnb.gr/calendar/ical/1215038454512982017.ics?t=8cff5062e5294bb5b102e77dc5383e2c'),
  ((SELECT id FROM units WHERE slug = 'lykoskufi-5' LIMIT 1), 'AIRBNB', 'https://www.airbnb.gr/calendar/ical/1212087610298077267.ics?t=42f5b8e9746b45fba663dc93c361c10c'),
  ((SELECT id FROM units WHERE slug = 'ogra-house' LIMIT 1), 'AIRBNB', 'https://www.airbnb.gr/calendar/ical/7248697.ics?t=f575d97dc9b045d6a05293b3d20b1aa0')
ON CONFLICT (unit_id, source) DO UPDATE SET ical_url = EXCLUDED.ical_url, updated_at = now();
*/
