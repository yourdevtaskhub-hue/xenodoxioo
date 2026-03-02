# ROOM / PROPERTY DETAIL PAGE — LUXURY UX BLUEPRINT

**LEONIDIONHOUSES · Premium Villa Rentals**

*Senior Luxury Hospitality UX · CRO · Premium UI Architecture*

---

## PHASE 1 — UX AUDIT

### 1.1 Current State Analysis (Based on PropertyDetail.tsx)

| Element | Current State | Issue |
|--------|----------------|-------|
| **Hero** | 4-column grid (2+2), constrained width, black bg | Not immersive; feels "listing" not "experience" |
| **Title** | Below gallery, left-aligned | No overlay on hero; weak first impression |
| **Price** | In sidebar only | Price invisible until scroll; no anchoring on hero |
| **Unit switcher** | None (multi-unit properties) | If property has units, no clear way to switch |
| **Booking card** | Sticky sidebar, basic | No scarcity, no urgency, no emotional CTA |
| **Trust badges** | 3 lines, small text | Buried; not visually prominent |
| **Reviews** | Not implemented | Major trust gap |
| **Map / Location** | Not implemented | Trust + logistics gap |
| **FAQ / Policies** | Not implemented | Objection handling absent |
| **Share / Favorite** | Heart only | Share missing; social proof opportunity lost |

---

### 1.2 Trust Gaps

| Gap | Impact | Evidence |
|-----|--------|----------|
| **No reviews** | Users cannot validate quality | High bounce; decision paralysis |
| **No verified badge** | Unclear if property is vetted | Skepticism |
| **No host/owner presence** | Feels transactional | Less emotional connection |
| **Generic trust badges** | "Secure payment", "Free cancel" feel boilerplate | Low credibility |
| **No real photos vs renders** | If mix exists, no differentiation | Trust erosion |
| **No booking count / popularity** | No social proof | "Is anyone booking this?" |

---

### 1.3 Emotional Gaps

| Gap | Impact |
|-----|--------|
| **Description is utilitarian** | No storytelling; no "imagine waking up here" |
| **Highlights are bullets** | Feels like a spec sheet, not a narrative |
| **No aspirational imagery** | Lacks lifestyle / moment framing |
| **Video section is good** | Keep; but could be more prominent |
| **No "why book now"** | No FOMO, no dream activation |

---

### 1.4 Conversion Friction Points

| Friction | Location | Fix Direction |
|----------|----------|---------------|
| **CTA below fold** | Mobile: user must scroll to book | Sticky bottom bar |
| **Calendar UX** | Basic date picker | Clear visual feedback; min stay notice |
| **Price opacity** | "Taxes & fees" vague | Transparent breakdown; no surprises |
| **No date validation before CTA** | Alert on click | Disable CTA until valid; show inline message |
| **Single CTA** | One "Book Now" | Add secondary "Check availability" for early intent |
| **No guest count in booking card** | Assumed | Surface guests; link to max capacity |

---

### 1.5 Information Hierarchy Risks

| Risk | Cause | Fix |
|------|-------|-----|
| **Cognitive overload** | Too much text before value prop | Lead with hero + price + CTA; defer details |
| **Flat hierarchy** | All sections similar weight | Clear H1 → H2 → body; visual rhythm |
| **Buried differentiators** | View video, highlights mid-page | Move key moments higher |
| **Amenities = checklist** | Dense list | Group; icons; progressive disclosure |

---

## PHASE 2 — STRUCTURAL REDESIGN

### 2.1 NEW PAGE ARCHITECTURE (Top → Bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HERO (full-bleed, 100vw)                                     │
│    - Immersive gallery (5–7 images)                             │
│    - Overlay: title, location, price, availability badge        │
│    - Sticky "Book now" pill (appears on scroll)                 │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ 2. QUICK INFO BAR (horizontal strip)                            │
│    - Guests · Beds · Baths · Key amenity icons · Location       │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ 3. MAIN CONTENT (2-col on desktop)                              │
│    ┌──────────────────────────────┬────────────────────────────┐│
│    │ LEFT (70%)                   │ RIGHT (30%)                ││
│    │ 3a. Experience copy          │ 6. BOOKING CARD (sticky)   ││
│    │ 3b. View-from-room video     │    - Date picker           ││
│    │ 3c. Amenities (icon grid)    │    - Price breakdown       ││
│    │ 3d. Highlights               │    - CTA + trust           ││
│    │ 3e. Photo gallery (expand.)  │    - Scarcity line         ││
│    │ 4. Trust & reviews           │                            ││
│    │ 5. Location / map            │                            ││
│    │ 7. FAQ / policies            │                            ││
│    └──────────────────────────────┴────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ 8. MOBILE: Floating bottom CTA bar (when booking card off-screen)│
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.2 HERO SECTION — Specification

**Layout:**
- **Desktop:** Full viewport width, aspect ratio ~16:9 or 3:2, min-height 70vh.
- **Mobile:** Full width, min-height 50vh, swipe between images.
- **Gallery:** 1 large + 4 thumbnails (current) OR Airbnb-style 5-tile grid (1 large left, 4 right).
- **Overlay (bottom gradient):** `linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)`.

**Overlay content (bottom-left):**
- Property/unit name (H1)
- Location (city, country) with MapPin icon
- Price: `€XXX / night` — bold, prominent
- Optional: "Free cancellation" or "Instant confirmation" badge

**Overlay (top-right):**
- Share button
- Favorite (Heart)
- "X photos" pill → opens lightbox

**Sticky CTA (desktop):**
- Appears when user scrolls past hero.
- Pill: `[€XXX] Book now` — fixed top or floating; scrolls away when booking card visible.

**Image hierarchy:**
1. Main image: exterior or best "wow" shot
2. Living area
3. Bedroom
4. Bathroom
5. View / terrace

---

### 2.3 QUICK INFO BAR — Specification

**Layout:** Horizontal strip, full width, subtle background (`bg-muted/30`), padding 16–24px.

**Content (flex row, gap 24–32px):**
- Guests: `{maxGuests} guests` + Users icon
- Bedrooms: `{bedrooms} bedrooms` + Bed icon
- Bathrooms: `{bathrooms} baths` + Bath icon
- Bed type: "King bed" (if data exists) or "Comfortable beds"
- Amenity icons: WiFi, Pool, AC, Parking — icon only, tooltip on hover
- Location: short string, e.g. "Leonidion, Arcadia"

**Style:** Icons 20–24px; text 14–16px; font-medium. Clean, scannable, no clutter.

---

### 2.4 EXPERIENCE DESCRIPTION — Specification

**Structure:**
- **H2:** "About this room" (or emotional variant)
- **Lead paragraph:** 2–3 sentences, emotional, "you" language. *"Wake up to the sound of the sea. This villa is your private retreat..."*
- **Body:** Scannable — short paragraphs, 2–3 lines max.
- **Unit-specific:** If currentUnit.description exists, show as distinct block or highlighted callout.

**Typography:**
- Lead: 18–20px, line-height 1.6
- Body: 16px, line-height 1.7
- Use a serif or elegant sans for lead (optional) to elevate perceived quality.

---

### 2.5 AMENITIES SECTION — Specification

**Layout:** Icon grid, 3–4 columns desktop, 2 mobile.

**Grouping (optional expandable):**
- **Essentials:** WiFi, AC, Kitchen, TV
- **Outdoor:** Pool, Terrace, Parking
- **Extras:** Beach access, Washing machine, etc.

**Card style:**
- Icon (32px) + label
- Optional: short description on hover or in accordion
- Light borders or dividers; ample white space

---

### 2.6 PHOTO EXPERIENCE — Specification

**Desktop:**
- **Primary:** Click main image → lightbox (fullscreen overlay).
- **Lightbox:** Prev/Next arrows, close, image counter, smooth transitions (300–400ms).
- **Thumbnails:** Horizontal scroll or grid; click to change main.

**Mobile:**
- Swipe between images (touch).
- Pinch to zoom in lightbox.
- Thumbnail strip below (horizontal scroll).

**Alternative:** Cinematic scroll — images as full-width sections, parallax on scroll (heavier; use if performance allows).

---

### 2.7 TRUST & SOCIAL PROOF — Specification

**Reviews block:**
- **Header:** "Guest reviews" + average rating (e.g. 4.9) + "X reviews"
- **Rating breakdown:** Bars for 5★, 4★, 3★ (if data)
- **2–3 testimonials:** Photo, name, date, excerpt (2 lines)
- **CTA:** "Read all reviews" → modal or separate page

**Verified indicator:**
- Badge: "Verified property" or "Host verified" with checkmark
- Place near title or in quick info bar

**Trust badges (revisit):**
- Icon + short line; e.g. "Free cancellation up to 60 days"
- "Secure payment · Stripe"
- "Professional cleaning included"
- Place near CTA; larger, more visible.

---

### 2.8 BOOKING CARD — Specification

**Desktop:** Sticky sidebar, `top: 96px` (below nav), `max-height: calc(100vh - 120px)`, overflow scroll if needed.

**Content order:**
1. Price: `€XXX / night` — large, bold
2. "Plus taxes and fees" — small, linked to breakdown
3. Date picker (check-in / check-out)
4. Guests selector (optional)
5. Price breakdown (nights × rate, cleaning, total)
6. **Primary CTA:** "Reserve" or "Check availability"
7. Trust line: "You won't be charged yet"
8. Trust badges (3 lines)
9. **Scarcity line (if data):** "Only 2 dates left this month" or "X people viewing"

**Styling:** Card with subtle shadow, rounded corners (12–16px), clear separation from content.

---

### 2.9 LOCATION SECTION — Specification

**Layout:** Full width block; map container 100% width, height 300–400px.

**Map:**
- Embedded (Google Maps, Mapbox) or static image with link.
- Marker on property; optional: nearby beach, town center.

**Below map:**
- Address
- "Nearby: Beach 2km, Leonidion 5min" — 3–4 highlights with icons.

---

### 2.10 FAQ / OBJECTION HANDLING — Specification

**Accordion or cards:**
- Check-in / Check-out times
- Cancellation policy (summary)
- House rules (pets, smoking, etc.)
- How to get there
- Contact: link to contact page or WhatsApp

**Placement:** After location; before footer. Reduces last-moment doubts.

---

## PHASE 3 — LUXURY VISUAL DESIGN SYSTEM

### 3.1 Color Palette (Room Page Specific)

| Role | Current | Recommendation | Usage |
|------|---------|----------------|-------|
| **Primary** | Mediterranean blue | Keep; use sparingly for CTAs, links | Buttons, links, accents |
| **Accent** | Gold | Use for highlights, badges | "Verified", price emphasis, icons |
| **Background** | White | Add `neutral-50` for sections | Alternating section bg |
| **Text** | Dark gray | `neutral-900` primary; `neutral-600` secondary | Hierarchy |
| **Muted** | Light gray | `neutral-400` for tertiary | Captions, metadata |

**Hero overlay:** Dark gradient; white text for contrast.

---

### 3.2 Typography

**Current:** Poppins (sans-serif).

**Recommendation:**
- **Headlines:** Poppins 700–800 or switch to a more distinctive serif (e.g. Playfair Display, Cormorant) for H1/H2 to signal luxury.
- **Body:** Poppins 400–500; keep for readability.
- **Scale:** H1 36–48px; H2 24–28px; H3 18–20px; body 16px; small 14px.

---

### 3.3 White Space

- Section padding: 48–64px vertical (desktop), 32–40px (mobile).
- Between sections: 64–80px.
- Card padding: 24–32px.
- Avoid cramped blocks; let content breathe.

---

### 3.4 Cards & Elevation

- **Cards:** `rounded-2xl`, `shadow-sm`, `border border-border/50`.
- **Hover:** `shadow-md`, subtle `-translate-y-0.5`.
- **Booking card:** `shadow-xl` to emphasize importance.

---

### 3.5 Micro-animations

- **Gallery:** Fade 300ms on image change.
- **Buttons:** Scale 0.98 on click; 200ms transition.
- **Hover states:** 200–300ms ease.
- **Scroll-in:** Fade-up for sections (optional; use sparingly).
- **Skeleton:** For loading states; shimmer effect.

---

### 3.6 Aesthetic Reference

- **Airbnb Luxe:** Clean, spacious, hero-led.
- **Aman Resorts:** Minimal, typography-led, calm.
- **Boutique hotel:** Warm, editorial, lifestyle imagery.

**Blend:** Generous white space + strong hero + clear booking path + subtle gold accents.

---

## PHASE 4 — MOBILE-FIRST REDESIGN

### 4.1 Layout

- Single column; no sidebar.
- Hero: full width, 50vh min.
- Quick info: horizontal scroll if needed, or 2-row grid.
- Content: full width, stacked sections.
- Booking card: after quick info OR floating bottom bar.

### 4.2 Sticky Bottom Bar

- **When:** Booking card scrolls out of view (IntersectionObserver).
- **Content:** `[€XXX] Reserve` — price + CTA.
- **Height:** 56–64px; safe area padding.
- **Tap:** Scroll to booking card or open bottom sheet with dates + CTA.

### 4.3 Thumb Zone

- Primary CTA: bottom center or bottom right (right-hand users).
- Navigation: bottom or top; avoid mid-screen for primary actions.
- Swipe: gallery; left/right for images.

### 4.4 Performance

- Lazy-load images below fold.
- Video: `preload="metadata"` (already in place).
- Consider blur placeholder for images.
- Skeleton screens for async content.

---

## PHASE 5 — PSYCHOLOGY & CONVERSION OPTIMIZATION

### 5.1 Emotional Triggers

| Trigger | Implementation |
|---------|----------------|
| **Aspiration** | Hero imagery; "Wake up to..." copy |
| **Belonging** | "Join X guests who've stayed here" |
| **Scarcity** | "2 dates left this month" (if true) |
| **Authority** | "Verified property"; host badge |
| **Reciprocity** | "Free guide to Leonidion" or local tips |

### 5.2 Scarcity & Urgency

- **Placement:** Near booking card; below price.
- **Copy:** "Only X dates available in [month]" or "X people viewing now" (if real-time).
- **Avoid** fake urgency; only use real data.

### 5.3 Risk Reduction

- "Free cancellation before 60 days" — prominent.
- "You won't be charged yet" — near CTA.
- "Secure payment" with Stripe badge.
- Clear cancellation policy link.

### 5.4 Anchoring

- Show price per night prominently first.
- Then total for selected dates.
- Optional: "From €XXX" if seasonal pricing.
- Avoid hiding total until end.

### 5.5 Trust Badge Placement

- Near CTA (within 1–2 lines).
- In quick info bar (1–2 items).
- In footer of booking card.
- Icons + short text; scannable.

---

## PHASE 6 — INTERACTION DESIGN & MICRODETAILS

### 6.1 Gallery

- Smooth crossfade (300ms) on image change.
- Keyboard: arrow keys in lightbox.
- Thumbnails: active state (border, scale).

### 6.2 Hover States

- Cards: lift + shadow.
- Buttons: slight darken or scale.
- Links: underline or color shift.
- Amenity icons: tooltip with label.

### 6.3 Loading

- Skeleton for hero (aspect ratio preserved).
- Skeleton for booking card (price, calendar placeholder).
- Skeleton for content blocks.
- No spinners for full-page; use skeletons.

### 6.4 Error States

- Invalid dates: inline message, not alert().
- API error: friendly message + retry CTA.
- 404: branded, with "Browse villas" link.

### 6.5 Confirmation Delight

- Post-booking: confetti (subtle) or success animation.
- Clear next steps: "Check your email", "Add to calendar".

---

## IMPLEMENTATION PRIORITY

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Hero overlay (price, title) + full-bleed | Medium | High |
| P0 | Sticky bottom CTA (mobile) | Low | High |
| P0 | Trust badges near CTA; larger | Low | Medium |
| P1 | Quick info bar | Low | Medium |
| P1 | Date validation before CTA (no alert) | Low | Medium |
| P1 | Scarcity line (when data available) | Low | Medium |
| P2 | Reviews block (when data available) | High | High |
| P2 | Map / location section | Medium | Medium |
| P2 | FAQ accordion | Medium | Medium |
| P3 | Lightbox for gallery | Medium | Medium |
| P3 | Typography upgrade (serif headlines) | Low | Medium |
| P3 | Skeleton loading | Medium | Low |

---

## APPENDIX: TRANSLATION KEYS TO ADD

For the new sections, ensure these exist in `translations.ts`:

- `property.quickInfo.guests`, `property.quickInfo.bedrooms`, etc.
- `property.reviews.title`, `property.reviews.rating`, `property.reviews.readAll`
- `property.location.title`, `property.location.nearby`
- `property.faq.checkIn`, `property.faq.cancellation`, etc.
- `property.booking.scarcity`, `property.booking.noChargeYet`

---

*Document version: 1.0 · LEONIDIONHOUSES Room Page UX Blueprint*
