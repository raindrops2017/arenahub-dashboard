import { Booking, Venue } from "../types";

/** Mongo docs sometimes come back as `_id`, sometimes as `id`. One helper, everywhere. */
export const getId = (entity: { _id?: string; id?: string } | null | undefined): string =>
  entity?._id || entity?.id || "";

export const fmt = (n: number) => `${n.toLocaleString()} EGP`;

export const toDateStr = (d: Date) => d.toISOString().split("T")[0];

/** "18" -> "6:00 PM" */
export const formatHour = (h: number) => {
  const norm = h % 24;
  const ampm = norm >= 12 ? "PM" : "AM";
  const displayHour = norm % 12 === 0 ? 12 : norm % 12;
  return `${displayHour}:00 ${ampm}`;
};

/**
 * Bookings' start/end times arrive inconsistently: sometimes a 24h number (18),
 * sometimes a "6:00 PM" string. Normalize once, in one place, instead of the
 * three copies of this regex the original component had.
 */
export const parseHour = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/(\d+):00\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const ampm = match[2].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h;
    }
  }
  return fallback;
};

/** Case-insensitive status compare — avoids needing both "confirmed" and "Confirmed" everywhere. */
export const normalizeStatus = (status: string | undefined) => (status || "").toLowerCase();

export const statusBadgeStyle: Record<string, string> = {
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse",
  expired: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/30",
};

export const getStatusBadgeClass = (status: string | undefined) =>
  statusBadgeStyle[normalizeStatus(status)] ||
  "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";

/**
 * Pre-index bookings by `${venueId}-${hour}` once per data change, instead of
 * re-scanning the full booking list for every one of the (venues x hours) grid
 * cells on every render. Turns an O(venues * hours * bookings) render into
 * O(bookings) indexing + O(1) lookups.
 *
 * Deliberately indexes from the FULL booking list, not the search-filtered
 * list — a slot that's booked must always render as booked, even while a
 * search query is active, otherwise the grid tells an admin a slot is free
 * (and clickable to "+ Book Slot") when it's actually taken.
 */
export const buildSlotIndex = (bookings: Booking[], hours: number[]) => {
  const index = new Map<string, Booking>();
  for (const b of bookings) {
    const venueId =
      typeof b.venueId === "object" && b.venueId ? getId(b.venueId as any) : (b.venueId as string) || "";
    const startH = parseHour(b.startTime, 0);
    const endH = parseHour(b.endTime, startH + 1);
    for (const h of hours) {
      if (h >= startH && h < endH) {
        index.set(`${venueId}-${h}`, b);
      }
    }
  }
  return index;
};

export const matchesSearch = (b: Booking, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [b.customerName, b.customerPhone, b.bookingCode, b.venueName].some((field) =>
    (field || "").toLowerCase().includes(q)
  );
};

export const activeOnly = (venues: Venue[]) => venues.filter((v) => v.isActive !== false);
