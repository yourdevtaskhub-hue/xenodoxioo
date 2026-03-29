/**
 * Pure in-memory tests: NO Supabase, NO Stripe, NO iCal/Booking/Airbnb side effects.
 * Verifies calendar eligibility, cancellation vs blocking rules, and timezone-ish edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  BALANCE_RETRY_DAYS_BEFORE_CHECK_IN,
  addUtcCalendarDays,
  balanceChargeAnchors,
  bookingBlocksCalendar,
  isEligibleForBalanceChargeWindow,
  remainingBalanceEur,
  utcCalendarDay,
} from "../../server/lib/balance-charge-policy";

const baseBooking = () => ({
  status: "CONFIRMED" as const,
  payment_status: "DEPOSIT_PAID" as const,
  balance_paid: false,
  balance_charge_attempt_count: 0,
  check_in_date: "2026-08-01T00:00:00.000Z",
  remaining_amount: 750,
});

describe("balance-charge-policy — remainingBalanceEur", () => {
  it("uses remaining_amount first", () => {
    expect(
      remainingBalanceEur({ ...baseBooking(), remaining_amount: 100, balance_amount: 50 }),
    ).toBe(100);
  });

  it("falls back to balance_amount", () => {
    expect(
      remainingBalanceEur({
        ...baseBooking(),
        remaining_amount: null,
        balance_amount: 333,
      } as any),
    ).toBe(333);
  });

  it("zero when both missing", () => {
    expect(
      remainingBalanceEur({
        ...baseBooking(),
        remaining_amount: 0,
        balance_amount: 0,
      }),
    ).toBe(0);
  });
});

describe("balance-charge-policy — anchors", () => {
  it("21 days before 2026-08-01 is 2026-07-11 (UTC day)", () => {
    const a = balanceChargeAnchors("2026-08-01T00:00:00.000Z", 21);
    expect(a.firstAttemptOnOrAfter).toBe("2026-07-11");
    expect(a.retryOnOrAfter).toBe("2026-07-13"); // 19 days before Aug 1
  });

  it("19 days before check-in is retry anchor", () => {
    expect(BALANCE_RETRY_DAYS_BEFORE_CHECK_IN).toBe(19);
    const checkIn = "2026-12-25T12:00:00.000Z";
    const a = balanceChargeAnchors(checkIn, 21);
    expect(a.retryOnOrAfter).toBe("2026-12-06");
  });

  it("leap year: Feb 29 check-in minus 21 UTC days", () => {
    const a = balanceChargeAnchors("2028-02-29T00:00:00.000Z", 21);
    expect(a.firstAttemptOnOrAfter).toBe("2028-02-08");
  });
});

describe("balance-charge-policy — eligibility attempt 0", () => {
  const balDays = 21;

  it("not eligible before first window", () => {
    const b = baseBooking();
    const today = new Date(Date.UTC(2026, 6, 10)); // Jul 10 — first is Jul 11
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("eligible on first-window day (UTC)", () => {
    const b = baseBooking();
    const today = new Date(Date.UTC(2026, 6, 11)); // Jul 11
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(true);
  });

  it("eligible after first-window day", () => {
    const b = baseBooking();
    const today = new Date(Date.UTC(2026, 7, 1)); // Aug 1 — same as check-in UTC day
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(true);
  });

  it("ISO string with time still uses UTC date for check-in", () => {
    const b = {
      ...baseBooking(),
      check_in_date: "2026-08-01T21:59:59.999Z",
    };
    const today = new Date(Date.UTC(2026, 6, 11));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(true);
  });

  it("CANCELLED never eligible", () => {
    const b = { ...baseBooking(), status: "CANCELLED" };
    const today = new Date(Date.UTC(2026, 7, 1));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("not DEPOSIT_PAID — never", () => {
    const b = { ...baseBooking(), payment_status: "PENDING" };
    const today = new Date(Date.UTC(2026, 7, 1));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("balance_paid true — never", () => {
    const b = { ...baseBooking(), balance_paid: true };
    const today = new Date(Date.UTC(2026, 7, 1));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("remaining 0 — never", () => {
    const b = { ...baseBooking(), remaining_amount: 0 };
    const today = new Date(Date.UTC(2026, 7, 1));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("custom balanceChargeDaysBefore 14", () => {
    const b = { ...baseBooking(), check_in_date: "2026-08-15T00:00:00.000Z" };
    const first = addUtcCalendarDays(utcCalendarDay(new Date("2026-08-15")), -14);
    expect(isEligibleForBalanceChargeWindow(b, first, 14)).toBe(true);
    const dayBefore = addUtcCalendarDays(first, -1);
    expect(isEligibleForBalanceChargeWindow(b, dayBefore, 14)).toBe(false);
  });
});

describe("balance-charge-policy — eligibility attempt 1 (retry)", () => {
  const balDays = 21;
  const b = { ...baseBooking(), balance_charge_attempt_count: 1 };

  it("not eligible on first-only day if retry day not reached", () => {
    const today = new Date(Date.UTC(2026, 6, 11)); // Jul 11 — first window, retry is Jul 13
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("not eligible on Jul 12", () => {
    const today = new Date(Date.UTC(2026, 6, 12));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(false);
  });

  it("eligible on Jul 13 (19 days before Aug 1)", () => {
    const today = new Date(Date.UTC(2026, 6, 13));
    expect(isEligibleForBalanceChargeWindow(b, today, balDays)).toBe(true);
  });

  it("attempt 2+ never eligible (would need cancel first in production)", () => {
    const b2 = { ...baseBooking(), balance_charge_attempt_count: 2 };
    const today = new Date(Date.UTC(2026, 7, 1));
    expect(isEligibleForBalanceChargeWindow(b2, today, balDays)).toBe(false);
  });
});

describe("balance-charge-policy — iCal / calendar blocking", () => {
  it("CANCELLED does not block export (not in blocking set)", () => {
    expect(bookingBlocksCalendar("CANCELLED")).toBe(false);
  });

  it("CONFIRMED blocks", () => {
    expect(bookingBlocksCalendar("CONFIRMED")).toBe(true);
  });

  it("auto-cancel puts CANCELLED → dates free for iCal consumers", () => {
    expect(bookingBlocksCalendar("CANCELLED")).toBe(false);
  });
});

describe("balance-charge-policy — today() boundary", () => {
  it("server 'today' uses UTC calendar of runtime instant", () => {
    const checkIn = "2027-01-10T00:00:00.000Z";
    const b = { ...baseBooking(), check_in_date: checkIn };
    const first = addUtcCalendarDays(utcCalendarDay(new Date(checkIn)), -21);
    const t0 = new Date(first.getTime());
    expect(isEligibleForBalanceChargeWindow(b, t0, 21)).toBe(true);
    const tMinus = addUtcCalendarDays(first, -1);
    expect(isEligibleForBalanceChargeWindow(b, tMinus, 21)).toBe(false);
  });
});
