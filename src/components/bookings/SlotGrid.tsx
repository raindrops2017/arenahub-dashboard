import { useMemo } from "react";
import { Booking, Venue } from "../../types";
import { buildSlotIndex, fmt, formatHour, getId, normalizeStatus } from "../../utils/booking";
import { StatusBadge } from "./StatusBadge";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

export function SlotGrid({
  venues,
  bookings,
  onSelectBooking,
  onCreateAt,
}: {
  venues: Venue[];
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onCreateAt: (venueId: string, hour: number) => void;
}) {
  // Indexed once per booking-list change, not once per cell.
  const slotIndex = useMemo(() => buildSlotIndex(bookings, HOURS), [bookings]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-white dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80">
              <th className="sticky left-0 z-20 bg-white dark:bg-gray-800/90 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700/80 w-28">
                Slot Hour
              </th>
              {venues.map((v) => {
                const sTypes = v.sportsType || v.sportsTypes || [];
                return (
                  <th key={getId(v)} className="px-4 py-4 text-center border-r border-gray-200 dark:border-gray-700 min-w-[180px] last:border-r-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-200">{v.venueName || v.name}</div>
                    <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
                      {sTypes.map((s) => (
                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {HOURS.map((h) => (
              <tr key={h} className="group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/90 px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700/80 whitespace-nowrap">
                  {formatHour(h)}
                </td>
                {venues.map((v) => {
                  const vId = getId(v);
                  const b = slotIndex.get(`${vId}-${h}`);

                  if (!b) {
                    return (
                      <td
                        key={vId}
                        role="button"
                        tabIndex={0}
                        onClick={() => onCreateAt(vId, h)}
                        onKeyDown={(e) => e.key === "Enter" && onCreateAt(vId, h)}
                        className="p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors group/slot text-center"
                      >
                        <span className="inline-block opacity-0 group-hover/slot:opacity-100 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-opacity">
                          + Book Slot
                        </span>
                      </td>
                    );
                  }

                  const isCancelled = normalizeStatus(b.status) === "cancelled";
                  const isPending = normalizeStatus(b.status) === "pending";
                  const due = b.remainingAmount ?? 0;

                  return (
                    <td
                      key={vId}
                      role={isCancelled ? undefined : "button"}
                      tabIndex={isCancelled ? -1 : 0}
                      onClick={() => !isCancelled && onSelectBooking(b)}
                      onKeyDown={(e) => !isCancelled && e.key === "Enter" && onSelectBooking(b)}
                      className={`p-2.5 border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-all ${
                        isCancelled
                          ? "bg-gray-50 dark:bg-gray-800 opacity-50 cursor-default"
                          : isPending
                          ? "bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                          : "bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
                      }`}
                    >
                      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-600/60 bg-white dark:bg-gray-800/90 shadow-md flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                              {b.customerName || "Customer"}
                            </span>
                            <StatusBadge status={b.status} />
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            {b.bookingCode ? `#${b.bookingCode}` : ""}
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] pt-1.5 border-t border-gray-200 dark:border-gray-700/80">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Total:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(b.price || b.totalPrice || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Paid:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.paidAmount ?? 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={due > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                              Due:
                            </span>
                            {due > 0 ? (
                              <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">{fmt(due)}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">0 EGP (Full)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
