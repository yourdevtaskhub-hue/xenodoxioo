import prisma from "../lib/db";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from "../lib/errors";
import { nanoid } from "nanoid";
import * as adminService from "./admin.service";

/**
 * Check if dates are available for a unit
 */
export async function checkAvailability(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<{ isAvailable: boolean; reason?: string }> {
  // Validate dates
  if (checkInDate >= checkOutDate) {
    return {
      isAvailable: false,
      reason: "Check-out date must be after check-in date",
    };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { isAvailable: false, reason: "Unit not found" };
  }

  // Get property for date blockages
  const property = await prisma.property.findUnique({
    where: { id: unit.propertyId },
  });

  if (!property) {
    return { isAvailable: false, reason: "Property not found" };
  }

  // Check for overlapping bookings (any non-cancelled booking reserves the dates)
  const conflictingBookings = await prisma.booking.findMany({
    where: {
      unitId,
      status: { not: "CANCELLED" },
      OR: [
        {
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
      ],
    },
  });

  if (conflictingBookings.length > 0) {
    return {
      isAvailable: false,
      reason: "Unit is not available for selected dates",
    };
  }

  // Check for date blockages
  const blockages = await prisma.dateBlockage.findMany({
    where: {
      propertyId: property.id,
      OR: [
        {
          startDate: { lt: checkOutDate },
          endDate: { gt: checkInDate },
        },
      ],
    },
  });

  if (blockages.length > 0) {
    return {
      isAvailable: false,
      reason: "Unit is blocked for selected dates",
    };
  }

  return { isAvailable: true };
}

/** Get occupied date ranges for a unit (non-cancelled bookings) for calendar display */
export async function getOccupiedDateRanges(unitId: string): Promise<{ start: string; end: string }[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      unitId,
      status: { not: "CANCELLED" },
    },
    select: { checkInDate: true, checkOutDate: true },
  });
  return bookings.map((b) => ({
    start: b.checkInDate.toISOString().slice(0, 10),
    end: b.checkOutDate.toISOString().slice(0, 10),
  }));
}

/**
 * Calculate pricing for a booking
 */
export async function calculatePrice(
  unitId: string,
  checkInDate: Date,
  checkOutDate: Date,
  couponCode?: string,
) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { property: true },
  });

  if (!unit) {
    throw new NotFoundError("Unit not found");
  }

  // Calculate nights
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1) {
    throw new ValidationError("Minimum stay is 1 night");
  }

  // Get applicable pricing (seasonal if exists)
  const seasonalPricing = await prisma.seasonalPricing.findFirst({
    where: {
      propertyId: unit.propertyId,
      startDate: { lte: checkInDate },
      endDate: { gte: checkOutDate },
      NOT: {
        startDate: checkOutDate,
      },
    },
  });

  const basePrice = seasonalPricing?.pricePerNight || unit.basePrice;
  const subtotal = basePrice * nights;
  const cleaningFee = unit.cleaningFee || 0;

  let discountAmount = 0;

  // Apply coupon discount if provided
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (
      coupon &&
      coupon.isActive &&
      new Date() >= coupon.validFrom &&
      new Date() <= coupon.validUntil &&
      (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
      (coupon.minBookingAmount == null || subtotal >= coupon.minBookingAmount)
    ) {
      if (coupon.discountType === "PERCENTAGE") {
        couponDiscount =
          ((subtotal - discountAmount) * coupon.discountValue) / 100;
      } else {
        couponDiscount = coupon.discountValue;
      }
    }
  }

  discountAmount += couponDiscount;

  // Get tax settings
  let taxRate = 0.15; // default
  try {
    const taxSettings = await adminService.getTaxSettings();
    taxRate = taxSettings.taxRate / 100;
  } catch (error) {
    console.error("Failed to fetch tax settings, using default:", error);
  }

  // Calculate taxes using dynamic rate
  const taxableAmount = subtotal - discountAmount + cleaningFee;
  const taxes = Math.round(taxableAmount * taxRate * 100) / 100;

  const totalPrice = subtotal + cleaningFee + taxes - discountAmount;
  const depositAmount = Math.round(totalPrice * 0.25 * 100) / 100;
  const balanceAmount = totalPrice - depositAmount;

  return {
    basePrice,
    nights,
    subtotal,
    cleaningFee,
    discountAmount,
    taxes,
    totalPrice,
    depositAmount,
    balanceAmount,
  };
}

/**
 * Create a new booking (userId optional = guest checkout)
 */
export async function createBooking(
  unitId: string,
  userId: string | null | undefined,
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  guestName: string,
  guestEmail: string,
  guestPhone?: string,
  specialRequests?: string,
  couponCode?: string,
) {
  // Validate input (userId not required for guest checkout)
  if (!unitId || !guestName || !guestEmail || guests < 1) {
    throw new ValidationError("Missing required booking fields");
  }

  // Check availability
  const availabilityCheck = await checkAvailability(
    unitId,
    checkInDate,
    checkOutDate,
  );
  if (!availabilityCheck.isAvailable) {
    throw new ConflictError(
      availabilityCheck.reason || "Unit not available for selected dates",
    );
  }

  // Check guest capacity
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });

  if (!unit) {
    throw new NotFoundError("Unit not found");
  }

  if (guests > unit.maxGuests) {
    throw new ValidationError(
      `Maximum guests for this unit is ${unit.maxGuests}`,
    );
  }

  // Calculate pricing
  const pricing = await calculatePrice(
    unitId,
    checkInDate,
    checkOutDate,
    couponCode,
  );

  // Create booking
  const bookingNumber = `BK-${Date.now()}-${nanoid(6)}`.toUpperCase();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      unitId,
      userId: userId ?? undefined,
      checkInDate,
      checkOutDate,
      nights: pricing.nights,
      basePrice: pricing.basePrice,
      totalNights: pricing.nights,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      taxes: pricing.taxes,
      discountAmount: pricing.discountAmount,
      totalPrice: pricing.totalPrice,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      status: "PENDING",
    },
  });

  // Increment coupon usage if applicable
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (coupon) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: coupon.usedCount + 1 },
      });
    }
  }

  return booking;
}

/**
 * Get booking by ID. Access: owner by userId, or guest by guestEmail when booking has no userId.
 */
export async function getBookingById(
  bookingId: string,
  opts?: { userId?: string; guestEmail?: string },
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      unit: { include: { property: true } },
      payments: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (opts?.userId) {
    if (booking.userId !== opts.userId) {
      throw new AppError(403, "You do not have access to this booking");
    }
    return booking;
  }
  if (opts?.guestEmail && !booking.userId) {
    if (booking.guestEmail.toLowerCase() !== opts.guestEmail.toLowerCase()) {
      throw new AppError(403, "You do not have access to this booking");
    }
    return booking;
  }
  if (!opts?.userId && !opts?.guestEmail) {
    throw new AppError(401, "Authentication or guest email required");
  }
  throw new AppError(403, "You do not have access to this booking");
}

/**
 * Get user bookings
 */
export async function getUserBookings(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const skip = (page - 1) * pageSize;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: {
        unit: { include: { property: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where: { userId } }),
  ]);

  return {
    bookings,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Cancel booking (owner by userId or guest by guestEmail when booking has no userId).
 */
export async function cancelBooking(
  bookingId: string,
  opts: { userId?: string; guestEmail?: string },
  reason?: string,
) {
  const booking = await getBookingById(bookingId, opts);

  if (!["PENDING", "DEPOSIT_PAID", "CONFIRMED"].includes(booking.status)) {
    throw new ConflictError("This booking cannot be cancelled");
  }

  // Calculate refund based on cancellation policy
  const daysBeforeCheckIn = Math.ceil(
    (booking.checkInDate.getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );

  let refundPercentage = 0;
  if (daysBeforeCheckIn > 60) {
    refundPercentage = 0.75; // 75% refund
  } else if (daysBeforeCheckIn > 30) {
    refundPercentage = 0.5; // 50% refund
  } else {
    refundPercentage = 0; // No refund
  }

  const refundAmount =
    Math.round(booking.totalPrice * refundPercentage * 100) / 100;

  // Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancellationReason: reason,
      cancelledAt: new Date(),
    },
    include: {
      unit: { include: { property: true } },
      payments: true,
    },
  });

  return {
    booking: updatedBooking,
    refundAmount,
    refundPercentage: Math.round(refundPercentage * 100),
  };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: status as any },
  });

  return booking;
}

/**
 * Get available units for date range
 */
export async function getAvailableUnits(
  checkInDate: Date,
  checkOutDate: Date,
  guests: number,
  propertyId?: string,
) {
  let units = await prisma.unit.findMany({
    where: {
      ...(propertyId && { propertyId }),
      isActive: true,
      maxGuests: { gte: guests },
    },
    include: { property: true },
  });

  // Filter by availability
  const availableUnits = [];
  for (const unit of units) {
    const { isAvailable } = await checkAvailability(
      unit.id,
      checkInDate,
      checkOutDate,
    );
    if (isAvailable) {
      availableUnits.push(unit);
    }
  }

  return availableUnits;
}
