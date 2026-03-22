/**
 * Dedicated function for admin dashboard stats.
 * Ensures all bookings (including custom URL / offer) are counted — no path routing issues.
 */
import { createClient } from "@supabase/supabase-js";

const ACTIVE_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"];

export const handler = async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Missing Supabase config" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Fetch ALL bookings (no filter) — includes custom URL bookings with user_id null
    const [bookingsResult, usersResult, propertiesResult, inquiriesRpcResult] = await Promise.all([
      supabase.from("bookings").select("status, unit_id, check_in_date, check_out_date, total_paid, total_price"),
      supabase.from("users").select("id, status", { count: "exact" }),
      supabase.from("properties").select(`
        id,
        name,
        units:units(id)
      `),
      supabase.rpc("count_unread_inquiries"),
    ]);

    const bookings = bookingsResult.data || [];
    const users = usersResult.data || [];
    const properties = propertiesResult.data || [];
    const totalUsers = usersResult.count ?? users.length;

    const confirmedBookings = bookings.filter((b: any) => ACTIVE_STATUSES.includes(b.status));
    const totalRevenue = bookings
      .filter((b: any) => ACTIVE_STATUSES.includes(b.status))
      .reduce((sum: number, b: any) => sum + (parseFloat(b.total_paid) || parseFloat(b.total_price) || 0), 0);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

    const occupancyByProperty = properties.map((property: any) => {
      const units = property.units || [];
      const totalUnits = units.length;
      const bookedDatesByUnit = new Map<string, Set<string>>();
      units.forEach((u: any) => bookedDatesByUnit.set(u.id, new Set()));

      confirmedBookings.forEach((booking: any) => {
        const unitSet = bookedDatesByUnit.get(booking.unit_id);
        if (!unitSet) return;
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const start = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
        const end = new Date(Math.min(checkOut.getTime(), monthEnd.getTime() + 86400000));
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          unitSet.add(toDateKey(d));
        }
      });

      let totalBookedDays = 0;
      bookedDatesByUnit.forEach((set) => {
        totalBookedDays += set.size;
      });
      const totalUnitDays = totalUnits * daysInMonth;
      const occupancyPercentage = totalUnitDays > 0 ? Math.round((totalBookedDays / totalUnitDays) * 100) : 0;
      return {
        id: property.id,
        name: property.name,
        units: totalUnits,
        occupancyPercentage,
        bookedDays: totalBookedDays,
        daysInMonth,
      };
    });

    let unreadInquiriesCount = 0;
    if (!inquiriesRpcResult.error && typeof inquiriesRpcResult.data === "number") {
      unreadInquiriesCount = inquiriesRpcResult.data;
    } else {
      const fallback = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .in("status", ["NEW", "GUEST_REPLIED"]);
      unreadInquiriesCount = fallback.count ?? 0;
    }

    const stats = {
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: bookings.filter((b: any) => b.status === "PENDING").length,
      cancelledBookings: bookings.filter((b: any) => b.status === "CANCELLED").length,
      totalRevenue,
      totalUsers,
      propertiesCount: properties.length,
      occupancyByProperty,
      activeUsers: (users as any[]).filter((u: any) => u?.status === "ACTIVE").length || totalUsers,
      unreadInquiriesCount,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify({ success: true, data: stats }),
    };
  } catch (err: any) {
    console.error("[admin-stats] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err?.message || "Stats failed" }),
    };
  }
};
