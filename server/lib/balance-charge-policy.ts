/**
 * Pure policy for scheduled balance charges (deposit-paid bookings).
 * Used by payment.service chargeScheduledPayments — safe to unit-test without DB/Stripe/iCal.
 *
 * Calendar math uses UTC date components of `check_in_date` and `today`, matching production scheduler.
 */

export const BALANCE_RETRY_DAYS_BEFORE_CHECK_IN = 19;

export function utcCalendarDay(isoOrDate: string | Date): Date {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addUtcCalendarDays(day: Date, delta: number): Date {
  const t = new Date(day.getTime());
  t.setUTCDate(t.getUTCDate() + delta);
  return t;
}

export type BalanceChargeBookingInput = {
  status: string;
  payment_status: string;
  balance_paid?: boolean | null;
  balance_charge_attempt_count?: number | null;
  check_in_date: string | Date;
  remaining_amount?: number | null;
  balance_amount?: number | null;
};

export function remainingBalanceEur(b: BalanceChargeBookingInput): number {
  return Number(b.remaining_amount) || Number(b.balance_amount) || 0;
}

/**
 * True if the scheduler should try an off-session balance charge for this booking on `today`.
 *
 * - Attempt 0: today >= check-in date minus `balanceChargeDaysBefore` (e.g. 21).
 * - Attempt 1: today >= check-in date minus `BALANCE_RETRY_DAYS_BEFORE_CHECK_IN` (19).
 * - No charge between first failure and retry day.
 */
export function isEligibleForBalanceChargeWindow(
  b: BalanceChargeBookingInput,
  today: Date,
  balanceChargeDaysBefore = 21,
): boolean {
  if (b.status === "CANCELLED") return false;
  if (b.payment_status !== "DEPOSIT_PAID") return false;
  if (b.balance_paid === true) return false;
  if (remainingBalanceEur(b) <= 0) return false;

  const attempt = Number(b.balance_charge_attempt_count) || 0;
  const todayUtc = utcCalendarDay(today);
  const checkInDay = utcCalendarDay(b.check_in_date);
  const firstChargeDay = addUtcCalendarDays(checkInDay, -balanceChargeDaysBefore);
  const retryChargeDay = addUtcCalendarDays(checkInDay, -BALANCE_RETRY_DAYS_BEFORE_CHECK_IN);

  const canFirst = attempt === 0 && todayUtc.getTime() >= firstChargeDay.getTime();
  const canRetry = attempt === 1 && todayUtc.getTime() >= retryChargeDay.getTime();
  return canFirst || canRetry;
}

/** Expose computed anchors for tests / admin diagnostics (no I/O). */
export function balanceChargeAnchors(checkIn: string | Date, balanceChargeDaysBefore: number) {
  const checkInDay = utcCalendarDay(checkIn);
  return {
    checkInDayUtc: checkInDay.toISOString().slice(0, 10),
    firstAttemptOnOrAfter: addUtcCalendarDays(checkInDay, -balanceChargeDaysBefore).toISOString().slice(0, 10),
    retryOnOrAfter: addUtcCalendarDays(checkInDay, -BALANCE_RETRY_DAYS_BEFORE_CHECK_IN).toISOString().slice(0, 10),
  };
}

/**
 * CANCELLED bookings must not block calendar / iCal (same set as booking.service BLOCKING_STATUSES).
 */
export const ICAL_BLOCKING_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"] as const;

export function bookingBlocksCalendar(status: string): boolean {
  return (ICAL_BLOCKING_STATUSES as readonly string[]).includes(status);
}
