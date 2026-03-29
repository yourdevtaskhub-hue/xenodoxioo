-- Track scheduled balance charge attempts (1st ≈ 21 days before check-in, 2nd ≈ 19 days before).
-- After the second failed attempt the booking is auto-cancelled and dates are released.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS balance_charge_attempt_count smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookings.balance_charge_attempt_count IS
  '0 = no balance charge tried yet; 1 = first attempt failed, awaiting retry; booking is cancelled after 2nd failed attempt.';
