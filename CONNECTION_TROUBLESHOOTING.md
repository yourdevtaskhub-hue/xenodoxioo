# Database connection troubleshooting

If you see:

```text
Can't reach database server at db.xxxxx.supabase.co:5432
```

or **P1001** from Prisma, the app cannot connect to your Supabase database.

## 1. Supabase project is paused (very common)

Free-tier Supabase projects **pause after 7 days of inactivity**.

**Fix:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. If you see **“Project is paused”**, click **Restore project** (or go to **Settings → General → Restore project**).
4. Wait 1–2 minutes, then run `npm run dev` again.

## 2. Check your connection string

1. In Supabase: **Settings → Database**.
2. Copy the **Connection string** (URI format).
3. Replace `[YOUR-PASSWORD]` with your database password.
4. In your project root, set in `.env`:
   ```env
   # Pooler (often works when 5432 is blocked). For Prisma add pgbouncer=true:
   DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   ```
   Or use the **Direct connection** (port 5432) if you prefer.

Ensure:

- No extra spaces in the URL.
- Password has no special characters that break the URI; if it does, URL-encode them.

## 3. Network / firewall

- Port **5432** (direct) or **6543** (pooler) must be allowed outbound.
- Try from another network (e.g. mobile hotspot) to rule out corporate firewall.

## 4. Verify from the project

With a valid `DATABASE_URL` in `.env`:

```bash
npx tsx scripts/phase7-pricing-verification.ts
```

If the script connects and runs, the database is reachable from your machine.

## 5. Phase 7 fallback (no local DB access)

If you cannot connect from your network at all, you can still complete **Phase 7** by running a generated SQL script **inside Supabase Dashboard**:

```bash
npm run migration:phase7:dashboard
```

This generates `supabase-phase7-pricing-compare.sql`.

Then:

1. Supabase Dashboard → **SQL Editor**
2. Paste the contents of `supabase-phase7-pricing-compare.sql`
3. Run it and confirm `unit_mismatches`, `booking_mismatches`, `coupon_mismatches` are **0**

---

**Summary:** In most cases the issue is a **paused Supabase project**. Restore it from the dashboard, then retry.
