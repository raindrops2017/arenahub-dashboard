import { Booking } from "../../types";
import { fmt, getId } from "../../utils/booking";
import { StatusBadge } from "./StatusBadge";

const COLUMNS = ["Booking Code", "Customer", "Venue", "Time Slot", "Total Price", "Paid", "Remaining Due", "Status", ""];

export function BookingListView({
  bookings,
  onManage,
}: {
  bookings: Booking[];
  onManage: (booking: Booking) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 overflow-hidden shadow-2xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-white dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} className={`px-6 py-4 ${c === "" ? "text-right" : ""}`}>
                {c || "Actions"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {bookings.map((b) => {
            const due = b.remainingAmount ?? 0;
            return (
              <tr key={getId(b)} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{b.bookingCode || getId(b)}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900 dark:text-white">{b.customerName || "Customer"}</div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">{b.customerPhone}</div>
                </td>
                <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{b.venueName || "Venue"}</td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono">
                  {b.startTime} - {b.endTime}
                </td>
                <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{fmt(b.price || b.totalPrice || 0)}</td>
                <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.paidAmount ?? 0)}</td>
                <td className="px-6 py-4 font-bold">
                  {due > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {fmt(due)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">0 EGP (Full)</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onManage(b)}
                    className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold transition"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
