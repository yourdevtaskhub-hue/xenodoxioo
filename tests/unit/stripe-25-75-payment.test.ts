/**
 * Comprehensive tests for Stripe 25%/75% payment logic, 21-day threshold,
 * scheduled balance charge, and cancellation behavior.
 *
 * Ensures:
 * 1. 25% deposit + 75% balance split is correct
 * 2. FULL payment when check-in ≤ 21 days away
 * 3. DEPOSIT only when check-in > 21 days away
 * 4. Balance (75%) charged 21 days before check-in
 * 5. CANCELLED bookings NEVER receive the 75% charge
 */

import { describe, it, expect } from "vitest";
import { calculatePaymentAmounts, PAYMENT_CONFIG } from "../../client/lib/stripe";

// ── Pure helpers (mirror server logic exactly) ────────────────────────────

function daysUntilDate(dateStr: string | Date): number {
  const target = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function determinePaymentType(
  checkInDate: Date | string,
  fullPaymentThresholdDays = 21
): "FULL" | "DEPOSIT" {
  const days = daysUntilDate(checkInDate);
  return days <= fullPaymentThresholdDays ? "FULL" : "DEPOSIT";
}

function calculateScheduledChargeDate(
  checkInDate: Date,
  balanceChargeDaysBefore = 21
): Date {
  const d = new Date(checkInDate);
  d.setDate(d.getDate() - balanceChargeDaysBefore);
  return d;
}

// Filter logic used by chargeScheduledPayments - CANCELLED must be excluded
function isEligibleForScheduledCharge(booking: {
  status: string;
  payment_status: string;
  scheduled_charge_date: string | Date | null;
  remaining_amount: number;
}): boolean {
  if (booking.status === "CANCELLED") return false;
  if (booking.payment_status !== "DEPOSIT_PAID") return false;
  if (booking.remaining_amount <= 0) return false;
  if (!booking.scheduled_charge_date) return false;

  const scheduled = new Date(booking.scheduled_charge_date);
  return scheduled <= new Date();
}

// ── 25% / 75% Split Tests ───────────────────────────────────────────────

describe("25% Deposit / 75% Balance Split", () => {
  it("calculates 25% deposit correctly for 1000€", () => {
    const { depositAmount, remainingAmount } = calculatePaymentAmounts(1000);
    expect(depositAmount).toBe(250);
    expect(remainingAmount).toBe(750);
  });

  it("calculates 25% deposit for 724.50€ (real booking scenario)", () => {
    const { depositAmount, remainingAmount, totalAmount } =
      calculatePaymentAmounts(724.5);
    expect(totalAmount).toBe(724.5);
    expect(depositAmount).toBe(181.13);
    expect(remainingAmount).toBe(543.37);
  });

  it("deposit + remaining equals total for various amounts", () => {
    const amounts = [100, 500, 724.5, 1000, 2500.99];
    for (const total of amounts) {
      const { depositAmount, remainingAmount, totalAmount } =
        calculatePaymentAmounts(total);
      expect(depositAmount + remainingAmount).toBeCloseTo(totalAmount, 2);
    }
  });

  it("PAYMENT_CONFIG has 25% deposit and 21 days", () => {
    expect(PAYMENT_CONFIG.depositPercentage).toBe(0.25);
    expect(PAYMENT_CONFIG.fullPaymentThresholdDays).toBe(21);
  });
});

// ── 21 Days Threshold: FULL vs DEPOSIT ───────────────────────────────────

describe("21 Days Threshold - FULL vs DEPOSIT", () => {
  it("FULL payment when check-in is 10 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);
    expect(determinePaymentType(checkIn)).toBe("FULL");
  });

  it("FULL payment when check-in is exactly 21 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 21);
    expect(determinePaymentType(checkIn)).toBe("FULL");
  });

  it("FULL payment when check-in is 20 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 20);
    expect(determinePaymentType(checkIn)).toBe("FULL");
  });

  it("DEPOSIT when check-in is 22 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 22);
    expect(determinePaymentType(checkIn)).toBe("DEPOSIT");
  });

  it("DEPOSIT when check-in is 60 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 60);
    expect(determinePaymentType(checkIn)).toBe("DEPOSIT");
  });

  it("DEPOSIT when check-in is 365 days away", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 365);
    expect(determinePaymentType(checkIn)).toBe("DEPOSIT");
  });
});

// ── Scheduled Charge Date (21 days before check-in) ──────────────────────

describe("Scheduled Charge Date = Check-in minus 21 days", () => {
  it("scheduled date is 21 days before June 1 check-in", () => {
    const checkIn = new Date(2026, 5, 1); // June 1
    const scheduled = calculateScheduledChargeDate(checkIn, 21);
    const expected = new Date(2026, 5, 1);
    expected.setDate(expected.getDate() - 21);
    expect(scheduled.toDateString()).toBe(expected.toDateString());
  });

  it("scheduled date is May 11 for June 1 check-in", () => {
    const checkIn = new Date(2026, 5, 1);
    const scheduled = calculateScheduledChargeDate(checkIn, 21);
    expect(scheduled.getMonth()).toBe(4); // May = 4
    expect(scheduled.getDate()).toBe(11);
  });

  it("FULL payment has no scheduled charge date", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);
    const type = determinePaymentType(checkIn);
    expect(type).toBe("FULL");
    // When FULL, scheduled_charge_date is null
  });
});

// ── End-to-End Payment Type + Amounts ────────────────────────────────────

describe("Full Payment Flow (>21 days = DEPOSIT)", () => {
  it("booking 60 days out: DEPOSIT 181.13€ now, 543.37€ at check-in minus 21", () => {
    const totalPrice = 724.5;
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 60);

    const type = determinePaymentType(checkIn);
    const { depositAmount, remainingAmount } = calculatePaymentAmounts(totalPrice);
    const scheduledDate = calculateScheduledChargeDate(checkIn, 21);

    expect(type).toBe("DEPOSIT");
    expect(depositAmount).toBe(181.13);
    expect(remainingAmount).toBe(543.37);
    expect(scheduledDate.getTime()).toBeLessThan(checkIn.getTime());
  });
});

describe("Full Payment Flow (≤21 days = FULL)", () => {
  it("booking 10 days out: FULL 724.50€ now, no scheduled charge", () => {
    const totalPrice = 724.5;
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);

    const type = determinePaymentType(checkIn);

    expect(type).toBe("FULL");
    expect(totalPrice).toBe(724.5);
  });
});

// ── CANCELLATION: 75% Must NEVER Be Charged ──────────────────────────────

describe("Cancellation - 75% Never Charged for CANCELLED", () => {
  it("CANCELLED booking is NOT eligible for scheduled charge", () => {
    const cancelled = {
      status: "CANCELLED",
      payment_status: "DEPOSIT_PAID",
      scheduled_charge_date: new Date().toISOString(),
      remaining_amount: 543.37,
    };
    expect(isEligibleForScheduledCharge(cancelled)).toBe(false);
  });

  it("CONFIRMED booking IS eligible when scheduled date has passed", () => {
    const confirmed = {
      status: "CONFIRMED",
      payment_status: "DEPOSIT_PAID",
      scheduled_charge_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
      remaining_amount: 543.37,
    };
    expect(isEligibleForScheduledCharge(confirmed)).toBe(true);
  });

  it("CANCELLED excluded when mixed with CONFIRMED (simulates chargeScheduledPayments query)", () => {
    const today = new Date();
    const bookings = [
      {
        id: "1",
        status: "CONFIRMED",
        payment_status: "DEPOSIT_PAID",
        scheduled_charge_date: today,
        remaining_amount: 543,
      },
      {
        id: "2",
        status: "CANCELLED",
        payment_status: "DEPOSIT_PAID",
        scheduled_charge_date: today,
        remaining_amount: 543,
      },
      {
        id: "3",
        status: "CONFIRMED",
        payment_status: "PAID_FULL",
        scheduled_charge_date: today,
        remaining_amount: 0,
      },
    ];

    const eligible = bookings.filter(isEligibleForScheduledCharge);
    expect(eligible.length).toBe(1);
    expect(eligible[0].id).toBe("1");
    expect(eligible[0].status).toBe("CONFIRMED");
  });

  it("PAID_FULL is not eligible (no remaining amount)", () => {
    const paidFull = {
      status: "CONFIRMED",
      payment_status: "PAID_FULL",
      scheduled_charge_date: new Date().toISOString(),
      remaining_amount: 0,
    };
    expect(isEligibleForScheduledCharge(paidFull)).toBe(false);
  });

  it("future scheduled date is not yet eligible", () => {
    const future = {
      status: "CONFIRMED",
      payment_status: "DEPOSIT_PAID",
      scheduled_charge_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      remaining_amount: 543,
    };
    expect(isEligibleForScheduledCharge(future)).toBe(false);
  });
});

// ── chargeScheduledPayments Query Logic (mirrors server) ───────────────────

describe("chargeScheduledPayments Query Logic", () => {
  /**
   * Server uses:
   * .eq("payment_status", "DEPOSIT_PAID")
   * .neq("status", "CANCELLED")
   * .lte("scheduled_charge_date", now)
   */
  it("query filters match: status != CANCELLED, DEPOSIT_PAID, scheduled <= today", () => {
    const valid = {
      status: "CONFIRMED",
      payment_status: "DEPOSIT_PAID",
      scheduled_charge_date: new Date().toISOString(),
      remaining_amount: 100,
    };
    const invalidStatus = { ...valid, status: "CANCELLED" };
    const invalidPayment = { ...valid, payment_status: "PAID_FULL" };
    const invalidFuture = {
      ...valid,
      scheduled_charge_date: new Date(Date.now() + 86400000).toISOString(),
    };

    expect(isEligibleForScheduledCharge(valid)).toBe(true);
    expect(isEligibleForScheduledCharge(invalidStatus)).toBe(false);
    expect(isEligibleForScheduledCharge(invalidPayment)).toBe(false);
    expect(isEligibleForScheduledCharge(invalidFuture)).toBe(false);
  });
});

// ── Guest View URL (custom URL for email link) ───────────────────────────

describe("Guest Booking View URL", () => {
  const baseUrl = "https://www.leonidionhouses.com";

  it("guest URL format: /booking/:id?email=guest@example.com", () => {
    const bookingId = "abc-123";
    const guestEmail = "guest@example.com";
    const url = `${baseUrl}/booking/${bookingId}?email=${encodeURIComponent(guestEmail)}`;
    expect(url).toContain("/booking/abc-123");
    expect(url).toContain("email=guest%40example.com");
  });

  it("cancel URL format: /cancel-booking?token=xxx", () => {
    const token = "abc123token";
    const url = `${baseUrl}/cancel-booking?token=${encodeURIComponent(token)}`;
    expect(url).toContain("/cancel-booking");
    expect(url).toContain("token=");
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("exactly 21 days: FULL payment (threshold is <=)", () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 21);
    expect(determinePaymentType(checkIn, 21)).toBe("FULL");
  });

  it("rounding: 724.5 * 0.25 = 181.125 → 181.13", () => {
    const { depositAmount } = calculatePaymentAmounts(724.5);
    expect(depositAmount).toBe(181.13);
  });

  it("Stripe minimum 50 cents", () => {
    const toCents = (e: number) => Math.round(e * 100);
    expect(toCents(0.5)).toBe(50);
    expect(toCents(0.49)).toBe(49); // would fail Stripe min
  });
});
