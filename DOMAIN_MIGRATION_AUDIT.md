# Domain Migration Audit: leonidion-houses.com → leonidionhouses.com

**Production-grade, zero-downtime migration plan**  
**Date:** March 2025  
**Scope:** Full system migration to new Namecheap domain

---

## 1. High-Level Migration Plan

### Overview
Migrate the entire production system from `leonidion-houses.com` (hyphen) to `leonidionhouses.com` (no hyphen) with **zero downtime** and **zero broken functionality**. The site is hosted on Netlify (site: `incredible-panda-05f89b`), uses Stripe, Supabase, Resend/Amazon SES for email, and custom JWT authentication.

### Strategy
1. **Phase 0 (Prep):** Update all code fallbacks and env references; prepare external services.
2. **Phase 1 (Add & Verify):** Add new domain to Netlify as alias; configure Namecheap DNS.
3. **Phase 2 (Cutover):** Update Stripe webhook, Netlify env vars, promote new domain to primary.
4. **Phase 3 (Redirect & Cleanup):** Add 301 redirects from old to new domain; update Resend/SES for new domain.
5. **Phase 4 (External Services):** Update Google Search Console, Analytics (if any), and final validation.

### Key Principle
**Add before remove.** The new domain will coexist with the old during DNS propagation. Do NOT remove the old domain until the new one is fully verified and working.

---

## 2. Full Checklist of What Must Change

### 2.1 Netlify
- [ ] Add `leonidionhouses.com` and `www.leonidionhouses.com` as domain aliases
- [ ] Verify DNS propagation for new domain
- [ ] Update environment variables: `FRONTEND_URL`, `FROM_EMAIL`, `ADMIN_EMAIL`, `SUPPORT_EMAIL`
- [ ] Promote `leonidionhouses.com` to primary domain (after verification)
- [ ] Add 301 redirect from `leonidion-houses.com` → `leonidionhouses.com` (in Netlify or via `_redirects` / `netlify.toml`)
- [ ] Optionally remove `leonidion-houses.com` after redirect period (or keep indefinitely)

### 2.2 DNS (Namecheap)
- [ ] Remove existing CNAME `www` → `parkingpage.namecheap.com`
- [ ] Remove URL redirect `@` → `http://www.leonidionhouses.com`
- [ ] Add **A record**: Host `@`, Value `75.2.60.5` (Netlify load balancer), TTL `300` (or 600)
- [ ] Add **CNAME record**: Host `www`, Value `incredible-panda-05f89b.netlify.app`, TTL `300`
- [ ] Add email records for `leonidionhouses.com` (see Section 2.5)

### 2.3 Stripe
- [ ] Add new webhook endpoint: `https://www.leonidionhouses.com/api/payments/webhook`
- [ ] Verify webhook with Stripe CLI or Dashboard (test mode first if applicable)
- [ ] Update production webhook endpoint to new URL
- [ ] Verify Checkout success/cancel URLs (they use `window.location.origin` — dynamic, no code change)
- [ ] If Customer Portal is used: update any domain-specific redirect URLs
- [ ] **Do NOT remove old webhook until new one is live and tested**

### 2.4 Supabase
- [ ] **Auth:** This project uses **custom JWT auth** (Supabase as DB only), not Supabase Auth. No Site URL or Redirect URLs to change in Supabase Auth.
- [ ] **Storage:** URLs are `https://[project-ref].supabase.co/storage/...` — domain-agnostic. No change.
- [ ] **Edge Functions:** None found that depend on domain.
- [ ] **Database:** No domain-specific data identified (guest-system email is internal).

### 2.5 Email (Resend + Amazon SES)
- [ ] **Resend:** Add domain `leonidionhouses.com` in Resend Dashboard → Domains
- [ ] Add DKIM (TXT), SPF (TXT) records to Namecheap DNS as Resend instructs
- [ ] Verify domain in Resend
- [ ] Update `FROM_EMAIL` to `noreply@leonidionhouses.com` (or `send@leonidionhouses.com` if using subdomain)
- [ ] **Amazon SES** (if used for `send.leonidion-houses.com`): Add `send.leonidionhouses.com` in SES, verify, add MX/SPF to Namecheap
- [ ] Add DMARC: `_dmarc` TXT `v=DMARC1; p=none;` for `leonidionhouses.com` (optional but recommended)

### 2.6 Code & Config
- [ ] **server/index.ts** (line 101): Add `https://www.leonidionhouses.com`, `https://leonidionhouses.com` to CORS origins
- [ ] **server/services/email.service.ts** (lines 5, 12): Update fallback FROM_EMAIL and getFrontendUrl()
- [ ] **server/routes/inquiries.ts** (lines 73, 264): Update fallback baseUrl
- [ ] **netlify/functions/api.ts** (lines 1051, 1304, 1395, 1397, 1899, 1907, 2147, 2204): Update all fallbacks
- [ ] **netlify/functions/stripe-webhook.ts** (lines 75, 202, 324): Update fallbacks
- [ ] **netlify/functions/confirm-payment-status.ts** (lines 97, 98): Update fallbacks
- [ ] **.env.example**: Update `FRONTEND_URL`, `ADMIN_EMAIL`, `SUPPORT_EMAIL`, `FROM_EMAIL`
- [ ] **scripts/add-custom-checkout-offers.sql**: `guest-system@leonidion-houses.com` → `guest-system@leonidionhouses.com` (only for new installs)
- [ ] **supabase-guest-user-migration.sql**: Same guest email update (only for new installs)

### 2.7 Frontend
- [ ] **client/pages/Contact.tsx** (line 159): Already `info@leonidionhouses.com` — no change
- [ ] **client/lib/translations.ts**: Already `info@leonidionhouses.com` — no change
- [ ] **client/pages/Checkout.tsx** (line 60): `return_url: window.location.origin + "/dashboard"` — dynamic, no change

### 2.8 SEO & External Services
- [ ] **Google Search Console**: Add property for `leonidionhouses.com`; submit sitemap; request indexing
- [ ] **Google Analytics**: Update property URL if GA is used (none found in codebase — verify)
- [ ] **Facebook/Meta Pixel**: Update domain if used (none found in codebase)
- [ ] **sitemap.xml**: Not found in project — add if desired for SEO
- [ ] **robots.txt**: Generic, no domain — no change
- [ ] **Canonical/og:url**: No hardcoded domain in meta tags found

### 2.9 Documentation
- [ ] Update `PRODUCTION_CHECKLIST.md`, `NETLIFY_FUNCTIONS_SETUP.md`, `PRODUCTION_WEBHOOK_CHECKLIST.md`, `ONLINE_TEST_DEPLOYMENT_CHECKLIST.md`, `NETLIFY_FIX_INSTRUCTIONS.md` with new domain references

---

### Phase 0 Code Changes — ✅ COMPLETED
All hardcoded fallbacks have been updated to `leonidionhouses.com` in:
- `server/index.ts`, `server/services/email.service.ts`, `server/routes/inquiries.ts`
- `netlify/functions/api.ts`, `stripe-webhook.ts`, `confirm-payment-status.ts`
- `.env.example`, `scripts/add-custom-checkout-offers.sql`, `supabase-guest-user-migration.sql`
- `netlify.toml`: 301 redirects from old domain to new added

---

## 3. Step-by-Step Execution Plan

### Phase 0: Preparation (No production impact)
1. **Code changes**
   - Update all hardcoded fallbacks in codebase to `leonidionhouses.com` (see Section 2.6)
   - Update CORS in `server/index.ts` to include new domain
   - Update `.env.example`
   - Commit and push (deploy will still serve old domain until Phase 2)

2. **Resend**
   - Add `leonidionhouses.com` in Resend Dashboard
   - Note DKIM/SPF records to add later

3. **Amazon SES** (if applicable)
   - Add `send.leonidionhouses.com` in SES
   - Note MX/SPF records

### Phase 1: Add & Verify New Domain (Zero downtime)
4. **Netlify – Add domain alias**
   - Netlify → Domain management → Add domain alias
   - Add `leonidionhouses.com` and `www.leonidionhouses.com`
   - Netlify will show required DNS records

5. **Namecheap – Configure DNS**
   - Delete: CNAME `www` → `parkingpage.namecheap.com`
   - Delete: URL Redirect `@` → `http://www.leonidionhouses.com`
   - Add A record: `@` → `75.2.60.5`
   - Add CNAME: `www` → `incredible-panda-05f89b.netlify.app`
   - Set TTL to 300 (5 min) for faster propagation during migration

6. **Wait for DNS propagation**
   - Use `dig leonidionhouses.com` or online tools (e.g. dnschecker.org)
   - Expect 5–30 minutes with low TTL; up to 48h in edge cases

7. **Verify in Netlify**
   - Netlify will provision Let’s Encrypt SSL for new domain
   - Ensure both `leonidionhouses.com` and `www.leonidionhouses.com` show green/verified

### Phase 2: Cutover
8. **Netlify environment variables**
   - Set `FRONTEND_URL=https://www.leonidionhouses.com`
   - Set `FROM_EMAIL=noreply@leonidionhouses.com` (after Resend verification)
   - Set `ADMIN_EMAIL=admin@leonidionhouses.com`
   - Set `SUPPORT_EMAIL=support@leonidionhouses.com`
   - Trigger **Clear cache and deploy site**

9. **Stripe webhook**
   - Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://www.leonidionhouses.com/api/payments/webhook`
   - Use same events as existing webhook
   - Copy new signing secret; add as `STRIPE_WEBHOOK_SECRET` in Netlify (or second env var if dual-webhook)
   - **Important:** Keep old webhook active until new one is confirmed (or switch secret and remove old)

10. **Promote primary domain**
    - Netlify → Domain management → Options (⋯) next to `leonidionhouses.com` → Set as primary
    - Set `www.leonidionhouses.com` to redirect to primary

### Phase 3: Redirects & Email
11. **301 redirect (old → new)**
    - Netlify → Domain settings → Add redirect rules, or add to `netlify.toml`:
    ```toml
    [[redirects]]
      from = "https://leonidion-houses.com/*"
      to = "https://www.leonidionhouses.com/:splat"
      status = 301
      force = true
    [[redirects]]
      from = "https://www.leonidion-houses.com/*"
      to = "https://www.leonidionhouses.com/:splat"
      status = 301
      force = true
    ```

12. **Resend domain verification**
    - Add Resend’s TXT records to Namecheap for `leonidionhouses.com`
    - Verify domain in Resend
    - Update `FROM_EMAIL` in Netlify (if not done in step 8)

13. **Amazon SES** (if used)
    - Add `send.leonidionhouses.com` MX and SPF to Namecheap
    - Verify in SES

### Phase 4: Validation & SEO
14. **Google Search Console**
    - Add property `https://www.leonidionhouses.com`
    - Submit sitemap (create if missing)
    - Use "Change of address" if moving from old property

15. **Final checks**
    - Run Validation Checklist (Section 5)
    - Monitor Netlify logs and Stripe webhook deliveries

---

## 4. Critical Gotchas (Things Most People Miss)

### 4.1 Stripe Webhook
- **Webhook signing secret changes** when you add a new endpoint. Updating `STRIPE_WEBHOOK_SECRET` in Netlify will break the old domain’s webhook. **Options:**
  - **(A)** Add new webhook, update secret, remove old webhook (brief window where old-domain payments might not trigger webhook if user pays while on old domain — mitigated by 301 redirect).
  - **(B)** Keep both webhooks temporarily; both point to same Netlify site, so both will hit the same function. Stripe allows multiple endpoints — you can have both URLs active; the function uses the same secret. **Reality:** Stripe sends to each endpoint independently. If you use one secret, both URLs must validate with that secret. When you create a new webhook, you get a new secret. So you either (1) update the endpoint URL on the *existing* webhook (simplest), or (2) add new webhook, update env to new secret, test, then delete old webhook.
- **Recommended:** Update the *existing* webhook URL in Stripe from `https://www.leonidion-houses.com/api/payments/webhook` to `https://www.leonidionhouses.com/api/payments/webhook`. Same secret, no env change. Do this only after the new domain is live and SSL is ready.

### 4.2 Email Links in Flight
- Emails sent *before* the env update (password reset, booking confirmation) will have links to `leonidion-houses.com`. After 301 redirect, those links still work and will redirect. No fix needed, but be aware.

### 4.3 CORS During Propagation
- If CORS is too strict, requests from `leonidionhouses.com` may fail until `FRONTEND_URL` and CORS include the new domain. **Do Phase 0 code changes before Phase 2** so CORS allows the new domain.

### 4.4 Resend FROM_EMAIL
- Resend requires the sending domain to be verified. Until `leonidionhouses.com` is verified, keep using `onboarding@resend.dev` or the old verified domain. Switch `FROM_EMAIL` only after verification.

### 4.5 Guest System Email
- `guest-system@leonidion-houses.com` exists in DB. It’s a system user. No need to change unless you re-run migrations. New installs should use `guest-system@leonidionhouses.com`.

### 4.6 netlify.toml Redirect Order
- Redirects are matched in order. Place the old→new 301 rules *before* the SPA fallback `/*` rule.

### 4.7 Stripe Checkout return_url
- The code uses `window.location.origin + "/dashboard"`. That’s correct — it uses the current domain. No code change.

### 4.8 SSL During Verification
- Netlify issues certificates automatically. DNS must propagate first. If the domain shows "Needs configuration", wait for DNS.

---

## 5. Validation Checklist (Post-Migration Testing)

### 5.1 DNS & SSL
- [ ] `https://leonidionhouses.com` loads and redirects to `https://www.leonidionhouses.com`
- [ ] `https://www.leonidionhouses.com` loads with valid SSL (no warnings)
- [ ] `https://leonidion-houses.com` 301-redirects to `https://www.leonidionhouses.com`
- [ ] `https://www.leonidion-houses.com` 301-redirects to `https://www.leonidionhouses.com`

### 5.2 Core Flows
- [ ] Homepage and property pages load
- [ ] Images from Supabase Storage load
- [ ] User registration and login work
- [ ] Password reset: request reset → receive email → link works → reset succeeds

### 5.3 Bookings & Payments
- [ ] Create test booking (logged-in user)
- [ ] Stripe Checkout completes
- [ ] Redirect to `/dashboard` after payment
- [ ] Booking confirmation email received with correct links (`leonidionhouses.com`)
- [ ] Stripe Dashboard shows webhook delivery 200 for new domain

### 5.4 Custom Offer / Guest Checkout
- [ ] Admin creates custom offer; guest receives link
- [ ] Link opens `https://www.leonidionhouses.com/checkout?offer=...`
- [ ] Guest completes payment
- [ ] Confirmation and receipt emails received with correct domain links

### 5.5 Admin & Inquiries
- [ ] Admin login works
- [ ] New inquiry triggers admin email with correct dashboard link
- [ ] Admin reply triggers guest email with correct inquiry link

### 5.6 Email
- [ ] All transactional emails use `noreply@leonidionhouses.com` (or verified sending domain)
- [ ] Emails land in inbox (not spam)
- [ ] Links in emails point to `leonidionhouses.com`

### 5.7 CORS & API
- [ ] No CORS errors in browser console
- [ ] API calls to `/api/*` succeed from new domain

---

## 6. Rollback Plan

### If something breaks during cutover

1. **Netlify**
   - Revert primary domain to `leonidion-houses.com`
   - Revert env vars: `FRONTEND_URL`, `FROM_EMAIL`, `ADMIN_EMAIL`, `SUPPORT_EMAIL`
   - Trigger deploy

2. **Stripe**
   - If webhook was updated: change it back to `https://www.leonidion-houses.com/api/payments/webhook`
   - Or add back the old webhook endpoint if it was removed

3. **DNS (Namecheap)**
   - Optionally point `leonidionhouses.com` back to parking page if you need to "pause" the new domain
   - Do not remove A/CNAME for `leonidion-houses.com` (it uses Netlify DNS, not Namecheap)

4. **Code**
   - Revert commit with fallback changes (git revert)
   - Redeploy

### Recovery time
- Netlify redeploy: ~2–5 min
- DNS propagation (if reverting): up to TTL (e.g. 5–30 min)
- Stripe webhook: immediate after change

### Prevention
- Perform migration during low-traffic window
- Keep old domain live with 301 redirect for at least 2 weeks
- Monitor Stripe webhook logs and Netlify function logs during cutover

---

## 7. File-by-File Change Summary

| File | Line(s) | Change |
|------|---------|--------|
| `server/index.ts` | 101 | Add `https://www.leonidionhouses.com`, `https://leonidionhouses.com` to CORS |
| `server/services/email.service.ts` | 5, 10-12 | Fallback: `noreply@leonidionhouses.com`, `https://www.leonidionhouses.com` |
| `server/routes/inquiries.ts` | 73, 264 | Fallback baseUrl |
| `netlify/functions/api.ts` | 1051, 1304, 1395, 1397, 1899, 1907, 2147, 2204 | All FRONTEND_URL/EMAIL fallbacks |
| `netlify/functions/stripe-webhook.ts` | 75, 202, 324 | FRONTEND_URL fallback |
| `netlify/functions/confirm-payment-status.ts` | 97, 98 | FRONTEND_URL, FROM_EMAIL fallbacks |
| `.env.example` | 17, 37, 38 | FRONTEND_URL, ADMIN_EMAIL, SUPPORT_EMAIL |

---

## 8. Namecheap DNS Records (Final State)

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 75.2.60.5 | 300 |
| CNAME | www | incredible-panda-05f89b.netlify.app | 300 |
| TXT | resend._domainkey | (from Resend dashboard) | 300 |
| TXT | @ | v=spf1 include:resend.com ~all | 300 |
| TXT | _dmarc | v=DMARC1; p=none; | 300 |

*If using Amazon SES `send` subdomain:*
| MX | send | 10 feedback-smtp.us-east-1.amazonses.com | 300 |
| TXT | send | v=spf1 include:amazonses.com ~all | 300 |

---

*End of Migration Audit*
