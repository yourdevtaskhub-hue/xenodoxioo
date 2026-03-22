# Production: Custom Offer Webhook Checklist

Για να λειτουργούν κανονικά μετά την πληρωμή από custom URL:
- κράτηση στο Admin
- κλείδωμα ημερομηνιών στο ημερολόγιο
- αποστολή emails στον guest

## 1. Stripe Dashboard → Webhooks

1. Πήγαινε στο [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint** (ή επεξεργάσου το υπάρχον)
3. **Endpoint URL:** `https://ΤΟ-DOMAIN-SΟΥ.com/api/payments/webhook`
   - Π.χ. `https://www.leonidion-houses.com/api/payments/webhook`
   - Ή το Netlify URL αν δεν έχεις custom domain: `https://something.netlify.app/api/payments/webhook`
4. **Events to send:** Επίλεξε `payment_intent.succeeded` (και προαιρετικά `charge.succeeded`)
5. Κράτα το **Signing secret** (ξεκινά με `whsec_`)

## 2. Netlify Environment Variables

Στο Netlify → Site → Environment variables, βεβαιώσου ότι υπάρχουν:

| Variable | Περιγραφή |
|----------|-----------|
| `STRIPE_WEBHOOK_SECRET` | Το `whsec_...` από το βήμα 1 (production endpoint, ΟΧΙ από stripe listen) |
| `STRIPE_SECRET_KEY` | Το secret key του Stripe |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (όχι anon) |
| `RESEND_API_KEY` | Για αποστολή emails |
| `FROM_EMAIL` | Email που στέλνει (π.χ. noreply@domain.com) |
| `FROM_NAME` | Όνομα που στέλνει |
| `FRONTEND_URL` | Πλήρες URL του site (π.χ. https://www.leonidion-houses.com) |

## 3. Supabase: Τρέξε το Migration

Στο **Supabase Dashboard → SQL Editor**, εκτέλεσε:

```
scripts/add-custom-checkout-offers.sql
```

Αυτό δημιουργεί:
- τους πίνακες `custom_checkout_offers` και `pending_offer_checkouts`
- τον guest user που χρειάζεται η πίνακας `payments`

## 4. Έλεγχος & Logs

Μετά την πληρωμή από custom link:

1. **Stripe Dashboard → Webhooks → [endpoint] → Recent events:** Δες αν το `payment_intent.succeeded` έφτασε και τι απάντηση πήρε (200 = OK, 500 = server error)
2. **Netlify → Functions → stripe-webhook → Logs:** Θα δεις αναλυτικά:
   - `[WEBHOOK] Received request`
   - `[WEBHOOK] Verified event: payment_intent.succeeded`
   - `[WEBHOOK-OFFER] Starting processOfferPayment...`
   - `[WEBHOOK-OFFER] Found pending record...`
   - `[WEBHOOK-OFFER] Offer booking created: BKxxx`
   - `[WEBHOOK-OFFER] DONE — booking BKxxx created`
3. Αν σταματήσει πιο πριν (π.χ. "No pending offer for PI") → το create-intent-from-offer δεν έτρεξε ή έγραφε σε άλλο DB
4. Αν "Payments insert failed" → τρέξε το migration στο Supabase (guest user)

## Συχνά προβλήματα

- **403/404:** Λάθος URL στο Stripe — το URL πρέπει να δείχνει ακριβώς στο deployed site
- **Signature verification failed:** Λάθος `STRIPE_WEBHOOK_SECRET` — χρησιμοποίησε το secret του production endpoint, όχι το προσωρινό από `stripe listen`
- **Payments insert failed:** Ο guest user λείπει — εκτέλεσε ξανά το migration script στο Supabase
- **Emails δεν στέλνονται:** Έλεγξε `RESEND_API_KEY` και `FROM_EMAIL` στο Netlify
