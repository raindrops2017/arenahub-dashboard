import { useMemo, useRef, useEffect } from "react";
import { Plus, Phone, Clock, Compass } from "lucide-react";
import { Booking, Venue } from "../../types";
import {
  formatHour,
  getId,
  getBookingVenueId,
  parseHour,
  getSlotPrice,
  matchesSearch,
  toDateStr,
  fmt,
} from "../../utils/booking";

export interface PitchDayGridProps {
  venues: Venue[];
  bookings: Booking[];
  selectedDate: string;
  search?: string;
  onSelectBooking: (booking: Booking) => void;
  onCreateAt: (venueId: string, hour: number) => void;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const BASE_ROW_HEIGHT_PX = 76;

interface StatusTheme {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  label: string;
}

function getBookingStatusTheme(status?: string): StatusTheme {
  const s = (status || "").toLowerCase().trim();
  if (s === "completed" || s === "show") {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-300 dark:border-emerald-700/80",
      text: "text-emerald-900 dark:text-emerald-100",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
      label: "Show",
    };
  }
  if (s === "no_show" || s === "no show") {
    return {
      bg: "bg-purple-50 dark:bg-purple-950/40",
      border: "border-purple-300 dark:border-purple-700/80",
      text: "text-purple-900 dark:text-purple-100",
      badgeBg: "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700",
      label: "No Show",
    };
  }
  if (s === "pending") {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-300 dark:border-amber-700/80",
      text: "text-amber-900 dark:text-amber-100",
      badgeBg: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700",
      label: "Pending",
    };
  }
  if (s === "cancelled") {
    return {
      bg: "bg-rose-50/70 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800/60",
      text: "text-rose-700 dark:text-rose-300",
      badgeBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      label: "Cancelled",
    };
  }
  // Default is Confirmed
  return {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-700/80",
    text: "text-blue-900 dark:text-blue-100",
    badgeBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700",
    label: "Confirmed",
  };
}

export function PitchDayGrid({
  venues,
  bookings,
  selectedDate,
  search = "",
  onSelectBooking,
  onCreateAt,
}: PitchDayGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const todayStr = toDateStr(new Date());
  const isToday = selectedDate === todayStr;
  const isPastDate = selectedDate < todayStr;
  const currentHour = new Date().getHours();
  const isSearching = search.trim().length > 0;

  // Auto-scroll to near current hour on initial load if today
  useEffect(() => {
    if (isToday && tableContainerRef.current) {
      const targetHour = Math.max(0, currentHour - 1);
      const targetElement = document.getElementById(`day-grid-hour-row-${targetHour}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [isToday, selectedDate, currentHour]);

  const scrollToCurrentTime = () => {
    const targetElement = document.getElementById(`day-grid-hour-row-${currentHour}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Pre-process bookings per venue for fast lookup
  const venueBookingsMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{ booking: Booking; startHour: number; endHour: number; duration: number }>
    >();

    for (const v of venues) {
      const vId = getId(v);
      const vBookings = bookings
        .filter((b) => getBookingVenueId(b) === vId)
        .map((b) => {
          const startHour = parseHour(b.startTime, 0);
          const rawEnd = parseHour(b.endTime, startHour + 1);
          const endHour = Math.max(startHour + 1, rawEnd);
          const duration = endHour - startHour;
          return { booking: b, startHour, endHour, duration };
        });
      map.set(vId, vBookings);
    }

    return map;
  }, [venues, bookings]);

  // Total active bookings (excluding cancelled)
  const activeBookingsCount = useMemo(
    () => bookings.filter((b) => (b.status || "").toLowerCase() !== "cancelled").length,
    [bookings]
  );

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Slim Sub-toolbar: summary stats & jump to current time */}
      <div className="px-6 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/85 dark:bg-gray-800/80 backdrop-blur-sm shrink-0 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            24-Hour Pitch Matrix
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            {venues.length} {venues.length === 1 ? "Pitch" : "Pitches"}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            {activeBookingsCount} {activeBookingsCount === 1 ? "Active Booking" : "Active Bookings"} Today
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isToday && (
            <button
              onClick={scrollToCurrentTime}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-800/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition cursor-pointer"
              title="Jump to current hour slot"
            >
              <Compass className="w-3.5 h-3.5" />
              Jump to Now ({formatHour(currentHour)})
            </button>
          )}

          {/* Quick Legend */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free Slot
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Confirmed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> No Show
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Table Container - fills 100% remaining full-screen height */}
      <div
        ref={tableContainerRef}
        className="flex-1 w-full overflow-x-auto overflow-y-auto relative"
      >
        <table className="w-full border-collapse table-fixed select-none min-w-[900px]">
          <colgroup>
            <col className="w-24 min-w-[96px] max-w-[96px]" />
            {venues.map((v) => (
              <col key={getId(v)} className="w-64 min-w-[240px]" />
            ))}
          </colgroup>

          {/* Sticky Header with Pitch Columns */}
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/80">
              <th className="sticky left-0 top-0 z-30 bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700/80">
                Slot Time
              </th>
              {venues.map((v) => {
                const sTypes = v.sportsType || v.sportsTypes || [];
                return (
                  <th
                    key={getId(v)}
                    className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700/80 last:border-r-0"
                  >
                    <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {v.venueName || v.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                      {sTypes.slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        >
                          {s}
                        </span>
                      ))}
                      {v.defaultHourPrice ? (
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          {v.defaultHourPrice} EGP/h
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* 24 Fixed-Height Rows */}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800/70">
            {HOURS_24.map((h) => {
              const isPastSlot = isPastDate || (isToday && h < currentHour);
              const isCurrentHourRow = isToday && h === currentHour;

              return (
                <tr
                  id={`day-grid-hour-row-${h}`}
                  key={h}
                  style={{ height: `${BASE_ROW_HEIGHT_PX}px` }}
                  className={`transition-colors ${
                    isCurrentHourRow
                      ? "bg-blue-50/40 dark:bg-blue-950/20"
                      : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  }`}
                >
                  {/* Sticky Time Label Cell */}
                  <td
                    style={{ height: `${BASE_ROW_HEIGHT_PX}px` }}
                    className={`sticky left-0 z-10 px-2 py-2 text-center text-xs font-mono font-bold border-r border-gray-200 dark:border-gray-700/80 select-none whitespace-nowrap ${
                      isCurrentHourRow
                        ? "bg-blue-100/90 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200"
                        : "bg-gray-50/95 dark:bg-gray-800/95 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <div>{formatHour(h)}</div>
                    {isCurrentHourRow && (
                      <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                        NOW
                      </span>
                    )}
                  </td>

                  {/* Pitch Column Cells */}
                  {venues.map((v) => {
                    const vId = getId(v);
                    const vBookings = venueBookingsMap.get(vId) || [];

                    // Active (non-cancelled) bookings for this venue
                    const activeVBookings = vBookings.filter(
                      (item) => (item.booking.status || "").toLowerCase() !== "cancelled"
                    );

                    // Check if an active booking starts at this exact hour
                    const activeStartingBooking = activeVBookings.find((item) => item.startHour === h);

                    // Check if this slot hour is covered by an active booking that started earlier
                    const isCoveredByActivePrevious = activeVBookings.some(
                      (item) => item.startHour < h && h < item.endHour
                    );

                    // If covered by an earlier active multi-hour booking with rowSpan, skip rendering <td>
                    if (isCoveredByActivePrevious) {
                      return null;
                    }

                    // If an active booking starts at this hour, render its card
                    if (activeStartingBooking) {
                      const { booking: b, duration } = activeStartingBooking;
                      const spanCount = Math.min(duration, 24 - h);
                      const theme = getBookingStatusTheme(b.status);
                      const isMatch = isSearching ? matchesSearch(b, search) : true;
                      const due = Number(b.remainingAmount ?? 0);

                      return (
                        <td
                          key={vId}
                          rowSpan={spanCount}
                          style={{ height: `${BASE_ROW_HEIGHT_PX * spanCount}px` }}
                          className="p-1.5 border-r border-gray-200 dark:border-gray-700/80 last:border-r-0 align-top"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectBooking(b)}
                            onKeyDown={(e) => e.key === "Enter" && onSelectBooking(b)}
                            title={`Booking #${b.bookingCode || getId(b)} • ${b.customerName} • ${b.startTime} - ${b.endTime}`}
                            className={`w-full h-full rounded-xl p-2.5 flex flex-col justify-between border shadow-xs transition-all duration-150 cursor-pointer overflow-hidden ${
                              theme.bg
                            } ${theme.border} ${
                              isSearching && isMatch
                                ? "ring-2 ring-blue-500 shadow-md scale-[1.005]"
                                : isSearching && !isMatch
                                ? "opacity-25 grayscale filter"
                                : "hover:shadow-md hover:scale-[1.005]"
                            }`}
                          >
                            {/* Top row: Customer Name & Status Badge */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                {b.customerName || "Customer"}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${theme.badgeBg}`}
                              >
                                {theme.label}
                              </span>
                            </div>

                            {/* Middle row: Phone & Booking Code */}
                            <div className="mt-1 flex items-center justify-between gap-1 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate">{b.customerPhone || "—"}</span>
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase shrink-0">
                                #{b.bookingCode || getId(b).slice(-6)}
                              </span>
                            </div>

                            {/* Bottom row: Multi-hour tag & financial badge */}
                            <div className="mt-1 pt-1 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between gap-1 text-[10px]">
                              {spanCount > 1 ? (
                                <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  {spanCount} hrs ({formatHour(h)} - {formatHour(h + spanCount)})
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono">
                                  {formatHour(h)}
                                </span>
                              )}

                              {due > 0 ? (
                                <span className="font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">
                                  Due: {fmt(due)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                  Paid Full
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    // No active booking covers this slot.
                    // If the slot is in the past: check for cancelled booking for audit, else show closed
                    if (isPastSlot) {
                      const cancelledBookings = vBookings.filter(
                        (item) => (item.booking.status || "").toLowerCase() === "cancelled"
                      );
                      const cancelledStarting = cancelledBookings.find((item) => item.startHour === h);
                      const isCoveredByCancelledPrevious = cancelledBookings.some(
                        (item) => item.startHour < h && h < item.endHour
                      );

                      if (isCoveredByCancelledPrevious) {
                        return null;
                      }

                      if (cancelledStarting) {
                        const { booking: b, duration } = cancelledStarting;
                        const spanCount = Math.min(duration, 24 - h);
                        const theme = getBookingStatusTheme(b.status);

                        return (
                          <td
                            key={vId}
                            rowSpan={spanCount}
                            style={{ height: `${BASE_ROW_HEIGHT_PX * spanCount}px` }}
                            className="p-1.5 border-r border-gray-200 dark:border-gray-700/80 last:border-r-0 align-top opacity-60"
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectBooking(b)}
                              className={`w-full h-full rounded-xl p-2 flex flex-col justify-between border ${theme.bg} ${theme.border} cursor-pointer`}
                              title={`Cancelled Booking #${b.bookingCode || getId(b)}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-gray-500 line-through truncate">
                                  {b.customerName || "Customer"}
                                </span>
                                <span className="text-[9px] font-bold px-1 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                                  Cancelled
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-gray-400">
                                {formatHour(h)} (Past)
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={vId}
                          style={{ height: `${BASE_ROW_HEIGHT_PX}px` }}
                          className="p-1.5 border-r border-gray-200 dark:border-gray-700/80 last:border-r-0 align-middle"
                        >
                          <div
                            className="w-full h-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 cursor-not-allowed select-none transition-colors"
                            title={`Past slot (${formatHour(h)}) cannot be reserved`}
                          >
                            <Clock className="w-3.5 h-3.5 opacity-40" />
                            <span className="text-[11px] font-medium tracking-tight">Closed</span>
                          </div>
                        </td>
                      );
                    }

                    // Slot is NOT in the past and has no active booking:
                    // It is 100% available for booking (even if previously cancelled)!
                    const slotPrice = getSlotPrice(v, selectedDate, h) || v.defaultHourPrice || 0;

                    return (
                      <td
                        key={vId}
                        style={{ height: `${BASE_ROW_HEIGHT_PX}px` }}
                        className="p-1.5 border-r border-gray-200 dark:border-gray-700/80 last:border-r-0 align-middle"
                      >
                        <button
                          type="button"
                          onClick={() => onCreateAt(vId, h)}
                          className="w-full h-full rounded-xl border border-emerald-300/80 dark:border-emerald-700/50 bg-emerald-50/85 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:shadow-xs flex flex-col items-center justify-center gap-0.5 transition-all duration-150 group cursor-pointer"
                          title={`Click to book ${v.venueName || v.name} at ${formatHour(h)}`}
                        >
                          <div className="flex items-center gap-1 text-xs font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-125 transition-transform" />
                            <span>Book Now</span>
                          </div>
                          {slotPrice > 0 && (
                            <span className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                              {slotPrice} EGP
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PitchDayGrid;
