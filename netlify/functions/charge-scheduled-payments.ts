/**
 * Netlify Scheduled Function: off-session balance charges for deposit-paid bookings.
 * Schedule: daily 08:00 UTC (see netlify.toml). Requires STRIPE_SECRET_KEY + Supabase env vars.
 */
import { chargeScheduledPayments } from "../../server/services/payment.service";

export default async () => {
  try {
    const result = await chargeScheduledPayments();
    console.log("[charge-scheduled-payments]", result);
  } catch (e: any) {
    console.error("[charge-scheduled-payments] Error:", e?.message || e);
    throw e;
  }
};

export const config = { schedule: "0 8 * * *" };
