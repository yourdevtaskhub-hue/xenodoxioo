import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const path = event.path || event.rawPath || "";
  const match = path.match(/\/api\/payments\/confirm-status\/([^/]+)/);
  const bookingId = match?.[1];

  if (!bookingId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "bookingId is required" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

  try {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No payment found" }),
      };
    }

    if (payment.status === "COMPLETED") {
      const { data: booking } = await supabase.from("bookings").select("id, status, payment_status").eq("id", bookingId).single();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: { alreadyConfirmed: true, booking } }),
      };
    }

    if (!payment.stripe_payment_intent_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No Stripe payment intent" }),
      };
    }

    const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

    if (pi.status === "succeeded") {
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      await supabase.from("payments").update({
        status: "COMPLETED",
        processed_at: new Date().toISOString(),
        stripe_charge_id: chargeId,
      }).eq("id", payment.id);

      const payType = payment.payment_type || "FULL";
      const directUpdate: Record<string, any> = {
        status: "CONFIRMED",
        payment_status: payType === "FULL" ? "PAID_FULL" : "DEPOSIT_PAID",
        total_paid: Number(payment.amount),
      };
      if (payType === "FULL") {
        directUpdate.deposit_paid = true;
        directUpdate.balance_paid = true;
        directUpdate.remaining_amount = 0;
      }
      await supabase.from("bookings").update(directUpdate).eq("id", bookingId);

      // Send confirmation emails (frontend polling path - webhook may not fire)
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { data: fullBooking } = await supabase
          .from("bookings")
          .select("*, unit:units(*, property:properties(*))")
          .eq("id", bookingId)
          .single();

        if (fullBooking) {
          const resend = new Resend(apiKey);
          const from = `${process.env.FROM_NAME || "LEONIDIONHOUSES"} <${process.env.FROM_EMAIL || "noreply@leonidion-houses.com"}>`;
          const frontendUrl = process.env.FRONTEND_URL || "https://www.leonidion-houses.com";
          const unit = fullBooking.unit as any;
          const property = unit?.property;
          const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";
          const isGuest = !fullBooking.user_id || fullBooking.user_id === GUEST_USER_ID;
          const viewBookingUrl = isGuest
            ? `${frontendUrl}/booking/${fullBooking.id}?email=${encodeURIComponent(fullBooking.guest_email || "")}`
            : `${frontendUrl}/dashboard`;

          try {
            await resend.emails.send({
              from,
              to: fullBooking.guest_email,
              subject: `Payment Receipt - ${fullBooking.booking_number}`,
              html: `
                <h1>Payment Receipt</h1>
                <p>Dear ${fullBooking.guest_name},</p>
                <p>Your payment has been successfully processed.</p>
                <ul>
                  <li><strong>Booking:</strong> ${fullBooking.booking_number}</li>
                  <li><strong>Amount:</strong> €${Number(payment.amount).toFixed(2)}</li>
                </ul>
                <a href="${viewBookingUrl}" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a>
                <p>Best regards,<br/>LEONIDIONHOUSES</p>
              `,
            });

            const cancelLink = fullBooking.cancellation_token
              ? `${frontendUrl}/cancel-booking?token=${fullBooking.cancellation_token}`
              : null;
            const cancelSection = cancelLink
              ? `
                <p>If you wish to cancel your booking, you can do so by clicking the link below:</p>
                <p><a href="${cancelLink}" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Cancel Booking</a></p>
                <p><strong>Important:</strong> Before cancelling, you will see the terms and be asked to confirm. This link is personal and applies only to this specific booking.</p>
              `
              : "";

            await resend.emails.send({
              from,
              to: fullBooking.guest_email,
              subject: "Booking Confirmation",
              html: `
                <h1>Booking Confirmation</h1>
                <p>Dear ${fullBooking.guest_name},</p>
                <p>Thank you for your booking.</p>
                <ul>
                  <li><strong>Booking:</strong> ${fullBooking.booking_number}</li>
                  <li><strong>Room:</strong> ${property?.name || unit?.name || "N/A"}</li>
                  <li><strong>Arrival:</strong> ${new Date(fullBooking.check_in_date).toLocaleDateString("en-GB")}</li>
                  <li><strong>Departure:</strong> ${new Date(fullBooking.check_out_date).toLocaleDateString("en-GB")}</li>
                  <li><strong>Total:</strong> €${Number(fullBooking.total_price).toFixed(2)}</li>
                </ul>
                ${cancelSection}
                <p><a href="${viewBookingUrl}" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a></p>
                <p>Best regards,<br/>LEONIDIONHOUSES</p>
              `,
            });
          } catch (emailErr: any) {
            console.error("[confirm-payment-status] Email send failed:", emailErr);
          }
        }
      }

      const { data: updatedBooking } = await supabase
        .from("bookings")
        .select("id, status, payment_status, booking_number")
        .eq("id", bookingId)
        .single();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: { confirmed: true, booking: updatedBooking } }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        data: { confirmed: false, status: pi.status, message: `Payment status: ${pi.status}` },
      }),
    };
  } catch (err: any) {
    console.error("[confirm-payment-status] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
